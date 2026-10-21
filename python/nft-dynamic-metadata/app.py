"""
Dynamic NFT Metadata API

FastAPI application providing REST endpoints for dynamic NFT metadata.
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from typing import Optional
import os

from database import TokenDatabase
from oracle import OracleService
from metadata_generator import MetadataGenerator


# Configuration
DATABASE_PATH = os.getenv("DATABASE_PATH", "./nft_data.json")
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))

# Initialize components
app = FastAPI(
    title="Dynamic NFT Metadata API",
    description="API for managing dynamic NFT metadata based on oracle data",
    version="1.0.0"
)

db = TokenDatabase(DATABASE_PATH)
oracle_service = OracleService(oracle_type="weather")  # Default to weather oracle
metadata_gen = MetadataGenerator()

# Templates
templates = Jinja2Templates(directory="templates")


# Request models
class MintRequest(BaseModel):
    owner: str
    initial_state: Optional[str] = "sunny"


class UpdateRequest(BaseModel):
    oracle_type: Optional[str] = "weather"


# API Endpoints
@app.get("/")
async def home(request: Request):
    """Home page showing all tokens."""
    tokens = db.get_all_tokens()
    
    # Enhance tokens with metadata
    for token in tokens:
        token["image_url"] = metadata_gen.get_image_url(token["current_state"])
        token["state_description"] = metadata_gen.get_state_description(token["current_state"])
    
    return templates.TemplateResponse(
        "index.html",
        {"request": request, "tokens": tokens}
    )


@app.get("/token/{token_id}", response_class=HTMLResponse)
async def token_detail(token_id: int, request: Request):
    """Token detail page."""
    token = db.get_token(token_id)
    
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    
    # Generate full metadata
    metadata = metadata_gen.generate_metadata(
        token_id=token["token_id"],
        state=token["current_state"],
        owner=token["owner"]
    )
    
    token["metadata"] = metadata
    token["image_url"] = metadata_gen.get_image_url(token["current_state"])
    token["state_description"] = metadata_gen.get_state_description(token["current_state"])
    
    return templates.TemplateResponse(
        "token_detail.html",
        {"request": request, "token": token}
    )


@app.get("/oracle", response_class=HTMLResponse)
async def oracle_page(request: Request):
    """Oracle update page."""
    tokens = db.get_all_tokens()
    latest_data = oracle_service.get_latest_data()
    
    return templates.TemplateResponse(
        "oracle_update.html",
        {
            "request": request,
            "tokens": tokens,
            "oracle_data": latest_data,
            "oracle_type": oracle_service.oracle.oracle_type
        }
    )


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "Dynamic NFT Metadata API"}


@app.get("/api/metadata/{token_id}")
async def get_metadata(token_id: int):
    """
    Get ERC-721 compatible metadata for a token.
    
    Args:
        token_id: The token ID
        
    Returns:
        JSON metadata following ERC-721 standard
    """
    token = db.get_token(token_id)
    
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    
    metadata = metadata_gen.generate_metadata(
        token_id=token["token_id"],
        state=token["current_state"],
        owner=token["owner"]
    )
    
    return JSONResponse(content=metadata)


@app.post("/api/mint")
async def mint_token(request: MintRequest):
    """
    Mint a new dynamic NFT token.
    
    Args:
        request: Mint request containing owner address and optional initial state
        
    Returns:
        Newly minted token data
    """
    token = db.mint_token(
        owner=request.owner,
        initial_state=request.initial_state
    )
    
    return {
        "success": True,
        "token": token,
        "message": f"Token #{token['token_id']} minted successfully"
    }


@app.post("/api/oracle/update")
async def update_oracle(request: UpdateRequest):
    """
    Trigger oracle update for all tokens.
    
    Args:
        request: Update request with optional oracle type
        
    Returns:
        Update results for all tokens
    """
    # Update oracle type if specified
    if request.oracle_type:
        oracle_service.oracle.oracle_type = request.oracle_type
    
    # Get all tokens
    tokens = db.get_all_tokens()
    token_ids = [token["token_id"] for token in tokens]
    
    if not token_ids:
        return {
            "success": True,
            "updated_count": 0,
            "message": "No tokens to update"
        }
    
    # Fetch oracle data and update states
    updates = oracle_service.update_all_tokens(token_ids)
    
    # Apply updates to database
    updated_tokens = []
    for token_id, new_state in updates.items():
        success = db.update_token_state(token_id, new_state)
        if success:
            token = db.get_token(token_id)
            updated_tokens.append({
                "token_id": token_id,
                "old_state": token.get("current_state"),
                "new_state": new_state
            })
    
    return {
        "success": True,
        "updated_count": len(updated_tokens),
        "updates": updated_tokens,
        "oracle_type": oracle_service.oracle.oracle_type,
        "message": f"Updated {len(updated_tokens)} tokens"
    }


@app.get("/api/tokens")
async def list_tokens():
    """
    List all tokens.
    
    Returns:
        List of all tokens
    """
    tokens = db.get_all_tokens()
    return {
        "success": True,
        "count": len(tokens),
        "tokens": tokens
    }


@app.get("/api/oracle/data")
async def get_oracle_data():
    """
    Get latest oracle data without updating tokens.
    
    Returns:
        Latest oracle data
    """
    data = oracle_service.get_latest_data()
    return {
        "success": True,
        "oracle_data": data
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)
