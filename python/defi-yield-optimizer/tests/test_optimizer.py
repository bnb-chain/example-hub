"""Tests for the optimizer module."""

import pytest
from src.fetcher import MockFetcher
from src.optimizer import YieldOptimizer
from src.strategies import AllocationStrategy


@pytest.fixture
def mock_fetcher():
    """Fixture providing mock fetcher."""
    return MockFetcher(seed=42)


@pytest.fixture
def optimizer(mock_fetcher):
    """Fixture providing optimizer instance."""
    return YieldOptimizer(
        fetcher=mock_fetcher,
        investment_amount=10000.0,
        min_apy_threshold=5.0,
    )


class TestYieldOptimizer:
    """Test cases for YieldOptimizer."""

    def test_initialization(self, mock_fetcher):
        """Test YieldOptimizer initialization."""
        optimizer = YieldOptimizer(
            fetcher=mock_fetcher,
            investment_amount=10000.0,
            min_apy_threshold=5.0,
        )

        assert optimizer.fetcher == mock_fetcher
        assert optimizer.investment_amount == 10000.0
        assert optimizer.min_apy_threshold == 5.0

    def test_optimize_returns_strategies(self, optimizer):
        """Test that optimize returns strategies."""
        strategies = optimizer.optimize(max_strategies=5)

        assert isinstance(strategies, list)
        assert len(strategies) > 0
        assert len(strategies) <= 5
        assert all(isinstance(s, AllocationStrategy) for s in strategies)

    def test_optimize_strategies_sorted_by_apy(self, optimizer):
        """Test that strategies are sorted by expected APY."""
        strategies = optimizer.optimize(max_strategies=10)

        # Verify strategies are sorted descending by APY
        for i in range(len(strategies) - 1):
            assert strategies[i].expected_apy >= strategies[i + 1].expected_apy

    def test_optimize_with_risk_level_filter(self, optimizer):
        """Test optimization with risk level filter."""
        strategies = optimizer.optimize(risk_level="low", max_strategies=5)

        assert isinstance(strategies, list)
        # Should return some strategies (or empty if no low-risk pools meet threshold)
        # We can't guarantee specific behavior without knowing the mock data

    def test_optimize_with_strategy_type_filter(self, optimizer):
        """Test optimization with strategy type filter."""
        single_strategies = optimizer.optimize(
            strategy_types=["single"],
            max_strategies=5,
        )

        assert isinstance(single_strategies, list)
        
        # All strategies should be single-pool
        for strategy in single_strategies:
            assert len(strategy.allocations) == 1

    def test_optimize_with_min_apy_threshold(self, mock_fetcher):
        """Test that APY threshold filters low-yield pools."""
        # High threshold should return fewer strategies
        high_threshold_optimizer = YieldOptimizer(
            fetcher=mock_fetcher,
            investment_amount=10000.0,
            min_apy_threshold=20.0,
        )

        low_threshold_optimizer = YieldOptimizer(
            fetcher=mock_fetcher,
            investment_amount=10000.0,
            min_apy_threshold=5.0,
        )

        high_strategies = high_threshold_optimizer.optimize(
            strategy_types=["single"],
            max_strategies=100,
        )
        low_strategies = low_threshold_optimizer.optimize(
            strategy_types=["single"],
            max_strategies=100,
        )

        # Lower threshold should return more strategies
        assert len(low_strategies) >= len(high_strategies)

    def test_get_best_strategy(self, optimizer):
        """Test getting single best strategy."""
        best = optimizer.get_best_strategy()

        assert best is not None
        assert isinstance(best, AllocationStrategy)

        # Verify it's actually the best by comparing with all strategies
        all_strategies = optimizer.optimize(max_strategies=100)
        if all_strategies:
            assert best.expected_apy == all_strategies[0].expected_apy

    def test_get_best_strategy_with_risk_filter(self, optimizer):
        """Test getting best strategy with risk filter."""
        best_low_risk = optimizer.get_best_strategy(risk_level="low")

        # Should return a strategy or None if no low-risk pools available
        if best_low_risk:
            assert isinstance(best_low_risk, AllocationStrategy)

    def test_compare_protocols(self, optimizer):
        """Test protocol comparison."""
        protocol_stats = optimizer.compare_protocols()

        assert isinstance(protocol_stats, dict)
        assert len(protocol_stats) > 0

        # Check structure of stats
        for protocol, stats in protocol_stats.items():
            assert "avg_apy" in stats
            assert "max_apy" in stats
            assert "min_apy" in stats
            assert "pool_count" in stats
            assert "pools" in stats

            # Verify statistical relationships
            assert stats["max_apy"] >= stats["avg_apy"]
            assert stats["avg_apy"] >= stats["min_apy"]
            assert stats["pool_count"] > 0

    def test_analyze_risk_reward(self, optimizer):
        """Test risk/reward analysis."""
        risk_groups = optimizer.analyze_risk_reward()

        assert isinstance(risk_groups, dict)
        assert "low" in risk_groups
        assert "medium" in risk_groups
        assert "high" in risk_groups

        # Each group should be a list
        for risk_level, yields in risk_groups.items():
            assert isinstance(yields, list)

            # Yields in each group should be sorted by APY
            for i in range(len(yields) - 1):
                assert yields[i].apy >= yields[i + 1].apy

    def test_get_top_pools(self, optimizer):
        """Test getting top pools."""
        top_pools = optimizer.get_top_pools(n=5)

        assert isinstance(top_pools, list)
        assert len(top_pools) <= 5

        # Verify pools are sorted by APY
        for i in range(len(top_pools) - 1):
            assert top_pools[i].apy >= top_pools[i + 1].apy

    def test_get_top_pools_more_than_available(self, optimizer):
        """Test requesting more pools than available."""
        # Request a very large number
        top_pools = optimizer.get_top_pools(n=1000)

        assert isinstance(top_pools, list)
        # Should return all available pools
        assert len(top_pools) > 0
