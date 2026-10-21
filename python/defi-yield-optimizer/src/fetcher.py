"""
Data fetchers for DeFi protocol yield information.

Supports two modes:
- MockFetcher: Returns deterministic mock APY data (default, no API calls)
- APIFetcher: Fetches real data from DeFi protocols (requires API keys)
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional
import hashlib


class YieldData:
    """Represents yield data for a DeFi protocol pool."""

    def __init__(
        self,
        protocol: str,
        pool_name: str,
        apy: float,
        tvl: float,
        risk_level: str,
        token_pair: str,
    ):
        """
        Initialize yield data.

        Args:
            protocol: Protocol name (e.g., "PancakeSwap", "Venus")
            pool_name: Name of the pool
            apy: Annual Percentage Yield
            tvl: Total Value Locked in USD
            risk_level: Risk level ("low", "medium", "high")
            token_pair: Token pair (e.g., "BNB-USDT")
        """
        self.protocol = protocol
        self.pool_name = pool_name
        self.apy = apy
        self.tvl = tvl
        self.risk_level = risk_level
        self.token_pair = token_pair

    def __repr__(self):
        return (
            f"YieldData(protocol={self.protocol}, pool={self.pool_name}, "
            f"apy={self.apy:.2f}%, tvl=${self.tvl:,.0f}, risk={self.risk_level})"
        )

    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            "protocol": self.protocol,
            "pool_name": self.pool_name,
            "apy": self.apy,
            "tvl": self.tvl,
            "risk_level": self.risk_level,
            "token_pair": self.token_pair,
        }


class DataFetcher(ABC):
    """Abstract base class for data fetchers."""

    @abstractmethod
    def fetch_all_yields(self) -> List[YieldData]:
        """
        Fetch yield data from all supported protocols.

        Returns:
            List of YieldData objects
        """
        pass

    @abstractmethod
    def fetch_protocol_yields(self, protocol: str) -> List[YieldData]:
        """
        Fetch yield data for a specific protocol.

        Args:
            protocol: Protocol name

        Returns:
            List of YieldData objects for the protocol
        """
        pass


class MockFetcher(DataFetcher):
    """
    Mock data fetcher that returns deterministic yield data.
    
    Perfect for testing and development without requiring API keys or network calls.
    """

    # Mock data for various protocols
    MOCK_PROTOCOLS = {
        "PancakeSwap": [
            ("BNB-USDT LP", "BNB-USDT", "medium", 15000000),
            ("CAKE-BNB LP", "CAKE-BNB", "medium", 8000000),
            ("BTCB-ETH LP", "BTCB-ETH", "low", 5000000),
            ("USDT-BUSD LP", "USDT-BUSD", "low", 12000000),
        ],
        "Venus": [
            ("BNB Supply", "BNB", "low", 50000000),
            ("USDT Supply", "USDT", "low", 80000000),
            ("BTCB Supply", "BTCB", "low", 30000000),
        ],
        "Alpaca": [
            ("BNB-USDT Leveraged", "BNB-USDT", "high", 6000000),
            ("CAKE-BNB Leveraged", "CAKE-BNB", "high", 4000000),
        ],
        "Wombat": [
            ("USDT Pool", "USDT", "low", 25000000),
            ("BUSD Pool", "BUSD", "low", 22000000),
        ],
        "Thena": [
            ("BNB-USDT vAMM", "BNB-USDT", "medium", 7000000),
            ("THE-BNB sAMM", "THE-BNB", "high", 3000000),
        ],
    }

    def __init__(self, seed: int = 42):
        """
        Initialize mock fetcher.

        Args:
            seed: Random seed for deterministic APY generation
        """
        self.seed = seed

    def _generate_apy(self, protocol: str, pool_name: str, risk_level: str) -> float:
        """
        Generate deterministic APY based on protocol, pool, and risk level.

        Args:
            protocol: Protocol name
            pool_name: Pool name
            risk_level: Risk level

        Returns:
            APY percentage (e.g., 15.5 for 15.5%)
        """
        # Create deterministic hash from inputs
        hash_input = f"{protocol}_{pool_name}_{risk_level}_{self.seed}"
        hash_obj = hashlib.md5(hash_input.encode())
        hash_int = int(hash_obj.hexdigest()[:8], 16)

        # Base APY ranges by risk level
        risk_ranges = {
            "low": (3.0, 12.0),
            "medium": (8.0, 25.0),
            "high": (15.0, 50.0),
        }

        min_apy, max_apy = risk_ranges.get(risk_level, (5.0, 20.0))

        # Generate APY within range
        normalized = (hash_int % 10000) / 10000.0
        apy = min_apy + (max_apy - min_apy) * normalized

        return round(apy, 2)

    def fetch_all_yields(self) -> List[YieldData]:
        """
        Fetch mock yield data from all protocols.

        Returns:
            List of YieldData objects with deterministic values
        """
        all_yields = []

        for protocol, pools in self.MOCK_PROTOCOLS.items():
            for pool_name, token_pair, risk_level, tvl in pools:
                apy = self._generate_apy(protocol, pool_name, risk_level)
                
                yield_data = YieldData(
                    protocol=protocol,
                    pool_name=pool_name,
                    apy=apy,
                    tvl=tvl,
                    risk_level=risk_level,
                    token_pair=token_pair,
                )
                
                all_yields.append(yield_data)

        return all_yields

    def fetch_protocol_yields(self, protocol: str) -> List[YieldData]:
        """
        Fetch mock yield data for a specific protocol.

        Args:
            protocol: Protocol name

        Returns:
            List of YieldData objects for the protocol
        """
        if protocol not in self.MOCK_PROTOCOLS:
            return []

        yields = []
        pools = self.MOCK_PROTOCOLS[protocol]

        for pool_name, token_pair, risk_level, tvl in pools:
            apy = self._generate_apy(protocol, pool_name, risk_level)
            
            yield_data = YieldData(
                protocol=protocol,
                pool_name=pool_name,
                apy=apy,
                tvl=tvl,
                risk_level=risk_level,
                token_pair=token_pair,
            )
            
            yields.append(yield_data)

        return yields

    def get_available_protocols(self) -> List[str]:
        """
        Get list of available protocols.

        Returns:
            List of protocol names
        """
        return list(self.MOCK_PROTOCOLS.keys())


class APIFetcher(DataFetcher):
    """
    API-based fetcher for real DeFi protocol data.
    
    Requires:
    - Web3 connection to BSC
    - Protocol API keys (optional)
    
    Install with: pip install web3 requests
    """

    def __init__(
        self,
        rpc_url: str,
        api_keys: Optional[Dict[str, str]] = None,
    ):
        """
        Initialize API fetcher.

        Args:
            rpc_url: BSC RPC endpoint URL
            api_keys: Dictionary of protocol -> API key

        Raises:
            ImportError: If required packages are not installed
        """
        try:
            from web3 import Web3
            import requests
        except ImportError:
            raise ImportError(
                "API fetching requires web3 and requests. "
                "Install with: pip install web3 requests"
            )

        self.rpc_url = rpc_url
        self.api_keys = api_keys or {}
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))

        if not self.w3.is_connected():
            raise ConnectionError(f"Failed to connect to BSC RPC at {rpc_url}")

    def fetch_all_yields(self) -> List[YieldData]:
        """
        Fetch real yield data from all supported protocols.

        Returns:
            List of YieldData objects

        Note:
            This is a stub implementation. In production, you would:
            1. Query each protocol's contracts or APIs
            2. Parse the response data
            3. Calculate or fetch APY values
        """
        # Stub: In production, implement actual API calls
        all_yields = []
        
        # Example: Fetch from PancakeSwap
        pancake_yields = self._fetch_pancakeswap_yields()
        all_yields.extend(pancake_yields)
        
        # Add other protocols...
        
        return all_yields

    def fetch_protocol_yields(self, protocol: str) -> List[YieldData]:
        """
        Fetch real yield data for a specific protocol.

        Args:
            protocol: Protocol name

        Returns:
            List of YieldData objects
        """
        # Stub: Route to appropriate protocol fetcher
        if protocol.lower() == "pancakeswap":
            return self._fetch_pancakeswap_yields()
        
        # Add other protocols...
        
        return []

    def _fetch_pancakeswap_yields(self) -> List[YieldData]:
        """
        Fetch yield data from PancakeSwap.

        Returns:
            List of YieldData objects

        Note:
            This is a stub. In production, implement:
            1. Query MasterChef contract for pool info
            2. Calculate APY from emissions and pool values
            3. Get TVL from pool reserves
        """
        # Stub implementation
        # In production: query contracts, calculate real APYs
        return []


def create_fetcher(
    mode: str = "mock",
    seed: int = 42,
    rpc_url: Optional[str] = None,
    api_keys: Optional[Dict[str, str]] = None,
) -> DataFetcher:
    """
    Factory function to create the appropriate fetcher.

    Args:
        mode: Fetcher mode ("mock" or "api")
        seed: Random seed for mock fetcher
        rpc_url: RPC URL for API fetcher
        api_keys: API keys for protocols

    Returns:
        DataFetcher instance

    Raises:
        ValueError: If mode is not supported
    """
    if mode == "mock":
        return MockFetcher(seed=seed)
    elif mode == "api":
        if not rpc_url:
            raise ValueError("rpc_url is required for api mode")
        return APIFetcher(rpc_url=rpc_url, api_keys=api_keys)
    else:
        raise ValueError(f"Unsupported fetcher mode: {mode}")
