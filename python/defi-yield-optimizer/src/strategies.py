"""
DeFi yield farming strategies.

Defines different strategy types for allocating funds across protocols.
"""

from typing import Dict, List, Optional
from dataclasses import dataclass


@dataclass
class AllocationStrategy:
    """Represents an allocation strategy across one or more pools."""

    name: str
    description: str
    allocations: List[Dict]  # List of {protocol, pool, amount, percentage}
    expected_apy: float
    total_amount: float
    risk_score: float

    def __repr__(self):
        return (
            f"AllocationStrategy(name={self.name}, "
            f"expected_apy={self.expected_apy:.2f}%, "
            f"risk_score={self.risk_score:.2f})"
        )

    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            "name": self.name,
            "description": self.description,
            "allocations": self.allocations,
            "expected_apy": self.expected_apy,
            "total_amount": self.total_amount,
            "risk_score": self.risk_score,
        }


class StrategyBuilder:
    """Builds different allocation strategies from yield data."""

    # Risk level scores (lower is safer)
    RISK_SCORES = {
        "low": 1.0,
        "medium": 2.0,
        "high": 3.0,
    }

    def __init__(self, investment_amount: float = 10000.0):
        """
        Initialize strategy builder.

        Args:
            investment_amount: Total amount to invest in USD
        """
        self.investment_amount = investment_amount

    def build_single_pool_strategies(
        self,
        yield_data_list: List,
        max_strategies: int = 5,
    ) -> List[AllocationStrategy]:
        """
        Build strategies that allocate 100% to a single pool.

        Args:
            yield_data_list: List of YieldData objects
            max_strategies: Maximum number of strategies to return

        Returns:
            List of AllocationStrategy objects, sorted by expected APY
        """
        strategies = []

        for yield_data in yield_data_list:
            allocation = {
                "protocol": yield_data.protocol,
                "pool": yield_data.pool_name,
                "token_pair": yield_data.token_pair,
                "amount": self.investment_amount,
                "percentage": 100.0,
                "apy": yield_data.apy,
            }

            risk_score = self.RISK_SCORES.get(yield_data.risk_level, 2.0)

            strategy = AllocationStrategy(
                name=f"{yield_data.protocol} - {yield_data.pool_name}",
                description=f"100% allocation to {yield_data.protocol} {yield_data.pool_name}",
                allocations=[allocation],
                expected_apy=yield_data.apy,
                total_amount=self.investment_amount,
                risk_score=risk_score,
            )

            strategies.append(strategy)

        # Sort by APY descending
        strategies.sort(key=lambda s: s.expected_apy, reverse=True)

        return strategies[:max_strategies]

    def build_diversified_strategies(
        self,
        yield_data_list: List,
        num_pools: int = 3,
        risk_level_filter: Optional[str] = None,
    ) -> List[AllocationStrategy]:
        """
        Build diversified strategies across multiple pools.

        Args:
            yield_data_list: List of YieldData objects
            num_pools: Number of pools to diversify across
            risk_level_filter: Optional risk level filter ("low", "medium", "high")

        Returns:
            List of AllocationStrategy objects
        """
        # Filter by risk level if specified
        if risk_level_filter:
            filtered_data = [
                yd for yd in yield_data_list
                if yd.risk_level == risk_level_filter
            ]
        else:
            filtered_data = yield_data_list

        if len(filtered_data) < num_pools:
            num_pools = len(filtered_data)

        if num_pools == 0:
            return []

        # Sort by APY
        sorted_data = sorted(filtered_data, key=lambda yd: yd.apy, reverse=True)

        strategies = []

        # Equal weight strategy
        equal_weight_strategy = self._build_equal_weight_strategy(
            sorted_data[:num_pools]
        )
        strategies.append(equal_weight_strategy)

        # APY-weighted strategy
        apy_weighted_strategy = self._build_apy_weighted_strategy(
            sorted_data[:num_pools]
        )
        strategies.append(apy_weighted_strategy)

        return strategies

    def _build_equal_weight_strategy(
        self,
        yield_data_list: List,
    ) -> AllocationStrategy:
        """
        Build equal-weight diversified strategy.

        Args:
            yield_data_list: List of YieldData objects

        Returns:
            AllocationStrategy with equal allocations
        """
        num_pools = len(yield_data_list)
        amount_per_pool = self.investment_amount / num_pools
        percentage_per_pool = 100.0 / num_pools

        allocations = []
        total_expected_yield = 0.0
        total_risk_score = 0.0

        for yield_data in yield_data_list:
            allocation = {
                "protocol": yield_data.protocol,
                "pool": yield_data.pool_name,
                "token_pair": yield_data.token_pair,
                "amount": amount_per_pool,
                "percentage": percentage_per_pool,
                "apy": yield_data.apy,
            }
            allocations.append(allocation)

            # Calculate weighted contributions
            weight = percentage_per_pool / 100.0
            total_expected_yield += yield_data.apy * weight
            total_risk_score += self.RISK_SCORES.get(yield_data.risk_level, 2.0) * weight

        strategy = AllocationStrategy(
            name="Equal Weight Diversified",
            description=f"Equal allocation across {num_pools} top-performing pools",
            allocations=allocations,
            expected_apy=total_expected_yield,
            total_amount=self.investment_amount,
            risk_score=total_risk_score,
        )

        return strategy

    def _build_apy_weighted_strategy(
        self,
        yield_data_list: List,
    ) -> AllocationStrategy:
        """
        Build APY-weighted strategy (higher APY gets more allocation).

        Args:
            yield_data_list: List of YieldData objects

        Returns:
            AllocationStrategy with APY-weighted allocations
        """
        total_apy = sum(yd.apy for yd in yield_data_list)

        allocations = []
        total_expected_yield = 0.0
        total_risk_score = 0.0

        for yield_data in yield_data_list:
            # Weight by APY
            weight = yield_data.apy / total_apy
            percentage = weight * 100.0
            amount = self.investment_amount * weight

            allocation = {
                "protocol": yield_data.protocol,
                "pool": yield_data.pool_name,
                "token_pair": yield_data.token_pair,
                "amount": amount,
                "percentage": percentage,
                "apy": yield_data.apy,
            }
            allocations.append(allocation)

            # Calculate weighted contributions
            total_expected_yield += yield_data.apy * weight
            total_risk_score += self.RISK_SCORES.get(yield_data.risk_level, 2.0) * weight

        strategy = AllocationStrategy(
            name="APY-Weighted Diversified",
            description=f"APY-weighted allocation across {len(yield_data_list)} pools (higher APY = larger allocation)",
            allocations=allocations,
            expected_apy=total_expected_yield,
            total_amount=self.investment_amount,
            risk_score=total_risk_score,
        )

        return strategy

    def build_risk_adjusted_strategy(
        self,
        yield_data_list: List,
        target_risk: str = "medium",
    ) -> Optional[AllocationStrategy]:
        """
        Build strategy optimized for specific risk level.

        Args:
            yield_data_list: List of YieldData objects
            target_risk: Target risk level ("low", "medium", "high")

        Returns:
            AllocationStrategy optimized for risk level, or None
        """
        # Filter by target risk level
        filtered_data = [
            yd for yd in yield_data_list
            if yd.risk_level == target_risk
        ]

        if not filtered_data:
            return None

        # Sort by APY and take top pools
        sorted_data = sorted(filtered_data, key=lambda yd: yd.apy, reverse=True)
        top_pools = sorted_data[:3]  # Use top 3 pools

        if not top_pools:
            return None

        # Build equal weight strategy from filtered pools
        strategy = self._build_equal_weight_strategy(top_pools)
        strategy.name = f"Risk-Adjusted ({target_risk.title()})"
        strategy.description = (
            f"Optimized for {target_risk} risk, "
            f"equal allocation across top {len(top_pools)} pools"
        )

        return strategy
