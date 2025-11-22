"""
FastAPI backend for DAO voting dashboard.
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import uvicorn

from database import Database
from crypto_utils import VoteSignature
from governance import GovernanceRules
from contract import governance_contract
from config import config


app = FastAPI(
    title="DAO Voting Dashboard",
    description="Off-chain + on-chain DAO governance dashboard",
    version="1.0.0"
)

# Templates
templates = Jinja2Templates(directory="templates")

# Database instance
db = Database()


# Request/Response models
class CreateProposalRequest(BaseModel):
    title: str
    description: str
    creator: str
    duration_hours: int = 168  # Default 7 days


class VoteRequest(BaseModel):
    voter_address: str
    vote_choice: str  # "for" or "against"
    private_key: str  # For signing (demo only)


class SyncRequest(BaseModel):
    proposal_id: int


# Root endpoint
@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    """Render main dashboard."""
    proposals = db.list_proposals()
    return templates.TemplateResponse(
        "index.html",
        {"request": request, "proposals": proposals}
    )


# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


# Create proposal
@app.post("/api/proposals")
async def create_proposal(req: CreateProposalRequest):
    """
    Create a new proposal (off-chain).
    
    In production, this would also create it on-chain.
    """
    try:
        end_time = datetime.now() + timedelta(hours=req.duration_hours)
        
        # Create off-chain
        proposal_id = db.create_proposal(
            title=req.title,
            description=req.description,
            creator=req.creator,
            end_time=end_time
        )
        
        # Mock: Create on-chain (in production, use actual contract)
        on_chain_id = governance_contract.create_proposal(
            req.title,
            req.description,
            int(end_time.timestamp())
        )
        
        # Update with on-chain ID
        db.conn.execute(
            "UPDATE proposals SET on_chain_id = ? WHERE id = ?",
            (on_chain_id, proposal_id)
        )
        db.conn.commit()
        
        return {
            "success": True,
            "proposal_id": proposal_id,
            "on_chain_id": on_chain_id,
            "message": "Proposal created successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# List proposals
@app.get("/api/proposals")
async def list_proposals(status: Optional[str] = None):
    """Get all proposals, optionally filtered by status."""
    try:
        proposals = db.list_proposals(status)
        return {"proposals": proposals}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Get proposal details
@app.get("/api/proposals/{proposal_id}")
async def get_proposal(proposal_id: int):
    """Get proposal details with vote counts."""
    try:
        proposal = db.get_proposal(proposal_id)
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        
        vote_counts = db.get_vote_counts(proposal_id)
        votes = db.get_votes(proposal_id)
        
        return {
            "proposal": proposal,
            "vote_counts": vote_counts,
            "votes": votes
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Cast vote
@app.post("/api/proposals/{proposal_id}/vote")
async def cast_vote(proposal_id: int, req: VoteRequest):
    """
    Cast a vote on a proposal (off-chain).
    
    Vote is cryptographically signed and stored off-chain.
    """
    try:
        # Validate proposal exists and is active
        proposal = db.get_proposal(proposal_id)
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        
        if proposal["status"] != "active":
            raise HTTPException(
                status_code=400,
                detail=f"Proposal is {proposal['status']}, voting closed"
            )
        
        # Check if already voted
        existing_votes = db.get_votes(proposal_id)
        if any(v["voter_address"] == req.voter_address for v in existing_votes):
            raise HTTPException(
                status_code=400,
                detail="Address has already voted"
            )
        
        # Validate vote choice
        if req.vote_choice not in ["for", "against"]:
            raise HTTPException(
                status_code=400,
                detail="vote_choice must be 'for' or 'against'"
            )
        
        # Check voting eligibility
        if not GovernanceRules.is_eligible_voter(req.voter_address):
            raise HTTPException(
                status_code=403,
                detail="Address not eligible to vote"
            )
        
        # Sign vote
        message = f"Vote {req.vote_choice} on proposal {proposal_id}"
        signer_address, signature = VoteSignature.sign_vote(
            req.private_key,
            message
        )
        
        # Verify signature matches voter address
        if signer_address.lower() != req.voter_address.lower():
            raise HTTPException(
                status_code=400,
                detail="Signature verification failed"
            )
        
        # Store vote
        vote_id = db.create_vote(
            proposal_id=proposal_id,
            voter_address=req.voter_address,
            vote_choice=req.vote_choice,
            signature=signature
        )
        
        return {
            "success": True,
            "vote_id": vote_id,
            "message": "Vote cast successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Get proposal results
@app.get("/api/proposals/{proposal_id}/results")
async def get_results(proposal_id: int):
    """
    Get voting results and outcome determination.
    """
    try:
        proposal = db.get_proposal(proposal_id)
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        
        vote_counts = db.get_vote_counts(proposal_id)
        
        # Mock: Total eligible voters (in production, query from contract)
        total_eligible_voters = 100
        
        # Determine outcome
        outcome = GovernanceRules.determine_outcome(
            votes_for=vote_counts["for"],
            votes_against=vote_counts["against"],
            total_eligible_voters=total_eligible_voters
        )
        
        return {
            "proposal": proposal,
            "outcome": outcome
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Sync votes to chain
@app.post("/api/proposals/{proposal_id}/sync")
async def sync_to_chain(proposal_id: int):
    """
    Sync aggregated votes to on-chain contract.
    
    In production, this would submit votes in batches with Merkle proofs.
    """
    try:
        proposal = db.get_proposal(proposal_id)
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        
        vote_counts = db.get_vote_counts(proposal_id)
        
        # Submit votes to mock contract
        success = governance_contract.submit_votes(
            proposal_id=proposal["on_chain_id"],
            votes_for=vote_counts["for"],
            votes_against=vote_counts["against"]
        )
        
        if success:
            # Mark votes as synced
            db.mark_votes_synced(proposal_id)
            
            return {
                "success": True,
                "message": "Votes synced to chain",
                "votes_synced": vote_counts["total"]
            }
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to sync votes to chain"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Close proposal
@app.post("/api/proposals/{proposal_id}/close")
async def close_proposal(proposal_id: int):
    """
    Close voting and finalize proposal.
    """
    try:
        proposal = db.get_proposal(proposal_id)
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        
        if proposal["status"] != "active":
            raise HTTPException(
                status_code=400,
                detail=f"Proposal already {proposal['status']}"
            )
        
        # Get results
        vote_counts = db.get_vote_counts(proposal_id)
        total_eligible_voters = 100  # Mock
        
        outcome = GovernanceRules.determine_outcome(
            votes_for=vote_counts["for"],
            votes_against=vote_counts["against"],
            total_eligible_voters=total_eligible_voters
        )
        
        # Close proposal
        db.close_proposal(proposal_id, outcome["status"])
        
        # Finalize on-chain (mock)
        governance_contract.finalize_proposal(proposal["on_chain_id"])
        
        return {
            "success": True,
            "message": "Proposal closed",
            "outcome": outcome
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Proposal detail page
@app.get("/proposals/{proposal_id}", response_class=HTMLResponse)
async def proposal_detail(request: Request, proposal_id: int):
    """Render proposal detail page."""
    try:
        proposal = db.get_proposal(proposal_id)
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        
        vote_counts = db.get_vote_counts(proposal_id)
        votes = db.get_votes(proposal_id)
        
        return templates.TemplateResponse(
            "proposal.html",
            {
                "request": request,
                "proposal": proposal,
                "vote_counts": vote_counts,
                "votes": votes
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Results page
@app.get("/proposals/{proposal_id}/results", response_class=HTMLResponse)
async def results_page(request: Request, proposal_id: int):
    """Render results page."""
    try:
        proposal = db.get_proposal(proposal_id)
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        
        vote_counts = db.get_vote_counts(proposal_id)
        total_eligible_voters = 100  # Mock
        
        outcome = GovernanceRules.determine_outcome(
            votes_for=vote_counts["for"],
            votes_against=vote_counts["against"],
            total_eligible_voters=total_eligible_voters
        )
        
        return templates.TemplateResponse(
            "results.html",
            {
                "request": request,
                "proposal": proposal,
                "outcome": outcome
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
