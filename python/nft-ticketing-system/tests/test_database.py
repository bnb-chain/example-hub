"""Tests for database operations."""

import pytest
import os
from datetime import datetime
from database import Database


@pytest.fixture
def test_db():
    """Create a test database."""
    test_db_path = "test_tickets.db"
    
    # Remove if exists
    if os.path.exists(test_db_path):
        os.remove(test_db_path)
    
    db = Database(test_db_path)
    yield db
    
    # Cleanup
    if os.path.exists(test_db_path):
        os.remove(test_db_path)


def test_create_event(test_db):
    """Test creating an event."""
    event_id = test_db.create_event(
        name="Test Concert",
        date="2025-12-01",
        location="Test Venue",
        capacity=100
    )
    
    assert event_id > 0


def test_get_event(test_db):
    """Test getting an event."""
    event_id = test_db.create_event(
        name="Test Concert",
        date="2025-12-01",
        location="Test Venue",
        capacity=100
    )
    
    event = test_db.get_event(event_id)
    
    assert event is not None
    assert event["name"] == "Test Concert"
    assert event["capacity"] == 100


def test_list_events(test_db):
    """Test listing events."""
    test_db.create_event("Event 1", "2025-12-01", "Venue 1", 50)
    test_db.create_event("Event 2", "2025-12-02", "Venue 2", 100)
    
    events = test_db.list_events()
    
    assert len(events) == 2


def test_mint_ticket(test_db):
    """Test minting a ticket."""
    event_id = test_db.create_event("Test Event", "2025-12-01", "Venue", 100)
    
    ticket_id = test_db.mint_ticket(
        token_id=1,
        event_id=event_id,
        owner_address="0x1234567890123456789012345678901234567890",
        qr_code_path="static/qr_codes/ticket_1.png"
    )
    
    assert ticket_id > 0
    
    # Check event tickets_sold updated
    event = test_db.get_event(event_id)
    assert event["tickets_sold"] == 1


def test_get_ticket(test_db):
    """Test getting a ticket."""
    event_id = test_db.create_event("Test Event", "2025-12-01", "Venue", 100)
    
    test_db.mint_ticket(
        token_id=1,
        event_id=event_id,
        owner_address="0x1234567890123456789012345678901234567890"
    )
    
    ticket = test_db.get_ticket(1)
    
    assert ticket is not None
    assert ticket["token_id"] == 1
    assert ticket["event_id"] == event_id


def test_get_tickets_by_event(test_db):
    """Test getting tickets for an event."""
    event_id = test_db.create_event("Test Event", "2025-12-01", "Venue", 100)
    
    test_db.mint_ticket(1, event_id, "0xAddress1")
    test_db.mint_ticket(2, event_id, "0xAddress2")
    
    tickets = test_db.get_tickets_by_event(event_id)
    
    assert len(tickets) == 2


def test_check_in_ticket(test_db):
    """Test checking in a ticket."""
    event_id = test_db.create_event("Test Event", "2025-12-01", "Venue", 100)
    test_db.mint_ticket(1, event_id, "0xAddress1")
    
    # Check in
    success = test_db.check_in_ticket(1)
    assert success
    
    # Verify checked in
    ticket = test_db.get_ticket(1)
    assert ticket["checked_in"] == 1
    assert ticket["checked_in_at"] is not None


def test_check_in_already_checked(test_db):
    """Test checking in an already checked ticket."""
    event_id = test_db.create_event("Test Event", "2025-12-01", "Venue", 100)
    test_db.mint_ticket(1, event_id, "0xAddress1")
    
    # First check in
    test_db.check_in_ticket(1)
    
    # Second check in should fail
    success = test_db.check_in_ticket(1)
    assert not success


def test_get_next_token_id(test_db):
    """Test getting next token ID."""
    event_id = test_db.create_event("Test Event", "2025-12-01", "Venue", 100)
    
    # Should start at 1
    assert test_db.get_next_token_id() == 1
    
    test_db.mint_ticket(1, event_id, "0xAddress1")
    
    # Should be 2
    assert test_db.get_next_token_id() == 2
