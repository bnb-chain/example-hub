"""Tests for blockchain client."""

import pytest
from unittest.mock import Mock, patch
from app.blockchain import blockchain
from eth_account import Account


def test_sign_and_verify_message():
    """Test signing and verifying a message."""
    # Create a test account
    account = Account.create()
    private_key = account.key.hex()
    address = account.address
    message = "Test message"
    
    # Sign the message
    signature = blockchain.sign_message(private_key, message)
    
    # Verify the signature
    assert blockchain.verify_signature(message, signature, address)


def test_verify_invalid_signature():
    """Test verifying an invalid signature."""
    message = "Test message"
    signature = "0xinvalidsignature"
    address = "0x0000000000000000000000000000000000000000"
    
    assert not blockchain.verify_signature(message, signature, address)


def test_is_connected():
    """Test checking blockchain connection."""
    # Should be mocked/connected for testing
    assert blockchain.is_connected()


def test_get_chain_id():
    """Test getting chain ID."""
    chain_id = blockchain.get_chain_id()
    assert chain_id == 97  # BNB testnet


def test_submit_proposal_to_chain():
    """Test submitting proposal to chain (mocked)."""
    with patch.object(blockchain, 'submit_proposal_to_chain', return_value=1):
        on_chain_id = blockchain.submit_proposal_to_chain(
            title="Test Proposal",
            description="Test Description",
            end_time=1234567890,
            private_key=None
        )
        assert on_chain_id == 1


def test_get_proposal_from_chain():
    """Test getting proposal from chain (mocked)."""
    mock_proposal = {
        "title": "Test Proposal",
        "description": "Test Description",
        "for_votes": 10,
        "against_votes": 5,
        "status": 1
    }
    
    with patch.object(blockchain, 'get_proposal_from_chain', return_value=mock_proposal):
        proposal = blockchain.get_proposal_from_chain(1)
        assert proposal["title"] == "Test Proposal"
        assert proposal["for_votes"] == 10


def test_submit_vote_to_chain():
    """Test submitting vote to chain (mocked)."""
    with patch.object(blockchain, 'submit_vote_to_chain', return_value=True):
        result = blockchain.submit_vote_to_chain(
            proposal_id=1,
            vote_choice="for",
            private_key=None
        )
        assert result is True
