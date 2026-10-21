"""
Tests for Metadata Generator Module
"""

import pytest
from metadata_generator import MetadataGenerator


@pytest.fixture
def generator():
    """Create a metadata generator instance."""
    return MetadataGenerator()


def test_generate_metadata_basic(generator):
    """Test basic metadata generation."""
    metadata = generator.generate_metadata(
        token_id=1,
        state="sunny"
    )
    
    assert metadata["name"] == "Dynamic NFT #1"
    assert "description" in metadata
    assert "image" in metadata
    assert "attributes" in metadata


def test_generate_metadata_with_owner(generator):
    """Test metadata generation with owner."""
    owner = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
    metadata = generator.generate_metadata(
        token_id=1,
        state="sunny",
        owner=owner
    )
    
    # Check if owner is in attributes
    owner_attrs = [attr for attr in metadata["attributes"] if attr["trait_type"] == "Owner"]
    assert len(owner_attrs) == 1
    assert owner_attrs[0]["value"] == owner


def test_generate_metadata_all_states(generator):
    """Test metadata generation for all possible states."""
    states = ["sunny", "rainy", "cloudy", "stormy", "snowy", 
              "bullish", "bearish", "neutral",
              "win", "loss", "draw", "unknown"]
    
    for state in states:
        metadata = generator.generate_metadata(1, state)
        assert metadata is not None
        assert "image" in metadata
        assert "attributes" in metadata


def test_metadata_attributes(generator):
    """Test metadata attributes structure."""
    metadata = generator.generate_metadata(1, "sunny")
    
    attributes = metadata["attributes"]
    assert len(attributes) >= 2
    
    # Check for required attributes
    trait_types = [attr["trait_type"] for attr in attributes]
    assert "Token ID" in trait_types
    assert "Current State" in trait_types


def test_get_image_url(generator):
    """Test getting image URL for state."""
    url = generator.get_image_url("sunny")
    assert url is not None
    assert url.startswith("http")


def test_get_image_url_unknown(generator):
    """Test getting image URL for unknown state."""
    url = generator.get_image_url("invalid_state")
    assert url == generator.IMAGE_URLS["unknown"]


def test_get_state_description(generator):
    """Test getting state description."""
    desc = generator.get_state_description("sunny")
    assert desc is not None
    assert isinstance(desc, str)


def test_get_state_description_unknown(generator):
    """Test getting description for unknown state."""
    desc = generator.get_state_description("invalid_state")
    assert desc == generator.STATE_DESCRIPTIONS["unknown"]


def test_metadata_erc721_compatibility(generator):
    """Test ERC-721 metadata standard compatibility."""
    metadata = generator.generate_metadata(1, "sunny")
    
    # Required fields for ERC-721
    assert "name" in metadata
    assert "description" in metadata
    assert "image" in metadata
    
    # Attributes should be list of dicts with trait_type and value
    assert isinstance(metadata["attributes"], list)
    for attr in metadata["attributes"]:
        assert "trait_type" in attr
        assert "value" in attr
