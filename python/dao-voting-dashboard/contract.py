"""
Mock governance smart contract interaction.
"""

from web3 import Web3
from typing import Dict, Optional
import json
from config import config


# Mock Governance Contract ABI
GOVERNANCE_ABI = [
    {
        "inputs": [
            {"name": "_title", "type": "string"},
            {"name": "_description", "type": "string"},
            {"name": "_endTime", "type": "uint256"}
        ],
        "name": "createProposal",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"name": "_proposalId", "type": "uint256"}],
        "name": "getProposal",
        "outputs": [
            {"name": "title", "type": "string"},
            {"name": "description", "type": "string"},
            {"name": "votesFor", "type": "uint256"},
            {"name": "votesAgainst", "type": "uint256"},
            {"name": "status", "type": "uint8"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {"name": "_proposalId", "type": "uint256"},
            {"name": "_votesFor", "type": "uint256"},
            {"name": "_votesAgainst", "type": "uint256"}
        ],
        "name": "submitVotes",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"name": "_proposalId", "type": "uint256"}],
        "name": "finalizeProposal",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]


class GovernanceContract:
    """Mock governance contract interface."""
    
    def __init__(self):
        """Initialize contract connection."""
        self.w3 = Web3(Web3.HTTPProvider(config.RPC_URL))
        self.contract_address = config.GOVERNANCE_CONTRACT_ADDRESS
        
        # Mock contract storage (simulates on-chain state)
        self._mock_proposals = {}
        self._proposal_counter = 0
    
    def create_proposal(
        self,
        title: str,
        description: str,
        end_time: int
    ) -> int:
        """
        Mock: Create a proposal on-chain.
        
        In production, this would call the actual smart contract.
        """
        self._proposal_counter += 1
        proposal_id = self._proposal_counter
        
        self._mock_proposals[proposal_id] = {
            "title": title,
            "description": description,
            "votesFor": 0,
            "votesAgainst": 0,
            "status": 1  # 0=pending, 1=active, 2=closed, 3=executed
        }
        
        return proposal_id
    
    def get_proposal(self, proposal_id: int) -> Optional[Dict]:
        """
        Mock: Get proposal details from chain.
        
        In production, this would read from the smart contract.
        """
        if proposal_id in self._mock_proposals:
            return self._mock_proposals[proposal_id]
        return None
    
    def submit_votes(
        self,
        proposal_id: int,
        votes_for: int,
        votes_against: int
    ) -> bool:
        """
        Mock: Submit aggregated votes to chain.
        
        In production, this would be a contract transaction.
        """
        if proposal_id in self._mock_proposals:
            self._mock_proposals[proposal_id]["votesFor"] = votes_for
            self._mock_proposals[proposal_id]["votesAgainst"] = votes_against
            return True
        return False
    
    def finalize_proposal(self, proposal_id: int) -> bool:
        """
        Mock: Finalize a proposal on-chain.
        
        In production, this would execute the proposal if passed.
        """
        if proposal_id in self._mock_proposals:
            proposal = self._mock_proposals[proposal_id]
            proposal["status"] = 2  # closed
            
            # Determine if passed
            total_votes = proposal["votesFor"] + proposal["votesAgainst"]
            if total_votes > 0:
                approval_rate = proposal["votesFor"] / total_votes * 100
                if approval_rate >= config.APPROVAL_THRESHOLD_PERCENTAGE:
                    proposal["status"] = 3  # executed
            
            return True
        return False
    
    def get_abi(self) -> list:
        """Get contract ABI."""
        return GOVERNANCE_ABI
    
    def get_address(self) -> str:
        """Get contract address."""
        return self.contract_address


# Global contract instance
governance_contract = GovernanceContract()
