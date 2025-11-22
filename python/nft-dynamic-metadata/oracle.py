"""
Mock Oracle Service

Simulates external data sources for dynamic NFT updates.
Provides weather, price feed, and sports score data.
"""

import random
from typing import Dict, List
from datetime import datetime


class MockOracle:
    """Simulates oracle data feeds for dynamic NFTs."""
    
    # Mock data pools
    WEATHER_CONDITIONS = ["sunny", "rainy", "cloudy", "stormy", "snowy"]
    PRICE_TRENDS = ["bullish", "bearish", "neutral"]
    SPORTS_OUTCOMES = ["win", "loss", "draw"]
    
    def __init__(self, oracle_type: str = "weather"):
        """
        Initialize the mock oracle.
        
        Args:
            oracle_type: Type of oracle ("weather", "price", "sports")
        """
        self.oracle_type = oracle_type
        self._state_index = 0  # For deterministic cycling in tests
    
    def fetch_data(self) -> Dict:
        """
        Fetch mock oracle data.
        
        Returns:
            Dict containing oracle data and metadata
        """
        if self.oracle_type == "weather":
            return self._fetch_weather()
        elif self.oracle_type == "price":
            return self._fetch_price()
        elif self.oracle_type == "sports":
            return self._fetch_sports()
        else:
            return self._fetch_weather()
    
    def _fetch_weather(self) -> Dict:
        """Fetch mock weather data."""
        condition = random.choice(self.WEATHER_CONDITIONS)
        temp = random.randint(-10, 40)
        
        return {
            "oracle_type": "weather",
            "condition": condition,
            "temperature": temp,
            "timestamp": datetime.now().isoformat(),
            "state": condition
        }
    
    def _fetch_price(self) -> Dict:
        """Fetch mock price feed data."""
        price = round(random.uniform(100, 5000), 2)
        change_24h = round(random.uniform(-15, 15), 2)
        
        if change_24h > 5:
            trend = "bullish"
        elif change_24h < -5:
            trend = "bearish"
        else:
            trend = "neutral"
        
        return {
            "oracle_type": "price",
            "asset": "BNB",
            "price": price,
            "change_24h": change_24h,
            "trend": trend,
            "timestamp": datetime.now().isoformat(),
            "state": trend
        }
    
    def _fetch_sports(self) -> Dict:
        """Fetch mock sports score data."""
        outcome = random.choice(self.SPORTS_OUTCOMES)
        home_score = random.randint(0, 5)
        away_score = random.randint(0, 5)
        
        if home_score > away_score:
            result = "win"
        elif home_score < away_score:
            result = "loss"
        else:
            result = "draw"
        
        return {
            "oracle_type": "sports",
            "home_score": home_score,
            "away_score": away_score,
            "outcome": result,
            "timestamp": datetime.now().isoformat(),
            "state": result
        }
    
    def determine_state(self, data: Dict) -> str:
        """
        Determine the NFT state based on oracle data.
        
        Args:
            data: Oracle data dict
            
        Returns:
            State string for the NFT
        """
        return data.get("state", "unknown")
    
    def get_cycling_state(self) -> str:
        """
        Get a deterministic cycling state (useful for testing).
        
        Returns:
            State string that cycles through available states
        """
        if self.oracle_type == "weather":
            states = self.WEATHER_CONDITIONS
        elif self.oracle_type == "price":
            states = self.PRICE_TRENDS
        elif self.oracle_type == "sports":
            states = self.SPORTS_OUTCOMES
        else:
            states = self.WEATHER_CONDITIONS
        
        state = states[self._state_index % len(states)]
        self._state_index += 1
        return state


class OracleService:
    """Service to manage multiple oracles and update tokens."""
    
    def __init__(self, oracle_type: str = "weather"):
        """
        Initialize the oracle service.
        
        Args:
            oracle_type: Type of oracle to use
        """
        self.oracle = MockOracle(oracle_type)
    
    def update_all_tokens(self, token_ids: List[int]) -> Dict[int, str]:
        """
        Fetch oracle data and determine new states for all tokens.
        
        Args:
            token_ids: List of token IDs to update
            
        Returns:
            Dict mapping token_id to new state
        """
        updates = {}
        
        for token_id in token_ids:
            data = self.oracle.fetch_data()
            new_state = self.oracle.determine_state(data)
            updates[token_id] = new_state
        
        return updates
    
    def get_latest_data(self) -> Dict:
        """
        Get the latest oracle data without updating tokens.
        
        Returns:
            Latest oracle data dict
        """
        return self.oracle.fetch_data()
