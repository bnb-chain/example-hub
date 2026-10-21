"""Mock blockchain contract for NFT tickets."""

import json
from typing import Optional, Dict
from web3 import Web3
from config import config


# Mock contract ABI
TICKET_NFT_ABI = [
    {
        "type": "function",
        "name": "mintTicket",
        "inputs": [
            {"name": "to", "type": "address"},
            {"name": "eventId", "type": "uint256"}
        ],
        "outputs": [{"name": "tokenId", "type": "uint256"}],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "ownerOf",
        "inputs": [{"name": "tokenId", "type": "uint256"}],
        "outputs": [{"name": "owner", "type": "address"}],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "totalSupply",
        "inputs": [{"name": "eventId", "type": "uint256"}],
        "outputs": [{"name": "supply", "type": "uint256"}],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "tokenURI",
        "inputs": [{"name": "tokenId", "type": "uint256"}],
        "outputs": [{"name": "uri", "type": "string"}],
        "stateMutability": "view"
    },
    {
        "type": "event",
        "name": "TicketMinted",
        "inputs": [
            {"name": "tokenId", "type": "uint256", "indexed": True},
            {"name": "to", "type": "address", "indexed": True},
            {"name": "eventId", "type": "uint256", "indexed": False}
        ]
    }
]


class MockTicketContract:
    """Mock implementation of NFT ticket contract."""
    
    def __init__(self):
        """Initialize mock contract."""
        self.w3 = Web3(Web3.HTTPProvider(config.RPC_URL))
        self.address = config.TICKET_CONTRACT_ADDRESS
        self.abi = TICKET_NFT_ABI
        
        # Mock storage
        self._owners = {}  # tokenId -> owner address
        self._event_supplies = {}  # eventId -> count
        self._token_events = {}  # tokenId -> eventId
    
    def mint_ticket(self, to: str, event_id: int, token_id: int) -> Dict:
        """
        Mock minting a ticket NFT.
        
        Args:
            to: Owner address
            event_id: Event ID
            token_id: Token ID
            
        Returns:
            Dict with transaction details
        """
        # Simple validation - check if address looks like valid format
        if not to.startswith("0x") or len(to) not in [41, 42]:
            raise ValueError(f"Invalid address: {to}")
        
        # Try to checksum, but fallback if web3 not connected
        try:
            to = self.w3.to_checksum_address(to)
        except:
            to = to  # Keep original if checksum fails
        
        # Store ownership
        self._owners[token_id] = to
        self._token_events[token_id] = event_id
        
        # Update supply
        self._event_supplies[event_id] = self._event_supplies.get(event_id, 0) + 1
        
        return {
            "success": True,
            "token_id": token_id,
            "owner": to,
            "event_id": event_id,
            "tx_hash": f"0x{'0' * 64}"  # Mock transaction hash
        }
    
    def owner_of(self, token_id: int) -> Optional[str]:
        """
        Get the owner of a token.
        
        Args:
            token_id: Token ID
            
        Returns:
            Owner address or None
        """
        return self._owners.get(token_id)
    
    def total_supply(self, event_id: int) -> int:
        """
        Get total tickets minted for an event.
        
        Args:
            event_id: Event ID
            
        Returns:
            Number of tickets
        """
        return self._event_supplies.get(event_id, 0)
    
    def token_uri(self, token_id: int) -> str:
        """
        Get metadata URI for a token.
        
        Args:
            token_id: Token ID
            
        Returns:
            Metadata URI
        """
        event_id = self._token_events.get(token_id)
        if event_id is None:
            return ""
        
        return f"ipfs://Qm.../event_{event_id}_ticket_{token_id}.json"
    
    def get_abi(self) -> list:
        """Get contract ABI."""
        return self.abi
    
    def get_address(self) -> str:
        """Get contract address."""
        return self.address


# Global contract instance
ticket_contract = MockTicketContract()
