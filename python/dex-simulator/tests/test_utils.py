"""
Tests for utility functions.
"""

from src.utils import (
    load_config,
    format_price,
    format_quantity,
    format_percentage,
    validate_price,
    validate_quantity,
)


class TestConfigLoading:
    """Test configuration loading."""
    
    def test_load_config_defaults(self):
        """Test loading config with defaults."""
        config = load_config()
        
        assert "INITIAL_PRICE" in config
        assert "NUM_TRADERS" in config
        assert "NUM_STEPS" in config
        assert float(config["INITIAL_PRICE"]) > 0
        assert int(config["NUM_TRADERS"]) > 0
        assert int(config["NUM_STEPS"]) > 0


class TestFormatting:
    """Test formatting functions."""
    
    def test_format_price(self):
        """Test price formatting."""
        assert format_price(100.0) == "$100.00"
        assert format_price(99.99) == "$99.99"
        assert format_price(0.01) == "$0.01"
        assert format_price(None) == "MARKET"
    
    def test_format_quantity(self):
        """Test quantity formatting."""
        assert format_quantity(10.0) == "10.00"
        assert format_quantity(10.5) == "10.50"
        assert format_quantity(0.01) == "0.01"
    
    def test_format_percentage(self):
        """Test percentage formatting."""
        assert format_percentage(0.05) == "5.00%"
        assert format_percentage(0.1) == "10.00%"
        assert format_percentage(0.001) == "0.10%"
        assert format_percentage(-0.05) == "-5.00%"


class TestValidation:
    """Test validation functions."""
    
    def test_validate_price(self):
        """Test price validation."""
        assert validate_price(100.0) is True
        assert validate_price(0.01) is True
        assert validate_price(None) is True
        assert validate_price(0.0) is False
        assert validate_price(-1.0) is False
    
    def test_validate_quantity(self):
        """Test quantity validation."""
        assert validate_quantity(10.0) is True
        assert validate_quantity(0.01) is True
        assert validate_quantity(0.0) is False
        assert validate_quantity(-1.0) is False
