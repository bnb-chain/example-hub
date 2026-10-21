"""
Tests for Token Database Module
"""

import pytest
import os
from database import TokenDatabase


@pytest.fixture
def test_db():
    """Create a test database."""
    db_path = "./test_nft_data.json"
    db = TokenDatabase(db_path)
    yield db
    db.close()
    # Cleanup
    if os.path.exists(db_path):
        os.remove(db_path)


def test_mint_token(test_db):
    """Test minting a new token."""
    owner = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
    token = test_db.mint_token(owner, "sunny")
    
    assert token is not None
    assert token["token_id"] == 1
    assert token["owner"] == owner
    assert token["current_state"] == "sunny"
    assert token["update_count"] == 0


def test_get_token(test_db):
    """Test retrieving a token."""
    owner = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
    minted_token = test_db.mint_token(owner)
    
    retrieved_token = test_db.get_token(minted_token["token_id"])
    
    assert retrieved_token is not None
    assert retrieved_token["token_id"] == minted_token["token_id"]
    assert retrieved_token["owner"] == owner


def test_get_nonexistent_token(test_db):
    """Test retrieving a token that doesn't exist."""
    token = test_db.get_token(999)
    assert token is None


def test_get_all_tokens(test_db):
    """Test getting all tokens."""
    test_db.mint_token("0xAddress1")
    test_db.mint_token("0xAddress2")
    test_db.mint_token("0xAddress3")
    
    tokens = test_db.get_all_tokens()
    assert len(tokens) == 3


def test_update_token_state(test_db):
    """Test updating token state."""
    owner = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
    token = test_db.mint_token(owner, "sunny")
    
    success = test_db.update_token_state(token["token_id"], "rainy")
    assert success is True
    
    updated_token = test_db.get_token(token["token_id"])
    assert updated_token["current_state"] == "rainy"
    assert updated_token["update_count"] == 1


def test_update_nonexistent_token(test_db):
    """Test updating a token that doesn't exist."""
    success = test_db.update_token_state(999, "sunny")
    assert success is False


def test_get_next_token_id(test_db):
    """Test getting next token ID."""
    # First token should be ID 1
    assert test_db.get_next_token_id() == 1
    
    # Mint a token
    test_db.mint_token("0xAddress1")
    
    # Next should be ID 2
    assert test_db.get_next_token_id() == 2


def test_delete_token(test_db):
    """Test deleting a token."""
    token = test_db.mint_token("0xAddress1")
    
    success = test_db.delete_token(token["token_id"])
    assert success is True
    
    # Verify deletion
    retrieved = test_db.get_token(token["token_id"])
    assert retrieved is None


def test_clear_all(test_db):
    """Test clearing all tokens."""
    test_db.mint_token("0xAddress1")
    test_db.mint_token("0xAddress2")
    
    test_db.clear_all()
    
    tokens = test_db.get_all_tokens()
    assert len(tokens) == 0
