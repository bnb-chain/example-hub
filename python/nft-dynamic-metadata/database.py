"""
Token Registry Database Module

Handles storage and retrieval of dynamic NFT tokens using TinyDB.
"""

from typing import Dict, List, Optional
from tinydb import TinyDB, Query
from datetime import datetime


class TokenDatabase:
    """Manages the NFT token registry."""
    
    def __init__(self, db_path: str = "./nft_data.json"):
        """
        Initialize the database.
        
        Args:
            db_path: Path to the TinyDB JSON file
        """
        self.db = TinyDB(db_path)
        self.tokens = self.db.table('tokens')
        self.Token = Query()
    
    def mint_token(self, owner: str, initial_state: str = "sunny") -> Dict:
        """
        Mint a new dynamic NFT token.
        
        Args:
            owner: Wallet address of the token owner
            initial_state: Initial dynamic state (default: "sunny")
            
        Returns:
            Dict containing the newly created token
        """
        token_id = self.get_next_token_id()
        
        token = {
            "token_id": token_id,
            "owner": owner,
            "current_state": initial_state,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "update_count": 0
        }
        
        self.tokens.insert(token)
        return token
    
    def get_token(self, token_id: int) -> Optional[Dict]:
        """
        Retrieve a token by ID.
        
        Args:
            token_id: The token ID to retrieve
            
        Returns:
            Token dict or None if not found
        """
        result = self.tokens.search(self.Token.token_id == token_id)
        return result[0] if result else None
    
    def get_all_tokens(self) -> List[Dict]:
        """
        Get all tokens.
        
        Returns:
            List of all token dicts
        """
        return self.tokens.all()
    
    def update_token_state(self, token_id: int, new_state: str) -> bool:
        """
        Update the dynamic state of a token.
        
        Args:
            token_id: The token ID to update
            new_state: New state value
            
        Returns:
            True if updated successfully, False otherwise
        """
        token = self.get_token(token_id)
        if not token:
            return False
        
        self.tokens.update(
            {
                "current_state": new_state,
                "updated_at": datetime.now().isoformat(),
                "update_count": token.get("update_count", 0) + 1
            },
            self.Token.token_id == token_id
        )
        return True
    
    def get_next_token_id(self) -> int:
        """
        Get the next available token ID.
        
        Returns:
            Next token ID (integer)
        """
        all_tokens = self.tokens.all()
        if not all_tokens:
            return 1
        
        max_id = max(token["token_id"] for token in all_tokens)
        return max_id + 1
    
    def delete_token(self, token_id: int) -> bool:
        """
        Delete a token (for testing purposes).
        
        Args:
            token_id: The token ID to delete
            
        Returns:
            True if deleted, False if not found
        """
        result = self.tokens.remove(self.Token.token_id == token_id)
        return len(result) > 0
    
    def clear_all(self):
        """Clear all tokens from the database (for testing)."""
        self.tokens.truncate()
    
    def close(self):
        """Close the database connection."""
        self.db.close()
