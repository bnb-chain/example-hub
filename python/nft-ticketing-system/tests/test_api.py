"""Tests for FastAPI application."""

import pytest
from fastapi.testclient import TestClient
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app import app
from database import Database


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture(autouse=True)
def setup_test_db():
    """Setup test database before each test."""
    test_db_path = "test_tickets.db"
    if os.path.exists(test_db_path):
        os.remove(test_db_path)
    
    # Override database path
    import config as config_module
    config_module.config.DATABASE_PATH = test_db_path
    
    yield
    
    # Cleanup
    if os.path.exists(test_db_path):
        os.remove(test_db_path)


def test_health_check(client):
    """Test health check endpoint."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_create_event(client):
    """Test creating an event."""
    event_data = {
        "name": "Test Concert",
        "date": "2025-12-01",
        "location": "Test Venue",
        "capacity": 100
    }
    
    response = client.post("/api/events", json=event_data)
    assert response.status_code == 200
    data = response.json()
    assert data["success"]
    assert "event_id" in data


def test_list_events(client):
    """Test listing events."""
    # Create event first
    client.post("/api/events", json={
        "name": "Test Event",
        "date": "2025-12-01",
        "location": "Venue",
        "capacity": 50
    })
    
    response = client.get("/api/events")
    assert response.status_code == 200
    data = response.json()
    assert "events" in data
    assert len(data["events"]) > 0


def test_get_event(client):
    """Test getting event details."""
    # Create event
    create_response = client.post("/api/events", json={
        "name": "Test Event",
        "date": "2025-12-01",
        "location": "Venue",
        "capacity": 50
    })
    event_id = create_response.json()["event_id"]
    
    # Get event
    response = client.get(f"/api/events/{event_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["event"]["name"] == "Test Event"


def test_mint_ticket(client):
    """Test minting a ticket."""
    # Create event
    create_response = client.post("/api/events", json={
        "name": "Test Event",
        "date": "2025-12-01",
        "location": "Venue",
        "capacity": 50
    })
    event_id = create_response.json()["event_id"]
    
    # Mint ticket
    mint_data = {
        "event_id": event_id,
        "owner_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
    }
    
    response = client.post("/api/mint", json=mint_data)
    assert response.status_code == 200
    data = response.json()
    assert data["success"]
    assert "token_id" in data
    assert "qr_code" in data


def test_mint_invalid_address(client):
    """Test minting with invalid address."""
    # Create event
    create_response = client.post("/api/events", json={
        "name": "Test Event",
        "date": "2025-12-01",
        "location": "Venue",
        "capacity": 50
    })
    event_id = create_response.json()["event_id"]
    
    # Try to mint with invalid address
    mint_data = {
        "event_id": event_id,
        "owner_address": "invalid_address"
    }
    
    response = client.post("/api/mint", json=mint_data)
    assert response.status_code == 400


def test_mint_sold_out_event(client):
    """Test minting ticket for sold out event."""
    # Create event with capacity 1
    create_response = client.post("/api/events", json={
        "name": "Test Event",
        "date": "2025-12-01",
        "location": "Venue",
        "capacity": 1
    })
    event_id = create_response.json()["event_id"]
    
    # Mint first ticket
    client.post("/api/mint", json={
        "event_id": event_id,
        "owner_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
    })
    
    # Try to mint second ticket (should fail)
    response = client.post("/api/mint", json={
        "event_id": event_id,
        "owner_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
    })
    assert response.status_code == 400


def test_verify_ticket(client):
    """Test verifying a ticket."""
    # Create event and mint ticket
    create_response = client.post("/api/events", json={
        "name": "Test Event",
        "date": "2025-12-01",
        "location": "Venue",
        "capacity": 50
    })
    event_id = create_response.json()["event_id"]
    
    mint_response = client.post("/api/mint", json={
        "event_id": event_id,
        "owner_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
    })
    token_id = mint_response.json()["token_id"]
    
    # Verify ticket
    verify_data = {
        "qr_data": f"TICKET:{token_id}:EVENT:{event_id}"
    }
    
    response = client.post("/api/verify", json=verify_data)
    assert response.status_code == 200
    data = response.json()
    assert data["valid"]


def test_verify_already_checked_in(client):
    """Test verifying already checked in ticket."""
    # Create event and mint ticket
    create_response = client.post("/api/events", json={
        "name": "Test Event",
        "date": "2025-12-01",
        "location": "Venue",
        "capacity": 50
    })
    event_id = create_response.json()["event_id"]
    
    mint_response = client.post("/api/mint", json={
        "event_id": event_id,
        "owner_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
    })
    token_id = mint_response.json()["token_id"]
    
    qr_data = f"TICKET:{token_id}:EVENT:{event_id}"
    
    # First verification (should succeed)
    client.post("/api/verify", json={"qr_data": qr_data})
    
    # Second verification (should fail - already checked in)
    response = client.post("/api/verify", json={"qr_data": qr_data})
    assert response.status_code == 200
    data = response.json()
    assert not data["valid"]


def test_get_ticket(client):
    """Test getting ticket details."""
    # Create event and mint ticket
    create_response = client.post("/api/events", json={
        "name": "Test Event",
        "date": "2025-12-01",
        "location": "Venue",
        "capacity": 50
    })
    event_id = create_response.json()["event_id"]
    
    mint_response = client.post("/api/mint", json={
        "event_id": event_id,
        "owner_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
    })
    token_id = mint_response.json()["token_id"]
    
    # Get ticket
    response = client.get(f"/api/tickets/{token_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["ticket"]["token_id"] == token_id
