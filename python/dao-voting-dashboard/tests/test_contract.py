"""
Tests for smart contract interactions.
"""

import pytest
from contract import GovernanceContract


@pytest.fixture
def contract():
    """Create a contract instance for testing."""
    return GovernanceContract()


def test_contract_initialization(contract):
    """Test contract initialization."""
    assert contract.w3 is not None
    assert contract.contract_address is not None
    assert len(contract._mock_proposals) == 0


def test_create_proposal(contract):
    """Test creating a proposal on-chain (mock)."""
    proposal_id = contract.create_proposal(
        title="Test Proposal",
        description="Test description",
        end_time=1234567890
    )
    
    assert proposal_id is not None
    assert isinstance(proposal_id, int)
    assert proposal_id > 0


def test_get_proposal(contract):
    """Test retrieving a proposal from chain (mock)."""
    # Create proposal
    proposal_id = contract.create_proposal(
        "Test", "Description", 1234567890
    )
    
    # Get proposal
    proposal = contract.get_proposal(proposal_id)
    
    assert proposal is not None
    assert proposal["title"] == "Test"
    assert proposal["description"] == "Description"
    assert proposal["votesFor"] == 0
    assert proposal["votesAgainst"] == 0
    assert proposal["status"] == 1  # active


def test_get_nonexistent_proposal(contract):
    """Test getting non-existent proposal."""
    proposal = contract.get_proposal(999)
    assert proposal is None


def test_submit_votes(contract):
    """Test submitting votes to chain (mock)."""
    # Create proposal
    proposal_id = contract.create_proposal(
        "Test", "Description", 1234567890
    )
    
    # Submit votes
    success = contract.submit_votes(proposal_id, 10, 5)
    assert success is True
    
    # Verify votes were recorded
    proposal = contract.get_proposal(proposal_id)
    assert proposal["votesFor"] == 10
    assert proposal["votesAgainst"] == 5


def test_submit_votes_nonexistent_proposal(contract):
    """Test submitting votes to non-existent proposal."""
    success = contract.submit_votes(999, 10, 5)
    assert success is False


def test_finalize_proposal(contract):
    """Test finalizing a proposal (mock)."""
    # Create and finalize proposal
    proposal_id = contract.create_proposal(
        "Test", "Description", 1234567890
    )
    contract.submit_votes(proposal_id, 10, 5)
    
    success = contract.finalize_proposal(proposal_id)
    assert success is True
    
    # Check status changed
    proposal = contract.get_proposal(proposal_id)
    assert proposal["status"] == 3  # executed (passed)


def test_finalize_rejected_proposal(contract):
    """Test finalizing a rejected proposal."""
    # Create proposal with more against votes
    proposal_id = contract.create_proposal(
        "Test", "Description", 1234567890
    )
    contract.submit_votes(proposal_id, 5, 10)
    
    success = contract.finalize_proposal(proposal_id)
    assert success is True
    
    # Check status is closed (not executed)
    proposal = contract.get_proposal(proposal_id)
    assert proposal["status"] == 2  # closed


def test_finalize_nonexistent_proposal(contract):
    """Test finalizing non-existent proposal."""
    success = contract.finalize_proposal(999)
    assert success is False


def test_get_abi(contract):
    """Test getting contract ABI."""
    abi = contract.get_abi()
    assert abi is not None
    assert isinstance(abi, list)
    assert len(abi) > 0


def test_get_address(contract):
    """Test getting contract address."""
    address = contract.get_address()
    assert address is not None
    assert isinstance(address, str)
    assert address.startswith("0x")


def test_multiple_proposals(contract):
    """Test creating multiple proposals."""
    id1 = contract.create_proposal("Proposal 1", "Desc 1", 1111111111)
    id2 = contract.create_proposal("Proposal 2", "Desc 2", 2222222222)
    id3 = contract.create_proposal("Proposal 3", "Desc 3", 3333333333)
    
    assert id1 != id2
    assert id2 != id3
    assert id1 < id2 < id3
    
    # Verify all proposals exist
    assert contract.get_proposal(id1) is not None
    assert contract.get_proposal(id2) is not None
    assert contract.get_proposal(id3) is not None


def test_proposal_independence(contract):
    """Test that proposals are independent."""
    id1 = contract.create_proposal("Proposal 1", "Desc 1", 1111111111)
    id2 = contract.create_proposal("Proposal 2", "Desc 2", 2222222222)
    
    # Submit different votes
    contract.submit_votes(id1, 10, 5)
    contract.submit_votes(id2, 3, 7)
    
    # Verify votes are independent
    p1 = contract.get_proposal(id1)
    p2 = contract.get_proposal(id2)
    
    assert p1["votesFor"] == 10
    assert p1["votesAgainst"] == 5
    assert p2["votesFor"] == 3
    assert p2["votesAgainst"] == 7


def test_vote_update(contract):
    """Test updating votes on a proposal."""
    proposal_id = contract.create_proposal(
        "Test", "Description", 1234567890
    )
    
    # Submit initial votes
    contract.submit_votes(proposal_id, 5, 3)
    proposal = contract.get_proposal(proposal_id)
    assert proposal["votesFor"] == 5
    
    # Update votes
    contract.submit_votes(proposal_id, 10, 7)
    proposal = contract.get_proposal(proposal_id)
    assert proposal["votesFor"] == 10
    assert proposal["votesAgainst"] == 7


def test_finalize_no_votes(contract):
    """Test finalizing proposal with no votes."""
    proposal_id = contract.create_proposal(
        "Test", "Description", 1234567890
    )
    
    success = contract.finalize_proposal(proposal_id)
    assert success is True
    
    # Should be closed (no votes = no approval)
    proposal = contract.get_proposal(proposal_id)
    assert proposal["status"] == 2


def test_proposal_initial_state(contract):
    """Test that new proposals have correct initial state."""
    proposal_id = contract.create_proposal(
        "Test", "Description", 1234567890
    )
    
    proposal = contract.get_proposal(proposal_id)
    assert proposal["votesFor"] == 0
    assert proposal["votesAgainst"] == 0
    assert proposal["status"] == 1  # active
