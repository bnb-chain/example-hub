"""Tests for the data fetcher module."""

import pytest
from src.fetcher import MockFetcher, YieldData, create_fetcher


class TestYieldData:
    """Test cases for YieldData class."""

    def test_initialization(self):
        """Test YieldData initialization."""
        yd = YieldData(
            protocol="PancakeSwap",
            pool_name="BNB-USDT LP",
            apy=15.5,
            tvl=10000000,
            risk_level="medium",
            token_pair="BNB-USDT",
        )

        assert yd.protocol == "PancakeSwap"
        assert yd.pool_name == "BNB-USDT LP"
        assert yd.apy == 15.5
        assert yd.tvl == 10000000
        assert yd.risk_level == "medium"
        assert yd.token_pair == "BNB-USDT"

    def test_to_dict(self):
        """Test conversion to dictionary."""
        yd = YieldData(
            protocol="Venus",
            pool_name="BNB Supply",
            apy=8.2,
            tvl=50000000,
            risk_level="low",
            token_pair="BNB",
        )

        data_dict = yd.to_dict()

        assert data_dict["protocol"] == "Venus"
        assert data_dict["pool_name"] == "BNB Supply"
        assert data_dict["apy"] == 8.2
        assert data_dict["tvl"] == 50000000
        assert data_dict["risk_level"] == "low"
        assert data_dict["token_pair"] == "BNB"


class TestMockFetcher:
    """Test cases for MockFetcher."""

    def test_initialization(self):
        """Test MockFetcher initialization."""
        fetcher = MockFetcher(seed=42)
        assert fetcher.seed == 42

    def test_fetch_all_yields_returns_data(self):
        """Test that fetch_all_yields returns yield data."""
        fetcher = MockFetcher(seed=42)
        yields = fetcher.fetch_all_yields()

        assert isinstance(yields, list)
        assert len(yields) > 0
        assert all(isinstance(yd, YieldData) for yd in yields)

    def test_fetch_all_yields_is_deterministic(self):
        """Test that same seed produces same results."""
        fetcher1 = MockFetcher(seed=42)
        fetcher2 = MockFetcher(seed=42)

        yields1 = fetcher1.fetch_all_yields()
        yields2 = fetcher2.fetch_all_yields()

        assert len(yields1) == len(yields2)
        
        for y1, y2 in zip(yields1, yields2):
            assert y1.protocol == y2.protocol
            assert y1.pool_name == y2.pool_name
            assert y1.apy == y2.apy

    def test_fetch_all_yields_different_seeds_produce_different_apys(self):
        """Test that different seeds produce different APYs."""
        fetcher1 = MockFetcher(seed=1)
        fetcher2 = MockFetcher(seed=2)

        yields1 = fetcher1.fetch_all_yields()
        yields2 = fetcher2.fetch_all_yields()

        # At least some APYs should be different
        apys1 = [y.apy for y in yields1]
        apys2 = [y.apy for y in yields2]
        assert apys1 != apys2

    def test_fetch_protocol_yields(self):
        """Test fetching yields for specific protocol."""
        fetcher = MockFetcher(seed=42)
        pancake_yields = fetcher.fetch_protocol_yields("PancakeSwap")

        assert isinstance(pancake_yields, list)
        assert len(pancake_yields) > 0
        assert all(yd.protocol == "PancakeSwap" for yd in pancake_yields)

    def test_fetch_protocol_yields_invalid_protocol(self):
        """Test fetching yields for invalid protocol returns empty list."""
        fetcher = MockFetcher(seed=42)
        yields = fetcher.fetch_protocol_yields("InvalidProtocol")

        assert isinstance(yields, list)
        assert len(yields) == 0

    def test_get_available_protocols(self):
        """Test getting list of available protocols."""
        fetcher = MockFetcher(seed=42)
        protocols = fetcher.get_available_protocols()

        assert isinstance(protocols, list)
        assert len(protocols) > 0
        assert "PancakeSwap" in protocols
        assert "Venus" in protocols

    def test_apy_ranges_by_risk_level(self):
        """Test that APYs fall within expected ranges for risk levels."""
        fetcher = MockFetcher(seed=42)
        yields = fetcher.fetch_all_yields()

        for yd in yields:
            if yd.risk_level == "low":
                assert 3.0 <= yd.apy <= 12.0
            elif yd.risk_level == "medium":
                assert 8.0 <= yd.apy <= 25.0
            elif yd.risk_level == "high":
                assert 15.0 <= yd.apy <= 50.0


class TestCreateFetcher:
    """Test cases for fetcher factory function."""

    def test_create_mock_fetcher(self):
        """Test creating mock fetcher."""
        fetcher = create_fetcher(mode="mock", seed=42)
        assert isinstance(fetcher, MockFetcher)
        assert fetcher.seed == 42

    def test_create_fetcher_default_mode(self):
        """Test that default mode is mock."""
        fetcher = create_fetcher()
        assert isinstance(fetcher, MockFetcher)

    def test_create_fetcher_invalid_mode_raises_error(self):
        """Test that invalid mode raises ValueError."""
        with pytest.raises(ValueError, match="Unsupported fetcher mode"):
            create_fetcher(mode="invalid")
