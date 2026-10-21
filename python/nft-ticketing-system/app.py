"""FastAPI application for NFT ticketing system."""

from fastapi import FastAPI, HTTPException, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uvicorn

from database import Database
from mock_contract import ticket_contract
from qr_generator import generate_ticket_qr, parse_qr_data
from config import config


app = FastAPI(
    title="NFT Ticketing System",
    description="NFT-based event ticketing on BNB Chain",
    version="1.0.0"
)

# Static files and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Database instance
db = Database()


# Request models
class CreateEventRequest(BaseModel):
    name: str
    date: str
    location: str
    capacity: int


class MintTicketRequest(BaseModel):
    event_id: int
    owner_address: str


class VerifyTicketRequest(BaseModel):
    qr_data: str


# Routes

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """Render home page."""
    events = db.list_events()
    return templates.TemplateResponse(
        "index.html",
        {"request": request, "events": events}
    )


@app.get("/events", response_class=HTMLResponse)
async def events_page(request: Request):
    """Render events page."""
    events = db.list_events()
    return templates.TemplateResponse(
        "events.html",
        {"request": request, "events": events}
    )


@app.get("/events/{event_id}", response_class=HTMLResponse)
async def event_detail(request: Request, event_id: int):
    """Render event detail page."""
    event = db.get_event(event_id)
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    tickets = db.get_tickets_by_event(event_id)
    
    return templates.TemplateResponse(
        "event_detail.html",
        {"request": request, "event": event, "tickets": tickets}
    )


@app.get("/mint", response_class=HTMLResponse)
async def mint_page(request: Request):
    """Render mint ticket page."""
    events = db.list_events()
    return templates.TemplateResponse(
        "mint.html",
        {"request": request, "events": events}
    )


@app.get("/verify", response_class=HTMLResponse)
async def verify_page(request: Request):
    """Render verify ticket page."""
    return templates.TemplateResponse(
        "verify.html",
        {"request": request}
    )


# API Routes

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "chain_id": config.CHAIN_ID,
        "contract": config.TICKET_CONTRACT_ADDRESS
    }


@app.post("/api/events")
async def create_event(req: CreateEventRequest):
    """Create a new event."""
    try:
        event_id = db.create_event(
            name=req.name,
            date=req.date,
            location=req.location,
            capacity=req.capacity
        )
        
        return {
            "success": True,
            "event_id": event_id,
            "message": "Event created successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/events")
async def list_events():
    """List all events."""
    events = db.list_events()
    return {"events": events}


@app.get("/api/events/{event_id}")
async def get_event(event_id: int):
    """Get event details."""
    event = db.get_event(event_id)
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    tickets = db.get_tickets_by_event(event_id)
    
    return {
        "event": event,
        "tickets": tickets,
        "available": event["capacity"] - event["tickets_sold"]
    }


@app.post("/api/mint")
async def mint_ticket(req: MintTicketRequest):
    """Mint a new ticket NFT."""
    # Check event exists
    event = db.get_event(req.event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check capacity
    if event["tickets_sold"] >= event["capacity"]:
        raise HTTPException(status_code=400, detail="Event is sold out")
    
    # Get next token ID
    token_id = db.get_next_token_id()
    
    # Mint on mock blockchain
    try:
        mint_result = ticket_contract.mint_ticket(
            to=req.owner_address,
            event_id=req.event_id,
            token_id=token_id
        )
        
        # Generate QR code
        qr_path = generate_ticket_qr(token_id, req.event_id)
        
        # Save to database
        ticket_id = db.mint_ticket(
            token_id=token_id,
            event_id=req.event_id,
            owner_address=req.owner_address,
            qr_code_path=qr_path
        )
        
        return {
            "success": True,
            "ticket_id": ticket_id,
            "token_id": token_id,
            "qr_code": qr_path,
            "tx_hash": mint_result["tx_hash"],
            "message": "Ticket minted successfully"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tickets/{token_id}")
async def get_ticket(token_id: int):
    """Get ticket details."""
    ticket = db.get_ticket(token_id)
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Get owner from contract
    owner = ticket_contract.owner_of(token_id)
    
    return {
        "ticket": ticket,
        "owner": owner
    }


@app.post("/api/verify")
async def verify_ticket(req: VerifyTicketRequest):
    """Verify a ticket by QR code data."""
    # Parse QR data
    parsed = parse_qr_data(req.qr_data)
    
    if not parsed:
        raise HTTPException(status_code=400, detail="Invalid QR code")
    
    token_id = parsed["token_id"]
    
    # Get ticket from database
    ticket = db.get_ticket(token_id)
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Verify ownership on blockchain
    owner = ticket_contract.owner_of(token_id)
    
    if not owner:
        raise HTTPException(status_code=400, detail="Ticket not minted")
    
    # Check if already checked in
    if ticket["checked_in"]:
        return {
            "valid": False,
            "message": "Ticket already checked in",
            "checked_in_at": ticket["checked_in_at"]
        }
    
    # Mark as checked in
    db.check_in_ticket(token_id)
    
    return {
        "valid": True,
        "token_id": token_id,
        "owner": owner,
        "event_id": ticket["event_id"],
        "message": "Ticket verified and checked in successfully"
    }


@app.post("/api/checkin/{token_id}")
async def checkin_ticket(token_id: int):
    """Check in a ticket."""
    ticket = db.get_ticket(token_id)
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if ticket["checked_in"]:
        raise HTTPException(status_code=400, detail="Ticket already checked in")
    
    success = db.check_in_ticket(token_id)
    
    if success:
        return {"success": True, "message": "Ticket checked in successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to check in ticket")


if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host=config.HOST,
        port=config.PORT,
        reload=True
    )
