"""Blockchain interaction for DAO voting dashboard."""

from typing import Dict, Any, Optional
from web3 import Web3
from eth_account import Account
from eth_account.messages import encode_defunct
from app.config import config

# Mock Governance Contract ABI
GOVERNANCE_ABI = [
    {
        "inputs": [{"name": "proposalId", "type": "uint256"}],
        "name": "getProposal",
        "outputs": [
            {"name": "title", "type": "string"},
            {"name": "votesFor", "type": "uint256"},
            {"name": "votesAgainst", "type": "uint256"},
            {"name": "status", "type": "uint8"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {"name": "title", "type": "string"},
            {"name": "description", "type": "string"},
            {"name": "endTime", "type": "uint256"}
        ],
        "name": "createProposal",
        "outputs": [{"name": "proposalId", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"name": "proposalId", "type": "uint256"},
            {"name": "support", "type": "bool"}
        ],
        "name": "vote",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]


class BlockchainClient:
    """Web3 client for interacting with BNB Chain."""
    
    def __init__(self):
        """Initialize Web3 connection."""
        self.w3 = Web3(Web3.HTTPProvider(config.RPC_URL))
        self.contract_address = config.GOVERNANCE_CONTRACT_ADDRESS
        
        # Mock contract instance
        if self.contract_address != "0x0000000000000000000000000000000000000000":
            self.contract = self.w3.eth.contract(
                address=self.contract_address,
                abi=GOVERNANCE_ABI
            )
        else:
            self.contract = None
    
    def is_connected(self) -> bool:
        """Check if connected to BNB Chain."""
        try:
            return self.w3.is_connected()
        except Exception:
            return False
    
    def get_chain_id(self) -> int:
        """Get chain ID."""
        return self.w3.eth.chain_id if self.is_connected() else config.CHAIN_ID
    
    def sign_message(self, private_key: str, message: str) -> str:
        """Sign a message with private key."""
        account = Account.from_key(private_key)
        message_hash = encode_defunct(text=message)
        signed = account.sign_message(message_hash)
        return signed.signature.hex()
    
    def verify_signature(
        self,
        message: str,
        signature: str,
        expected_address: str
    ) -> bool:
        """Verify a signed message."""
        try:
            message_hash = encode_defunct(text=message)
            recovered_address = Account.recover_message(
                message_hash,
                signature=bytes.fromhex(signature.replace('0x', ''))
            )
            return recovered_address.lower() == expected_address.lower()
        except Exception:
            return False
    
    # Mock on-chain operations
    
    def get_proposal_from_chain(self, proposal_id: int) -> Optional[Dict[str, Any]]:
        """Get proposal from smart contract (mocked)."""
        if not self.contract:
            # Return mock data
            return {
                "proposal_id": proposal_id,
                "title": f"Proposal #{proposal_id}",
                "votes_for": 100,
                "votes_against": 50,
                "status": "active"
            }
        
        try:
            result = self.contract.functions.getProposal(proposal_id).call()
            return {
                "proposal_id": proposal_id,
                "title": result[0],
                "votes_for": result[1],
                "votes_against": result[2],
                "status": ["active", "passed", "rejected"][result[3]]
            }
        except Exception as e:
            print(f"Error fetching proposal from chain: {e}")
            return None
    
    def submit_proposal_to_chain(
        self,
        title: str,
        description: str,
        end_time: int,
        private_key: Optional[str] = None
    ) -> Optional[int]:
        """Submit proposal to chain (mocked)."""
        # In a real implementation, this would create a transaction
        # For now, return a mock proposal ID
        import random
        return random.randint(1000, 9999)
    
    def submit_vote_to_chain(
        self,
        proposal_id: int,
        support: bool,
        private_key: Optional[str] = None
    ) -> Optional[str]:
        """Submit vote to chain (mocked)."""
        # In a real implementation, this would create a transaction
        # For now, return a mock transaction hash
        return f"0x{'0' * 64}"
    
    def batch_submit_votes(
        self,
        proposal_id: int,
        votes: list,
        private_key: Optional[str] = None
    ) -> Optional[str]:
        """Batch submit multiple votes to chain (gasless simulation)."""
        # Simulate Merkle proof generation and batch submission
        # In production, this would use a relayer or meta-transaction
        return f"0x{'1' * 64}"


# Global blockchain client
blockchain = BlockchainClient()
