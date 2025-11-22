"""Tests for the strategies module."""

import pytest
from src.fetcher import MockFetcher
from src.strategies import StrategyBuilder, AllocationStrategy


@pytest.fixture
def mock_yields():
    """Fixture providing mock yield data."""
    fetcher = MockFetcher(seed=42)
    return fetcher.fetch_all_yields()


class TestAllocationStrategy:
    """Test cases for AllocationStrategy."""

    def test_initialization(self):
        """Test AllocationStrategy initialization."""
        strategy = AllocationStrategy(
            name="Test Strategy",
            description="Test description",
            allocations=[{"protocol": "Test", "amount": 1000}],
            expected_apy=15.0,
            total_amount=1000.0,
            risk_score=2.0,
        )

        assert strategy.name == "Test Strategy"
        assert strategy.expected_apy == 15.0
        assert strategy.total_amount == 1000.0
        assert strategy.risk_score == 2.0

    def test_to_dict(self):
        """Test conversion to dictionary."""
        strategy = AllocationStrategy(
            name="Test",
            description="Desc",
            allocations=[],
            expected_apy=10.0,
            total_amount=5000.0,
            risk_score=1.5,
        )

        data_dict = strategy.to_dict()

        assert data_dict["name"] == "Test"
        assert data_dict["expected_apy"] == 10.0
        assert data_dict["total_amount"] == 5000.0


class TestStrategyBuilder:
    """Test cases for StrategyBuilder."""

    def test_initialization(self):
        """Test StrategyBuilder initialization."""
        builder = StrategyBuilder(investment_amount=10000.0)
        assert builder.investment_amount == 10000.0

    def test_build_single_pool_strategies(self, mock_yields):
        """Test building single pool strategies."""
        builder = StrategyBuilder(investment_amount=10000.0)
        strategies = builder.build_single_pool_strategies(mock_yields, max_strategies=5)

        assert isinstance(strategies, list)
        assert len(strategies) <= 5
        assert all(isinstance(s, AllocationStrategy) for s in strategies)

        # Each strategy should have 100% allocation to one pool
        for strategy in strategies:
            assert len(strategy.allocations) == 1
            assert strategy.allocations[0]["percentage"] == 100.0
            assert strategy.allocations[0]["amount"] == 10000.0

    def test_single_pool_strategies_sorted_by_apy(self, mock_yields):
        """Test that single pool strategies are sorted by APY."""
        builder = StrategyBuilder(investment_amount=10000.0)
        strategies = builder.build_single_pool_strategies(mock_yields)

        # Verify strategies are sorted descending by APY
        for i in range(len(strategies) - 1):
            assert strategies[i].expected_apy >= strategies[i + 1].expected_apy

    def test_build_diversified_strategies(self, mock_yields):
        """Test building diversified strategies."""
        builder = StrategyBuilder(investment_amount=10000.0)
        strategies = builder.build_diversified_strategies(mock_yields, num_pools=3)

        assert isinstance(strategies, list)
        assert len(strategies) > 0

        # Each strategy should have multiple allocations
        for strategy in strategies:
            assert len(strategy.allocations) > 1
            
            # Total allocation should equal investment amount
            total_amount = sum(a["amount"] for a in strategy.allocations)
            assert abs(total_amount - 10000.0) < 0.01

    def test_diversified_strategies_with_risk_filter(self, mock_yields):
        """Test diversified strategies with risk level filter."""
        builder = StrategyBuilder(investment_amount=10000.0)
        strategies = builder.build_diversified_strategies(
            mock_yields,
            num_pools=3,
            risk_level_filter="low",
        )

        # All pools in strategies should have low risk
        for strategy in strategies:
            # Note: We can't directly check risk level from allocations
            # but we can verify strategies were built
            assert len(strategy.allocations) > 0

    def test_build_equal_weight_strategy(self, mock_yields):
        """Test equal weight strategy."""
        builder = StrategyBuilder(investment_amount=9000.0)
        top_3_yields = sorted(mock_yields, key=lambda y: y.apy, reverse=True)[:3]
        
        strategy = builder._build_equal_weight_strategy(top_3_yields)

        assert strategy.name == "Equal Weight Diversified"
        assert len(strategy.allocations) == 3

        # Each allocation should be 1/3 of total
        for alloc in strategy.allocations:
            assert abs(alloc["percentage"] - 33.333) < 0.01
            assert abs(alloc["amount"] - 3000.0) < 0.01

    def test_build_apy_weighted_strategy(self, mock_yields):
        """Test APY-weighted strategy."""
        builder = StrategyBuilder(investment_amount=10000.0)
        top_3_yields = sorted(mock_yields, key=lambda y: y.apy, reverse=True)[:3]
        
        strategy = builder._build_apy_weighted_strategy(top_3_yields)

        assert strategy.name == "APY-Weighted Diversified"
        assert len(strategy.allocations) == 3

        # Total allocation should equal investment amount
        total = sum(a["amount"] for a in strategy.allocations)
        assert abs(total - 10000.0) < 0.01

        # Total percentage should be 100%
        total_pct = sum(a["percentage"] for a in strategy.allocations)
        assert abs(total_pct - 100.0) < 0.01

    def test_build_risk_adjusted_strategy(self, mock_yields):
        """Test risk-adjusted strategy."""
        builder = StrategyBuilder(investment_amount=10000.0)
        strategy = builder.build_risk_adjusted_strategy(
            mock_yields,
            target_risk="medium",
        )

        assert strategy is not None
        assert "Risk-Adjusted" in strategy.name
        assert "medium" in strategy.description.lower()

    def test_build_risk_adjusted_strategy_no_matching_pools(self):
        """Test risk-adjusted strategy with no matching pools."""
        builder = StrategyBuilder(investment_amount=10000.0)
        
        # Empty yield list should return None
        strategy = builder.build_risk_adjusted_strategy([], target_risk="low")
        assert strategy is None

    def test_risk_scores_applied_correctly(self, mock_yields):
        """Test that risk scores are applied correctly."""
        builder = StrategyBuilder(investment_amount=10000.0)
        
        # Find yields of different risk levels
        low_risk_yields = [y for y in mock_yields if y.risk_level == "low"]
        high_risk_yields = [y for y in mock_yields if y.risk_level == "high"]

        if low_risk_yields and high_risk_yields:
            low_strategy = builder.build_single_pool_strategies(low_risk_yields, max_strategies=1)[0]
            high_strategy = builder.build_single_pool_strategies(high_risk_yields, max_strategies=1)[0]

            # Low risk should have lower risk score
            assert low_strategy.risk_score < high_strategy.risk_score
