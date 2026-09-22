"""Governance logic for DAO voting."""

from typing import Dict, Any
from datetime import datetime
from app.config import config
from app.database import db


class GovernanceEngine:
    """Governance rules and decision logic."""
    
    @staticmethod
    def calculate_results(proposal_id: int, total_eligible_voters: int = 1000) -> Dict[str, Any]:
        """Calculate voting results for a proposal."""
        counts = db.get_vote_counts(proposal_id)
        
        total_votes = counts["for"] + counts["against"] + counts["abstain"]
        
        # Calculate percentages
        votes_for_pct = (counts["for"] / total_votes * 100) if total_votes > 0 else 0
        votes_against_pct = (counts["against"] / total_votes * 100) if total_votes > 0 else 0
        abstain_pct = (counts["abstain"] / total_votes * 100) if total_votes > 0 else 0
        
        # Check quorum
        quorum_needed = int(total_eligible_voters * config.QUORUM_PERCENTAGE / 100)
        quorum_reached = total_votes >= quorum_needed
        
        # Check if passed
        threshold_needed = config.PASS_THRESHOLD_PERCENTAGE
        passed = quorum_reached and votes_for_pct > threshold_needed
        
        return {
            "votes_for": counts["for"],
            "votes_against": counts["against"],
            "votes_abstain": counts["abstain"],
            "total_votes": total_votes,
            "votes_for_percentage": round(votes_for_pct, 2),
            "votes_against_percentage": round(votes_against_pct, 2),
            "abstain_percentage": round(abstain_pct, 2),
            "quorum_needed": quorum_needed,
            "quorum_reached": quorum_reached,
            "threshold_needed": threshold_needed,
            "passed": passed,
            "status": "passed" if passed else "rejected" if quorum_reached else "pending"
        }
    
    @staticmethod
    def can_vote(proposal_id: int, voter_address: str) -> tuple[bool, str]:
        """Check if a user can vote on a proposal."""
        # Check if proposal exists
        proposal = db.get_proposal(proposal_id)
        if not proposal:
            return False, "Proposal not found"
        
        # Check if proposal is active
        if proposal["status"] != "active":
            return False, "Proposal is not active"
        
        # Check if voting period has ended
        end_time = datetime.fromisoformat(proposal["end_time"])
        if datetime.now() > end_time:
            return False, "Voting period has ended"
        
        # Check if already voted
        if db.has_voted(proposal_id, voter_address):
            return False, "Already voted on this proposal"
        
        return True, "Can vote"
    
    @staticmethod
    def close_proposal(proposal_id: int) -> Dict[str, Any]:
        """Close a proposal and finalize results."""
        proposal = db.get_proposal(proposal_id)
        if not proposal:
            return {"success": False, "error": "Proposal not found"}
        
        if proposal["status"] != "active":
            return {"success": False, "error": "Proposal already closed"}
        
        # Calculate final results
        results = GovernanceEngine.calculate_results(proposal_id)
        
        # Update proposal status
        new_status = results["status"]
        db.update_proposal_status(proposal_id, new_status)
        
        return {
            "success": True,
            "proposal_id": proposal_id,
            "final_status": new_status,
            "results": results
        }
    
    @staticmethod
    def auto_close_expired_proposals():
        """Automatically close proposals past their end time."""
        proposals = db.list_proposals(status="active")
        closed_count = 0
        
        for proposal in proposals:
            end_time = datetime.fromisoformat(proposal["end_time"])
            if datetime.now() > end_time:
                GovernanceEngine.close_proposal(proposal["id"])
                closed_count += 1
        
        return closed_count


governance = GovernanceEngine()
