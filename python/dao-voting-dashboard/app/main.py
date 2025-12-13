"""FastAPI application for DAO voting dashboard."""

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import uvicorn

from app.config import config
from app.database import db
from app.blockchain import blockchain
from app.governance import governance

# Initialize FastAPI app
app = FastAPI(
    title="DAO Voting Dashboard",
    description="Off-chain + on-chain DAO voting dashboard for BNB Chain",
    version="1.0.0"
)

# Setup templates
templates = Jinja2Templates(directory="app/templates")


# Request/Response Models

class CreateProposalRequest(BaseModel):
    title: str
    description: str
    creator: str
    duration_days: int = 7


class VoteRequest(BaseModel):
    proposal_id: int
    voter_address: str
    vote_choice: str  # "for", "against", "abstain"
    private_key: str  # For signing (in production, use wallet integration)


class SyncToChainRequest(BaseModel):
    proposal_id: int
    private_key: Optional[str] = None


# API Routes

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """Render home page."""
    proposals = db.list_proposals(limit=10)
    
    # Auto-close expired proposals
    governance.auto_close_expired_proposals()
    
    return templates.TemplateResponse(
        "index.html",
        {"request": request, "proposals": proposals}
    )


@app.get("/api/proposals")
async def list_proposals(status: Optional[str] = None, limit: int = 100):
    """List all proposals."""
    proposals = db.list_proposals(status=status, limit=limit)
    return {"proposals": proposals}


@app.post("/api/proposals")
async def create_proposal(request: CreateProposalRequest):
    """Create a new proposal."""
    end_time = datetime.now() + timedelta(days=request.duration_days)
    
    proposal_id = db.create_proposal(
        title=request.title,
        description=request.description,
        creator=request.creator,
        end_time=end_time
    )
    
    return {
        "success": True,
        "proposal_id": proposal_id,
        "message": "Proposal created successfully"
    }


@app.get("/api/proposals/{proposal_id}")
async def get_proposal(proposal_id: int):
    """Get proposal details."""
    proposal = db.get_proposal(proposal_id)
    
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    # Get voting results
    results = governance.calculate_results(proposal_id)
    
    # Get votes
    votes = db.get_votes(proposal_id)
    
    return {
        "proposal": proposal,
        "results": results,
        "votes": votes
    }


@app.post("/api/votes")
async def cast_vote(request: VoteRequest):
    """Cast a vote on a proposal."""
    # Validate vote choice
    if request.vote_choice not in ["for", "against", "abstain"]:
        raise HTTPException(status_code=400, detail="Invalid vote choice")
    
    # Check if can vote
    can_vote, message = governance.can_vote(request.proposal_id, request.voter_address)
    if not can_vote:
        raise HTTPException(status_code=400, detail=message)
    
    # Create vote message
    proposal = db.get_proposal(request.proposal_id)
    vote_message = f"Vote {request.vote_choice} on proposal #{request.proposal_id}: {proposal['title']}"
    
    # Sign the vote
    try:
        signature = blockchain.sign_message(request.private_key, vote_message)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to sign vote: {str(e)}")
    
    # Verify signature
    if not blockchain.verify_signature(vote_message, signature, request.voter_address):
        raise HTTPException(status_code=400, detail="Signature verification failed")
    
    # Store vote
    vote_id = db.cast_vote(
        proposal_id=request.proposal_id,
        voter_address=request.voter_address,
        vote_choice=request.vote_choice,
        signature=signature,
        message=vote_message
    )
    
    return {
        "success": True,
        "vote_id": vote_id,
        "message": "Vote cast successfully",
        "signature": signature
    }


@app.post("/api/proposals/{proposal_id}/close")
async def close_proposal(proposal_id: int):
    """Close a proposal and finalize results."""
    result = governance.close_proposal(proposal_id)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@app.post("/api/proposals/{proposal_id}/sync-to-chain")
async def sync_to_chain(proposal_id: int, request: SyncToChainRequest):
    """Sync proposal to blockchain."""
    proposal = db.get_proposal(proposal_id)
    
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    if proposal["on_chain_synced"]:
        return {
            "success": True,
            "message": "Proposal already synced",
            "on_chain_id": proposal["on_chain_id"]
        }
    
    # Submit to chain (mocked)
    try:
        end_time_timestamp = int(datetime.fromisoformat(proposal["end_time"]).timestamp())
        on_chain_id = blockchain.submit_proposal_to_chain(
            title=proposal["title"],
            description=proposal["description"],
            end_time=end_time_timestamp,
            private_key=request.private_key
        )
        
        # Update database
        db.sync_proposal_to_chain(proposal_id, on_chain_id)
        
        return {
            "success": True,
            "on_chain_id": on_chain_id,
            "message": "Proposal synced to chain"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sync: {str(e)}")


@app.get("/api/chain/proposal/{on_chain_id}")
async def get_chain_proposal(on_chain_id: int):
    """Get proposal from blockchain."""
    proposal = blockchain.get_proposal_from_chain(on_chain_id)
    
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found on chain")
    
    return proposal


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "chain_connected": blockchain.is_connected(),
        "chain_id": blockchain.get_chain_id(),
        "database": "connected"
    }


@app.get("/proposal/{proposal_id}", response_class=HTMLResponse)
async def proposal_detail(request: Request, proposal_id: int):
    """Render proposal detail page."""
    proposal = db.get_proposal(proposal_id)
    
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    results = governance.calculate_results(proposal_id)
    votes = db.get_votes(proposal_id)
    
    return templates.TemplateResponse(
        "proposal.html",
        {
            "request": request,
            "proposal": proposal,
            "results": results,
            "votes": votes
        }
    )


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=config.HOST,
        port=config.PORT,
        reload=True
    )
