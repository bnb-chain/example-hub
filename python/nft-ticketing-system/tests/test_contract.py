"""Tests for mock contract."""

import pytest
from mock_contract import MockTicketContract, TICKET_NFT_ABI


@pytest.fixture
def contract():
    """Create a mock contract instance."""
    return MockTicketContract()


def test_contract_initialization(contract):
    """Test contract initialization."""
    assert contract.address is not None
    assert contract.abi == TICKET_NFT_ABI
    assert contract.w3 is not None


def test_mint_ticket(contract):
    """Test minting a ticket."""
    result = contract.mint_ticket(
        to="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        event_id=1,
        token_id=1
    )
    
    assert result["success"]
    assert result["token_id"] == 1
    assert result["event_id"] == 1


def test_mint_invalid_address(contract):
    """Test minting with invalid address."""
    with pytest.raises(ValueError):
        contract.mint_ticket(
            to="invalid_address",
            event_id=1,
            token_id=1
        )


def test_owner_of(contract):
    """Test getting owner of a token."""
    address = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
    
    contract.mint_ticket(to=address, event_id=1, token_id=1)
    
    owner = contract.owner_of(1)
    assert owner.lower() == address.lower()


def test_owner_of_nonexistent(contract):
    """Test getting owner of nonexistent token."""
    owner = contract.owner_of(999)
    assert owner is None


def test_total_supply(contract):
    """Test getting total supply for an event."""
    contract.mint_ticket("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", 1, 1)
    contract.mint_ticket("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", 1, 2)
    
    supply = contract.total_supply(1)
    assert supply == 2


def test_total_supply_empty_event(contract):
    """Test total supply for event with no tickets."""
    supply = contract.total_supply(999)
    assert supply == 0


def test_token_uri(contract):
    """Test getting token URI."""
    contract.mint_ticket("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", 1, 1)
    
    uri = contract.token_uri(1)
    assert "ipfs://" in uri
    assert "event_1" in uri
    assert "ticket_1" in uri


def test_token_uri_nonexistent(contract):
    """Test token URI for nonexistent token."""
    uri = contract.token_uri(999)
    assert uri == ""


def test_get_abi(contract):
    """Test getting contract ABI."""
    abi = contract.get_abi()
    assert isinstance(abi, list)
    assert len(abi) > 0


def test_get_address(contract):
    """Test getting contract address."""
    address = contract.get_address()
    assert address.startswith("0x")
    assert len(address) == 42


def test_multiple_events(contract):
    """Test minting tickets for multiple events."""
    contract.mint_ticket("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", 1, 1)
    contract.mint_ticket("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", 2, 2)
    
    assert contract.total_supply(1) == 1
    assert contract.total_supply(2) == 1
