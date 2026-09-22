"""
Tests for database operations.
"""

import pytest
from datetime import datetime, timedelta
import os
import tempfile
from pathlib import Path

from database import Database


@pytest.fixture
def temp_db():
    """Create a temporary database for testing."""
    temp_dir = tempfile.mkdtemp()
    temp_db_path = Path(temp_dir) / "test.db"
    
    # Temporarily override the data directory
    original_data_dir = Database._get_data_dir()
    Database._test_data_dir = temp_dir
    
    db = Database()
    yield db
    
    # Cleanup
    Database._test_data_dir = None
    if temp_db_path.exists():
        temp_db_path.unlink()


@pytest.fixture
def db_with_proposal(temp_db):
    """Create a database with a sample proposal."""
    end_time = datetime.now() + timedelta(days=7)
    proposal_id = temp_db.create_proposal(
        title="Test Proposal",
        description="This is a test proposal",
        creator="0x1234567890123456789012345678901234567890",
        end_time=end_time
    )
    return temp_db, proposal_id


def test_database_initialization(temp_db):
    """Test database initialization and schema creation."""
    assert temp_db.conn is not None
    
    # Check tables exist
    cursor = temp_db.conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
    )
    tables = [row[0] for row in cursor.fetchall()]
    assert "proposals" in tables
    assert "votes" in tables


def test_create_proposal(temp_db):
    """Test creating a proposal."""
    end_time = datetime.now() + timedelta(days=7)
    proposal_id = temp_db.create_proposal(
        title="Fund Community Event",
        description="Allocate 1000 tokens for community meetup",
        creator="0x1234567890123456789012345678901234567890",
        end_time=end_time
    )
    
    assert proposal_id is not None
    assert isinstance(proposal_id, int)
    assert proposal_id > 0


def test_get_proposal(db_with_proposal):
    """Test retrieving a proposal."""
    db, proposal_id = db_with_proposal
    proposal = db.get_proposal(proposal_id)
    
    assert proposal is not None
    assert proposal["id"] == proposal_id
    assert proposal["title"] == "Test Proposal"
    assert proposal["description"] == "This is a test proposal"
    assert proposal["status"] == "active"


def test_get_nonexistent_proposal(temp_db):
    """Test retrieving a non-existent proposal."""
    proposal = temp_db.get_proposal(999)
    assert proposal is None


def test_list_proposals(temp_db):
    """Test listing all proposals."""
    # Create multiple proposals
    end_time = datetime.now() + timedelta(days=7)
    
    id1 = temp_db.create_proposal(
        "Proposal 1", "Description 1",
        "0x1234567890123456789012345678901234567890",
        end_time
    )
    id2 = temp_db.create_proposal(
        "Proposal 2", "Description 2",
        "0xabcdef0123456789012345678901234567890abc",
        end_time
    )
    
    proposals = temp_db.list_proposals()
    assert len(proposals) == 2
    assert proposals[0]["id"] == id1
    assert proposals[1]["id"] == id2


def test_list_proposals_by_status(temp_db):
    """Test filtering proposals by status."""
    end_time = datetime.now() + timedelta(days=7)
    
    id1 = temp_db.create_proposal(
        "Active Proposal", "Description",
        "0x1234567890123456789012345678901234567890",
        end_time
    )
    id2 = temp_db.create_proposal(
        "Another Proposal", "Description",
        "0xabcdef0123456789012345678901234567890abc",
        end_time
    )
    
    # Close one proposal
    temp_db.close_proposal(id2, "passed")
    
    active_proposals = temp_db.list_proposals("active")
    assert len(active_proposals) == 1
    assert active_proposals[0]["id"] == id1
    
    passed_proposals = temp_db.list_proposals("passed")
    assert len(passed_proposals) == 1
    assert passed_proposals[0]["id"] == id2


def test_close_proposal(db_with_proposal):
    """Test closing a proposal."""
    db, proposal_id = db_with_proposal
    
    db.close_proposal(proposal_id, "passed")
    
    proposal = db.get_proposal(proposal_id)
    assert proposal["status"] == "passed"


def test_create_vote(db_with_proposal):
    """Test casting a vote."""
    db, proposal_id = db_with_proposal
    
    vote_id = db.create_vote(
        proposal_id=proposal_id,
        voter_address="0xabcdef0123456789012345678901234567890abc",
        vote_choice="for",
        signature="0xsignature123"
    )
    
    assert vote_id is not None
    assert isinstance(vote_id, int)
    assert vote_id > 0


def test_get_votes(db_with_proposal):
    """Test retrieving votes for a proposal."""
    db, proposal_id = db_with_proposal
    
    # Cast multiple votes
    db.create_vote(proposal_id, "0xvoter1", "for", "0xsig1")
    db.create_vote(proposal_id, "0xvoter2", "against", "0xsig2")
    db.create_vote(proposal_id, "0xvoter3", "for", "0xsig3")
    
    votes = db.get_votes(proposal_id)
    assert len(votes) == 3


def test_get_vote_counts(db_with_proposal):
    """Test counting votes."""
    db, proposal_id = db_with_proposal
    
    # Cast votes
    db.create_vote(proposal_id, "0xvoter1", "for", "0xsig1")
    db.create_vote(proposal_id, "0xvoter2", "for", "0xsig2")
    db.create_vote(proposal_id, "0xvoter3", "against", "0xsig3")
    
    counts = db.get_vote_counts(proposal_id)
    assert counts["for"] == 2
    assert counts["against"] == 1
    assert counts["total"] == 3


def test_vote_counts_empty(db_with_proposal):
    """Test vote counts for proposal with no votes."""
    db, proposal_id = db_with_proposal
    
    counts = db.get_vote_counts(proposal_id)
    assert counts["for"] == 0
    assert counts["against"] == 0
    assert counts["total"] == 0


def test_mark_votes_synced(db_with_proposal):
    """Test marking votes as synced to chain."""
    db, proposal_id = db_with_proposal
    
    # Create votes
    db.create_vote(proposal_id, "0xvoter1", "for", "0xsig1")
    db.create_vote(proposal_id, "0xvoter2", "against", "0xsig2")
    
    # Mark as synced
    db.mark_votes_synced(proposal_id)
    
    # Verify all votes are synced
    votes = db.get_votes(proposal_id)
    assert all(vote["synced_to_chain"] == 1 for vote in votes)


def test_proposal_timestamps(temp_db):
    """Test that timestamps are properly recorded."""
    end_time = datetime.now() + timedelta(days=7)
    proposal_id = temp_db.create_proposal(
        "Time Test", "Description",
        "0x1234567890123456789012345678901234567890",
        end_time
    )
    
    proposal = temp_db.get_proposal(proposal_id)
    assert "created_at" in proposal
    assert "end_time" in proposal
    
    # Verify created_at is recent
    created_at = datetime.fromisoformat(proposal["created_at"])
    assert (datetime.now() - created_at).total_seconds() < 5


def test_vote_timestamp(db_with_proposal):
    """Test that vote timestamps are properly recorded."""
    db, proposal_id = db_with_proposal
    
    vote_id = db.create_vote(
        proposal_id, "0xvoter1", "for", "0xsig1"
    )
    
    votes = db.get_votes(proposal_id)
    vote = votes[0]
    
    assert "timestamp" in vote
    timestamp = datetime.fromisoformat(vote["timestamp"])
    assert (datetime.now() - timestamp).total_seconds() < 5


def test_multiple_proposals_independent(temp_db):
    """Test that votes are independent between proposals."""
    end_time = datetime.now() + timedelta(days=7)
    
    # Create two proposals
    id1 = temp_db.create_proposal(
        "Proposal 1", "Desc 1",
        "0x1234567890123456789012345678901234567890",
        end_time
    )
    id2 = temp_db.create_proposal(
        "Proposal 2", "Desc 2",
        "0xabcdef0123456789012345678901234567890abc",
        end_time
    )
    
    # Vote on first proposal
    temp_db.create_vote(id1, "0xvoter1", "for", "0xsig1")
    temp_db.create_vote(id1, "0xvoter2", "against", "0xsig2")
    
    # Vote on second proposal
    temp_db.create_vote(id2, "0xvoter3", "for", "0xsig3")
    
    # Check vote counts are independent
    counts1 = temp_db.get_vote_counts(id1)
    counts2 = temp_db.get_vote_counts(id2)
    
    assert counts1["total"] == 2
    assert counts2["total"] == 1
