"""
Utility functions for the DEX simulator.

Provides configuration loading, formatting, and helper utilities.
"""

import os
from typing import Dict, Any, Optional


def load_config() -> Dict[str, str]:
    """
    Load configuration from .env file.
    
    Returns:
        Dictionary of configuration values
    """
    config = {}
    
    # Try to load from .env file
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    config[key.strip()] = value.strip()
    
    # Set defaults if not in config
    defaults = {
        "INITIAL_PRICE": "100.0",
        "NUM_TRADERS": "5",
        "NUM_STEPS": "100",
        "MIN_ORDER_SIZE": "1.0",
        "MAX_ORDER_SIZE": "50.0",
        "PRICE_VOLATILITY": "0.02",
    }
    
    for key, value in defaults.items():
        if key not in config:
            config[key] = value
    
    return config


def format_price(price: Optional[float]) -> str:
    """
    Format price for display.
    
    Args:
        price: Price to format
    
    Returns:
        Formatted price string
    """
    if price is None:
        return "MARKET"
    return f"${price:.2f}"


def format_quantity(quantity: float) -> str:
    """
    Format quantity for display.
    
    Args:
        quantity: Quantity to format
    
    Returns:
        Formatted quantity string
    """
    return f"{quantity:.2f}"


def format_percentage(value: float) -> str:
    """
    Format percentage for display.
    
    Args:
        value: Percentage value (0.05 = 5%)
    
    Returns:
        Formatted percentage string
    """
    return f"{value * 100:.2f}%"


def validate_price(price: Optional[float]) -> bool:
    """
    Validate price value.
    
    Args:
        price: Price to validate
    
    Returns:
        True if valid
    """
    if price is None:
        return True
    return price > 0


def validate_quantity(quantity: float) -> bool:
    """
    Validate quantity value.
    
    Args:
        quantity: Quantity to validate
    
    Returns:
        True if valid
    """
    return quantity > 0
