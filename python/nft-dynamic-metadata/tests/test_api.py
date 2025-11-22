"""
Tests for FastAPI Application
"""

import pytest
from httpx import AsyncClient, ASGITransport
import os

# Set test environment before importing app
os.environ["DATABASE_PATH"] = "./test_api_nft_data.json"

from app import app, db


@pytest.fixture(autouse=True)
def setup_test_env():
    """Setup test environment."""
    test_db_path = "./test_api_nft_data.json"
    
    # Clean database before each test
    db.clear_all()
    
    yield
    
    # Cleanup after test
    db.clear_all()


@pytest.mark.asyncio
async def test_health_check():
    """Test health check endpoint."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_mint_token():
    """Test minting a token."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/mint",
            json={
                "owner": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
                "initial_state": "sunny"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "token" in data
        assert data["token"]["token_id"] == 1


@pytest.mark.asyncio
async def test_get_metadata():
    """Test getting token metadata."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # First mint a token
        await client.post(
            "/api/mint",
            json={"owner": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}
        )
        
        # Get metadata
        response = await client.get("/api/metadata/1")
        assert response.status_code == 200
        
        metadata = response.json()
        assert "name" in metadata
        assert "description" in metadata
        assert "image" in metadata
        assert "attributes" in metadata


@pytest.mark.asyncio
async def test_get_metadata_not_found():
    """Test getting metadata for non-existent token."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/metadata/999")
        assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_tokens():
    """Test listing all tokens."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Mint some tokens
        await client.post("/api/mint", json={"owner": "0xAddress1"})
        await client.post("/api/mint", json={"owner": "0xAddress2"})
        
        # List tokens
        response = await client.get("/api/tokens")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["count"] == 2
        assert len(data["tokens"]) == 2


@pytest.mark.asyncio
async def test_oracle_update():
    """Test oracle update endpoint."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Mint tokens first
        await client.post("/api/mint", json={"owner": "0xAddress1"})
        await client.post("/api/mint", json={"owner": "0xAddress2"})
        
        # Update oracle
        response = await client.post(
            "/api/oracle/update",
            json={"oracle_type": "weather"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["updated_count"] == 2


@pytest.mark.asyncio
async def test_oracle_update_empty():
    """Test oracle update with no tokens."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/oracle/update",
            json={"oracle_type": "weather"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["updated_count"] == 0


@pytest.mark.asyncio
async def test_get_oracle_data():
    """Test getting oracle data."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/oracle/data")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "oracle_data" in data
        assert "oracle_type" in data["oracle_data"]


@pytest.mark.asyncio
async def test_home_page():
    """Test home page renders."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/")
        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]
