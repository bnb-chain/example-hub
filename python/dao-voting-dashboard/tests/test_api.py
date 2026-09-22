"""
Tests for FastAPI endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
import sys
from pathlib import Path

# Add parent directory to path to import modules
parent_dir = str(Path(__file__).parent.parent)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Import from root-level modules (not app directory)
from database import Database

# Import the FastAPI app from app.py file
import importlib.util
spec = importlib.util.spec_from_file_location("app_module", Path(__file__).parent.parent / "app.py")
app_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app_module)
app = app_module.app


@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)


def test_health_check(client):
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data


def test_create_proposal_success(client):
    """Test creating a proposal via API."""
    payload = {
        "title": "Test Proposal",
        "description": "This is a test proposal",
        "creator": "0x1234567890123456789012345678901234567890",
        "duration_hours": 168
    }
    
    response = client.post("/api/proposals", json=payload)
    assert response.status_code == 200
    
    data = response.json()
    assert data["success"] is True
    assert "proposal_id" in data
    assert "on_chain_id" in data


def test_create_proposal_missing_fields(client):
    """Test creating proposal with missing fields."""
    payload = {
        "title": "Test Proposal"
        # Missing required fields
    }
    
    response = client.post("/api/proposals", json=payload)
    assert response.status_code == 422  # Validation error


def test_list_proposals(client):
    """Test listing proposals."""
    # Create a proposal first
    payload = {
        "title": "Test Proposal",
        "description": "Description",
        "creator": "0x1234567890123456789012345678901234567890",
        "duration_hours": 168
    }
    client.post("/api/proposals", json=payload)
    
    # List proposals
    response = client.get("/api/proposals")
    assert response.status_code == 200
    
    data = response.json()
    assert "proposals" in data
    assert len(data["proposals"]) > 0


def test_list_proposals_filter_by_status(client):
    """Test filtering proposals by status."""
    response = client.get("/api/proposals?status=active")
    assert response.status_code == 200
    
    data = response.json()
    assert "proposals" in data


def test_get_proposal_details(client):
    """Test getting proposal details."""
    # Create proposal
    payload = {
        "title": "Test Proposal",
        "description": "Description",
        "creator": "0x1234567890123456789012345678901234567890",
        "duration_hours": 168
    }
    create_response = client.post("/api/proposals", json=payload)
    proposal_id = create_response.json()["proposal_id"]
    
    # Get details
    response = client.get(f"/api/proposals/{proposal_id}")
    assert response.status_code == 200
    
    data = response.json()
    assert "proposal" in data
    assert "vote_counts" in data
    assert "votes" in data


def test_get_nonexistent_proposal(client):
    """Test getting non-existent proposal."""
    response = client.get("/api/proposals/999")
    assert response.status_code == 404


def test_cast_vote_success(client):
    """Test casting a vote."""
    # Create proposal
    create_payload = {
        "title": "Test Proposal",
        "description": "Description",
        "creator": "0x1234567890123456789012345678901234567890",
        "duration_hours": 168
    }
    create_response = client.post("/api/proposals", json=create_payload)
    proposal_id = create_response.json()["proposal_id"]
    
    # Cast vote
    vote_payload = {
        "voter_address": "0xabcdef0123456789012345678901234567890abc",
        "vote_choice": "for",
        "private_key": "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    }
    
    response = client.post(
        f"/api/proposals/{proposal_id}/vote",
        json=vote_payload
    )
    assert response.status_code == 200
    
    data = response.json()
    assert data["success"] is True
    assert "vote_id" in data


def test_cast_vote_invalid_choice(client):
    """Test casting vote with invalid choice."""
    # Create proposal
    create_payload = {
        "title": "Test Proposal",
        "description": "Description",
        "creator": "0x1234567890123456789012345678901234567890",
        "duration_hours": 168
    }
    create_response = client.post("/api/proposals", json=create_payload)
    proposal_id = create_response.json()["proposal_id"]
    
    # Cast invalid vote
    vote_payload = {
        "voter_address": "0xabcdef0123456789012345678901234567890abc",
        "vote_choice": "maybe",  # Invalid
        "private_key": "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    }
    
    response = client.post(
        f"/api/proposals/{proposal_id}/vote",
        json=vote_payload
    )
    assert response.status_code == 400


def test_cast_vote_duplicate(client):
    """Test casting duplicate vote from same address."""
    # Create proposal
    create_payload = {
        "title": "Test Proposal",
        "description": "Description",
        "creator": "0x1234567890123456789012345678901234567890",
        "duration_hours": 168
    }
    create_response = client.post("/api/proposals", json=create_payload)
    proposal_id = create_response.json()["proposal_id"]
    
    # Cast first vote
    vote_payload = {
        "voter_address": "0xabcdef0123456789012345678901234567890abc",
        "vote_choice": "for",
        "private_key": "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    }
    client.post(f"/api/proposals/{proposal_id}/vote", json=vote_payload)
    
    # Cast duplicate vote
    response = client.post(
        f"/api/proposals/{proposal_id}/vote",
        json=vote_payload
    )
    assert response.status_code == 400


def test_get_results(client):
    """Test getting proposal results."""
    # Create proposal
    create_payload = {
        "title": "Test Proposal",
        "description": "Description",
        "creator": "0x1234567890123456789012345678901234567890",
        "duration_hours": 168
    }
    create_response = client.post("/api/proposals", json=create_payload)
    proposal_id = create_response.json()["proposal_id"]
    
    # Get results
    response = client.get(f"/api/proposals/{proposal_id}/results")
    assert response.status_code == 200
    
    data = response.json()
    assert "proposal" in data
    assert "outcome" in data
    assert "status" in data["outcome"]


def test_sync_to_chain(client):
    """Test syncing votes to chain."""
    # Create proposal and cast votes
    create_payload = {
        "title": "Test Proposal",
        "description": "Description",
        "creator": "0x1234567890123456789012345678901234567890",
        "duration_hours": 168
    }
    create_response = client.post("/api/proposals", json=create_payload)
    proposal_id = create_response.json()["proposal_id"]
    
    # Cast a vote
    vote_payload = {
        "voter_address": "0xabcdef0123456789012345678901234567890abc",
        "vote_choice": "for",
        "private_key": "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    }
    client.post(f"/api/proposals/{proposal_id}/vote", json=vote_payload)
    
    # Sync to chain
    response = client.post(f"/api/proposals/{proposal_id}/sync")
    assert response.status_code == 200
    
    data = response.json()
    assert data["success"] is True
    assert "votes_synced" in data


def test_close_proposal(client):
    """Test closing a proposal."""
    # Create proposal
    create_payload = {
        "title": "Test Proposal",
        "description": "Description",
        "creator": "0x1234567890123456789012345678901234567890",
        "duration_hours": 168
    }
    create_response = client.post("/api/proposals", json=create_payload)
    proposal_id = create_response.json()["proposal_id"]
    
    # Close proposal
    response = client.post(f"/api/proposals/{proposal_id}/close")
    assert response.status_code == 200
    
    data = response.json()
    assert data["success"] is True
    assert "outcome" in data


def test_close_already_closed_proposal(client):
    """Test closing an already closed proposal."""
    # Create and close proposal
    create_payload = {
        "title": "Test Proposal",
        "description": "Description",
        "creator": "0x1234567890123456789012345678901234567890",
        "duration_hours": 168
    }
    create_response = client.post("/api/proposals", json=create_payload)
    proposal_id = create_response.json()["proposal_id"]
    client.post(f"/api/proposals/{proposal_id}/close")
    
    # Try to close again
    response = client.post(f"/api/proposals/{proposal_id}/close")
    assert response.status_code == 400


def test_vote_on_closed_proposal(client):
    """Test voting on closed proposal."""
    # Create and close proposal
    create_payload = {
        "title": "Test Proposal",
        "description": "Description",
        "creator": "0x1234567890123456789012345678901234567890",
        "duration_hours": 168
    }
    create_response = client.post("/api/proposals", json=create_payload)
    proposal_id = create_response.json()["proposal_id"]
    client.post(f"/api/proposals/{proposal_id}/close")
    
    # Try to vote
    vote_payload = {
        "voter_address": "0xabcdef0123456789012345678901234567890abc",
        "vote_choice": "for",
        "private_key": "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    }
    
    response = client.post(
        f"/api/proposals/{proposal_id}/vote",
        json=vote_payload
    )
    assert response.status_code == 400
