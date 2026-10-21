"""
Yield optimizer that selects optimal DeFi farming strategies.
"""

from typing import List, Optional, Dict
from src.fetcher import DataFetcher, YieldData
from src.strategies import StrategyBuilder, AllocationStrategy


class YieldOptimizer:
    """
    Main optimizer for DeFi yield farming strategies.
    
    Analyzes available pools and recommends optimal allocation strategies.
    """

    def __init__(
        self,
        fetcher: DataFetcher,
        investment_amount: float = 10000.0,
        min_apy_threshold: float = 0.0,
    ):
        """
        Initialize the yield optimizer.

        Args:
            fetcher: DataFetcher instance for getting yield data
            investment_amount: Total amount to invest in USD
            min_apy_threshold: Minimum APY to consider (filters out low yields)
        """
        self.fetcher = fetcher
        self.investment_amount = investment_amount
        self.min_apy_threshold = min_apy_threshold
        self.strategy_builder = StrategyBuilder(investment_amount)

    def optimize(
        self,
        strategy_types: Optional[List[str]] = None,
        risk_level: Optional[str] = None,
        max_strategies: int = 5,
    ) -> List[AllocationStrategy]:
        """
        Find optimal yield farming strategies.

        Args:
            strategy_types: List of strategy types to generate
                           ("single", "diversified", "risk_adjusted")
                           If None, generates all types
            risk_level: Optional risk level filter ("low", "medium", "high")
            max_strategies: Maximum number of strategies to return

        Returns:
            List of AllocationStrategy objects, sorted by expected APY
        """
        # Fetch all available yields
        all_yields = self.fetcher.fetch_all_yields()

        # Filter by APY threshold
        filtered_yields = [
            yd for yd in all_yields
            if yd.apy >= self.min_apy_threshold
        ]

        # Filter by risk level if specified
        if risk_level:
            filtered_yields = [
                yd for yd in filtered_yields
                if yd.risk_level == risk_level
            ]

        if not filtered_yields:
            return []

        # Determine which strategy types to generate
        if strategy_types is None:
            strategy_types = ["single", "diversified", "risk_adjusted"]

        all_strategies = []

        # Generate single pool strategies
        if "single" in strategy_types:
            single_strategies = self.strategy_builder.build_single_pool_strategies(
                filtered_yields,
                max_strategies=max_strategies,
            )
            all_strategies.extend(single_strategies)

        # Generate diversified strategies
        if "diversified" in strategy_types:
            diversified_strategies = self.strategy_builder.build_diversified_strategies(
                filtered_yields,
                num_pools=3,
                risk_level_filter=risk_level,
            )
            all_strategies.extend(diversified_strategies)

        # Generate risk-adjusted strategies
        if "risk_adjusted" in strategy_types:
            for risk in ["low", "medium", "high"]:
                if risk_level and risk != risk_level:
                    continue
                
                risk_strategy = self.strategy_builder.build_risk_adjusted_strategy(
                    filtered_yields,
                    target_risk=risk,
                )
                if risk_strategy:
                    all_strategies.append(risk_strategy)

        # Sort by expected APY (descending) and limit results
        all_strategies.sort(key=lambda s: s.expected_apy, reverse=True)
        
        return all_strategies[:max_strategies]

    def get_best_strategy(
        self,
        risk_level: Optional[str] = None,
    ) -> Optional[AllocationStrategy]:
        """
        Get the single best strategy based on expected APY.

        Args:
            risk_level: Optional risk level filter

        Returns:
            Best AllocationStrategy or None if no strategies available
        """
        strategies = self.optimize(risk_level=risk_level, max_strategies=1)
        return strategies[0] if strategies else None

    def compare_protocols(self) -> Dict[str, Dict]:
        """
        Compare average APY across different protocols.

        Returns:
            Dictionary mapping protocol -> stats (avg_apy, max_apy, pool_count)
        """
        all_yields = self.fetcher.fetch_all_yields()

        protocol_stats = {}

        for yield_data in all_yields:
            protocol = yield_data.protocol

            if protocol not in protocol_stats:
                protocol_stats[protocol] = {
                    "apys": [],
                    "pools": [],
                }

            protocol_stats[protocol]["apys"].append(yield_data.apy)
            protocol_stats[protocol]["pools"].append(yield_data.pool_name)

        # Calculate statistics
        result = {}
        for protocol, data in protocol_stats.items():
            apys = data["apys"]
            result[protocol] = {
                "avg_apy": sum(apys) / len(apys),
                "max_apy": max(apys),
                "min_apy": min(apys),
                "pool_count": len(apys),
                "pools": data["pools"],
            }

        return result

    def analyze_risk_reward(self) -> Dict[str, List[YieldData]]:
        """
        Analyze yield opportunities by risk level.

        Returns:
            Dictionary mapping risk_level -> list of YieldData objects
        """
        all_yields = self.fetcher.fetch_all_yields()

        risk_groups = {
            "low": [],
            "medium": [],
            "high": [],
        }

        for yield_data in all_yields:
            risk_level = yield_data.risk_level
            if risk_level in risk_groups:
                risk_groups[risk_level].append(yield_data)

        # Sort each group by APY
        for risk_level in risk_groups:
            risk_groups[risk_level].sort(key=lambda yd: yd.apy, reverse=True)

        return risk_groups

    def get_top_pools(self, n: int = 10) -> List[YieldData]:
        """
        Get top N pools by APY.

        Args:
            n: Number of pools to return

        Returns:
            List of top YieldData objects sorted by APY
        """
        all_yields = self.fetcher.fetch_all_yields()
        sorted_yields = sorted(all_yields, key=lambda yd: yd.apy, reverse=True)
        return sorted_yields[:n]
