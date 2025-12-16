"""
Tests for Oracle Service Module
"""

import pytest
from oracle import MockOracle, OracleService


def test_mock_oracle_weather():
    """Test weather oracle."""
    oracle = MockOracle("weather")
    data = oracle.fetch_data()
    
    assert data["oracle_type"] == "weather"
    assert "condition" in data
    assert data["condition"] in MockOracle.WEATHER_CONDITIONS
    assert "temperature" in data
    assert "state" in data


def test_mock_oracle_price():
    """Test price feed oracle."""
    oracle = MockOracle("price")
    data = oracle.fetch_data()
    
    assert data["oracle_type"] == "price"
    assert "price" in data
    assert "trend" in data
    assert data["trend"] in MockOracle.PRICE_TRENDS
    assert "state" in data


def test_mock_oracle_sports():
    """Test sports oracle."""
    oracle = MockOracle("sports")
    data = oracle.fetch_data()
    
    assert data["oracle_type"] == "sports"
    assert "outcome" in data
    assert data["outcome"] in MockOracle.SPORTS_OUTCOMES
    assert "state" in data


def test_determine_state():
    """Test state determination."""
    oracle = MockOracle("weather")
    data = {"state": "sunny", "condition": "sunny"}
    
    state = oracle.determine_state(data)
    assert state == "sunny"


def test_cycling_state_weather():
    """Test cycling through weather states."""
    oracle = MockOracle("weather")
    states = []
    
    for _ in range(len(MockOracle.WEATHER_CONDITIONS)):
        state = oracle.get_cycling_state()
        states.append(state)
    
    # Should have all weather conditions
    assert set(states) == set(MockOracle.WEATHER_CONDITIONS)


def test_cycling_state_price():
    """Test cycling through price states."""
    oracle = MockOracle("price")
    states = []
    
    for _ in range(len(MockOracle.PRICE_TRENDS)):
        state = oracle.get_cycling_state()
        states.append(state)
    
    # Should have all price trends
    assert set(states) == set(MockOracle.PRICE_TRENDS)


def test_oracle_service_initialization():
    """Test oracle service initialization."""
    service = OracleService("weather")
    assert service.oracle.oracle_type == "weather"


def test_oracle_service_update_tokens():
    """Test updating multiple tokens."""
    service = OracleService("weather")
    token_ids = [1, 2, 3]
    
    updates = service.update_all_tokens(token_ids)
    
    assert len(updates) == 3
    for token_id in token_ids:
        assert token_id in updates
        assert updates[token_id] in MockOracle.WEATHER_CONDITIONS


def test_oracle_service_get_latest_data():
    """Test getting latest oracle data."""
    service = OracleService("price")
    data = service.get_latest_data()
    
    assert data is not None
    assert "oracle_type" in data
    assert data["oracle_type"] == "price"
