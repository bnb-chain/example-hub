"""Tests for the utils module."""

import pytest
import json
from pathlib import Path
from src.utils import (
    ensure_output_dir,
    format_currency,
    format_percentage,
    save_strategies_json,
    load_strategies_json,
)
from src.strategies import AllocationStrategy


class TestUtilityFunctions:
    """Test cases for utility functions."""

    def test_ensure_output_dir_creates_directory(self, tmp_path):
        """Test that ensure_output_dir creates directory."""
        output_dir = tmp_path / "test_output"
        
        result = ensure_output_dir(str(output_dir))
        
        assert output_dir.exists()
        assert output_dir.is_dir()
        assert isinstance(result, Path)

    def test_ensure_output_dir_with_existing_directory(self, tmp_path):
        """Test ensure_output_dir with existing directory."""
        output_dir = tmp_path / "existing"
        output_dir.mkdir()
        
        result = ensure_output_dir(str(output_dir))
        
        assert output_dir.exists()
        assert isinstance(result, Path)

    def test_format_currency(self):
        """Test currency formatting."""
        assert format_currency(1000.0) == "$1,000.00"
        assert format_currency(1234567.89) == "$1,234,567.89"
        assert format_currency(0.0) == "$0.00"
        assert format_currency(99.99) == "$99.99"

    def test_format_percentage(self):
        """Test percentage formatting."""
        assert format_percentage(15.5) == "15.50%"
        assert format_percentage(100.0) == "100.00%"
        assert format_percentage(0.12) == "0.12%"
        assert format_percentage(7) == "7.00%"

    def test_save_and_load_strategies_json(self, tmp_path):
        """Test saving and loading strategies to/from JSON."""
        # Create test strategies
        strategy1 = AllocationStrategy(
            name="Test Strategy 1",
            description="Test description 1",
            allocations=[
                {
                    "protocol": "PancakeSwap",
                    "pool": "BNB-USDT",
                    "amount": 5000.0,
                    "percentage": 100.0,
                }
            ],
            expected_apy=15.5,
            total_amount=5000.0,
            risk_score=2.0,
        )

        strategy2 = AllocationStrategy(
            name="Test Strategy 2",
            description="Test description 2",
            allocations=[
                {
                    "protocol": "Venus",
                    "pool": "BNB Supply",
                    "amount": 3000.0,
                    "percentage": 100.0,
                }
            ],
            expected_apy=8.2,
            total_amount=3000.0,
            risk_score=1.0,
        )

        strategies = [strategy1, strategy2]

        # Save to temp file
        output_path = tmp_path / "strategies.json"
        save_strategies_json(strategies, str(output_path))

        assert output_path.exists()

        # Load and verify
        loaded_strategies = load_strategies_json(str(output_path))

        assert len(loaded_strategies) == 2
        assert loaded_strategies[0]["name"] == "Test Strategy 1"
        assert loaded_strategies[1]["name"] == "Test Strategy 2"
        assert loaded_strategies[0]["expected_apy"] == 15.5
        assert loaded_strategies[1]["expected_apy"] == 8.2

    def test_save_strategies_creates_directory(self, tmp_path):
        """Test that save_strategies_json creates necessary directories."""
        nested_path = tmp_path / "a" / "b" / "strategies.json"
        
        strategy = AllocationStrategy(
            name="Test",
            description="Test",
            allocations=[],
            expected_apy=10.0,
            total_amount=1000.0,
            risk_score=1.5,
        )

        save_strategies_json([strategy], str(nested_path))

        assert nested_path.exists()
        assert nested_path.parent.exists()

    def test_load_strategies_empty_file(self, tmp_path):
        """Test loading strategies from file with no strategies."""
        output_path = tmp_path / "empty.json"
        
        # Create empty strategies file
        with open(output_path, "w") as f:
            json.dump({"strategies": [], "count": 0}, f)

        loaded = load_strategies_json(str(output_path))

        assert isinstance(loaded, list)
        assert len(loaded) == 0
