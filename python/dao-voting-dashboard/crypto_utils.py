"""
Cryptographic utilities for vote signing and verification.
"""

from eth_account import Account
from eth_account.messages import encode_defunct
from web3 import Web3
from typing import Tuple


class VoteSignature:
    """Handle vote signing and verification."""
    
    @staticmethod
    def sign_vote(
        proposal_id: int,
        vote_choice: str,
        private_key: str
    ) -> Tuple[str, str]:
        """
        Sign a vote using a private key.
        
        Args:
            proposal_id: ID of the proposal
            vote_choice: "for", "against", or "abstain"
            private_key: Hex-encoded private key
            
        Returns:
            Tuple of (voter_address, signature)
        """
        account = Account.from_key(private_key)
        
        # Create message to sign
        message = f"Vote on proposal {proposal_id}: {vote_choice}"
        encoded_message = encode_defunct(text=message)
        
        # Sign message
        signed_message = account.sign_message(encoded_message)
        signature = signed_message.signature.hex()
        
        return (account.address, signature)
    
    @staticmethod
    def verify_vote(
        proposal_id: int,
        vote_choice: str,
        voter_address: str,
        signature: str
    ) -> bool:
        """
        Verify a vote signature.
        
        Args:
            proposal_id: ID of the proposal
            vote_choice: "for", "against", or "abstain"
            voter_address: Address that supposedly signed
            signature: Hex-encoded signature
            
        Returns:
            True if signature is valid
        """
        try:
            # Reconstruct message
            message = f"Vote on proposal {proposal_id}: {vote_choice}"
            encoded_message = encode_defunct(text=message)
            
            # Recover signer
            recovered_address = Account.recover_message(
                encoded_message,
                signature=bytes.fromhex(signature.replace('0x', ''))
            )
            
            # Check if recovered address matches
            return recovered_address.lower() == voter_address.lower()
        except Exception:
            return False


class MerkleProof:
    """Simple Merkle tree for vote batching (mock implementation)."""
    
    @staticmethod
    def generate_root(votes: list) -> str:
        """
        Generate a mock Merkle root for a list of votes.
        
        In production, this would be a proper Merkle tree implementation.
        For this demo, we just hash all votes together.
        """
        if not votes:
            return "0x" + "0" * 64
        
        # Simple concatenation and hash (not a real Merkle tree)
        combined = "".join(str(v) for v in votes)
        return Web3.keccak(text=combined).hex()
    
    @staticmethod
    def generate_proof(vote_index: int, votes: list) -> list:
        """
        Generate a mock Merkle proof for a vote.
        
        In production, this would generate actual Merkle proof hashes.
        """
        # Mock proof - just return empty list for demo
        return []
