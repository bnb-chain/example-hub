"""
Governance rules and logic.
"""

from typing import Dict
from config import config


class GovernanceRules:
    """DAO governance rules and calculations."""
    
    @staticmethod
    def calculate_quorum(total_eligible_voters: int) -> int:
        """
        Calculate minimum votes needed for quorum.
        
        Args:
            total_eligible_voters: Total number of eligible voters
            
        Returns:
            Minimum votes needed
        """
        return int(total_eligible_voters * config.QUORUM_PERCENTAGE / 100)
    
    @staticmethod
    def check_quorum_met(
        total_votes: int,
        total_eligible_voters: int
    ) -> bool:
        """
        Check if quorum requirement is met.
        
        Args:
            total_votes: Total votes cast
            total_eligible_voters: Total eligible voters
            
        Returns:
            True if quorum is met
        """
        required = GovernanceRules.calculate_quorum(total_eligible_voters)
        return total_votes >= required
    
    @staticmethod
    def calculate_approval_rate(votes_for: int, votes_against: int) -> float:
        """
        Calculate approval percentage.
        
        Args:
            votes_for: Number of yes votes
            votes_against: Number of no votes
            
        Returns:
            Approval rate as percentage (0-100)
        """
        total = votes_for + votes_against
        if total == 0:
            return 0.0
        return (votes_for / total) * 100
    
    @staticmethod
    def check_approval_met(votes_for: int, votes_against: int) -> bool:
        """
        Check if approval threshold is met.
        
        Args:
            votes_for: Number of yes votes
            votes_against: Number of no votes
            
        Returns:
            True if approval threshold is met
        """
        approval_rate = GovernanceRules.calculate_approval_rate(
            votes_for, votes_against
        )
        return approval_rate >= config.APPROVAL_THRESHOLD_PERCENTAGE
    
    @staticmethod
    def determine_outcome(
        votes_for: int,
        votes_against: int,
        total_eligible_voters: int
    ) -> Dict[str, any]:
        """
        Determine proposal outcome based on governance rules.
        
        Args:
            votes_for: Number of yes votes
            votes_against: Number of no votes
            total_eligible_voters: Total eligible voters
            
        Returns:
            Dict with outcome details
        """
        total_votes = votes_for + votes_against
        quorum_met = GovernanceRules.check_quorum_met(
            total_votes, total_eligible_voters
        )
        approval_met = GovernanceRules.check_approval_met(
            votes_for, votes_against
        )
        approval_rate = GovernanceRules.calculate_approval_rate(
            votes_for, votes_against
        )
        
        # Determine final status
        if not quorum_met:
            status = "rejected"
            reason = "Quorum not met"
        elif approval_met:
            status = "passed"
            reason = "Approval threshold met"
        else:
            status = "rejected"
            reason = "Approval threshold not met"
        
        return {
            "status": status,
            "reason": reason,
            "quorum_met": quorum_met,
            "approval_met": approval_met,
            "approval_rate": approval_rate,
            "total_votes": total_votes,
            "votes_for": votes_for,
            "votes_against": votes_against,
            "required_quorum": GovernanceRules.calculate_quorum(
                total_eligible_voters
            ),
            "required_approval": config.APPROVAL_THRESHOLD_PERCENTAGE
        }
    
    @staticmethod
    def is_eligible_voter(address: str) -> bool:
        """
        Check if address is eligible to vote.
        
        In production, this would check token balance or NFT ownership.
        Mock implementation accepts any valid address.
        
        Args:
            address: Ethereum address
            
        Returns:
            True if eligible
        """
        # Simple validation: address must be valid format
        if not address or len(address) != 42:
            return False
        if not address.startswith("0x"):
            return False
        return True
    
    @staticmethod
    def get_voting_power(address: str) -> int:
        """
        Get voting power for address.
        
        In production, this would query token balance.
        Mock implementation returns 1 vote per address.
        
        Args:
            address: Ethereum address
            
        Returns:
            Number of votes (voting power)
        """
        if GovernanceRules.is_eligible_voter(address):
            return 1
        return 0
