"""
Utility functions for configuration and output formatting.
"""

import os
import json
from pathlib import Path
from typing import Dict, Any, List
from dotenv import load_dotenv


def load_config(env_file: str = ".env") -> Dict[str, Any]:
    """
    Load configuration from environment file.

    Args:
        env_file: Path to .env file

    Returns:
        Dictionary of configuration values
    """
    load_dotenv(env_file)

    config = {
        "fetcher_mode": os.getenv("FETCHER_MODE", "mock"),
        "bsc_rpc_url": os.getenv("BSC_RPC_URL", "https://bsc-dataseed.binance.org/"),
        "pancakeswap_api_key": os.getenv("PANCAKESWAP_API_KEY"),
        "aave_api_key": os.getenv("AAVE_API_KEY"),
        "default_investment_amount": float(os.getenv("DEFAULT_INVESTMENT_AMOUNT", "10000")),
        "default_risk_level": os.getenv("DEFAULT_RISK_LEVEL", "medium"),
        "max_protocols": int(os.getenv("MAX_PROTOCOLS", "5")),
        "min_apy_threshold": float(os.getenv("MIN_APY_THRESHOLD", "5.0")),
        "output_dir": os.getenv("OUTPUT_DIR", "outputs"),
        "show_detailed_report": os.getenv("SHOW_DETAILED_REPORT", "true").lower() == "true",
    }

    return config


def ensure_output_dir(output_dir: str) -> Path:
    """
    Ensure output directory exists.

    Args:
        output_dir: Path to output directory

    Returns:
        Path object for the directory
    """
    path = Path(output_dir)
    path.mkdir(parents=True, exist_ok=True)
    return path


def format_currency(amount: float) -> str:
    """
    Format amount as currency string.

    Args:
        amount: Amount in USD

    Returns:
        Formatted string (e.g., "$10,000.00")
    """
    return f"${amount:,.2f}"


def format_percentage(value: float) -> str:
    """
    Format value as percentage string.

    Args:
        value: Percentage value

    Returns:
        Formatted string (e.g., "15.50%")
    """
    return f"{value:.2f}%"


def print_strategy_report(strategies: List, detailed: bool = True) -> None:
    """
    Print formatted report of strategies.

    Args:
        strategies: List of AllocationStrategy objects
        detailed: Whether to show detailed allocation breakdown
    """
    if not strategies:
        print("\n⚠️  No strategies found matching the criteria.\n")
        return

    print("\n" + "="*80)
    print("🎯 OPTIMAL YIELD FARMING STRATEGIES")
    print("="*80 + "\n")

    for i, strategy in enumerate(strategies, 1):
        print(f"\n{'─'*80}")
        print(f"Strategy #{i}: {strategy.name}")
        print(f"{'─'*80}")
        print(f"Expected APY: {format_percentage(strategy.expected_apy)}")
        print(f"Total Investment: {format_currency(strategy.total_amount)}")
        print(f"Risk Score: {strategy.risk_score:.2f}/3.00")
        print(f"Description: {strategy.description}")

        if detailed:
            print(f"\nAllocation Breakdown:")
            for j, alloc in enumerate(strategy.allocations, 1):
                print(f"  {j}. {alloc['protocol']} - {alloc['pool']}")
                print(f"     • Token Pair: {alloc['token_pair']}")
                print(f"     • Amount: {format_currency(alloc['amount'])} ({format_percentage(alloc['percentage'])})")
                print(f"     • Pool APY: {format_percentage(alloc['apy'])}")

        # Calculate expected annual return
        expected_return = (strategy.total_amount * strategy.expected_apy) / 100.0
        print(f"\n💰 Expected Annual Return: {format_currency(expected_return)}")

    print("\n" + "="*80 + "\n")


def print_protocol_comparison(protocol_stats: Dict[str, Dict]) -> None:
    """
    Print formatted comparison of protocols.

    Args:
        protocol_stats: Dictionary of protocol statistics
    """
    print("\n" + "="*80)
    print("📊 PROTOCOL COMPARISON")
    print("="*80 + "\n")

    # Sort by average APY
    sorted_protocols = sorted(
        protocol_stats.items(),
        key=lambda x: x[1]["avg_apy"],
        reverse=True,
    )

    for protocol, stats in sorted_protocols:
        print(f"\n{protocol}:")
        print(f"  • Average APY: {format_percentage(stats['avg_apy'])}")
        print(f"  • Max APY: {format_percentage(stats['max_apy'])}")
        print(f"  • Min APY: {format_percentage(stats['min_apy'])}")
        print(f"  • Pool Count: {stats['pool_count']}")

    print("\n" + "="*80 + "\n")


def print_risk_analysis(risk_groups: Dict[str, List]) -> None:
    """
    Print risk/reward analysis.

    Args:
        risk_groups: Dictionary mapping risk level to yield data list
    """
    print("\n" + "="*80)
    print("⚖️  RISK/REWARD ANALYSIS")
    print("="*80 + "\n")

    for risk_level in ["low", "medium", "high"]:
        yields = risk_groups.get(risk_level, [])
        
        if not yields:
            continue

        print(f"\n{risk_level.upper()} RISK:")
        print(f"  • Pool Count: {len(yields)}")
        
        if yields:
            avg_apy = sum(yd.apy for yd in yields) / len(yields)
            max_apy = max(yd.apy for yd in yields)
            print(f"  • Average APY: {format_percentage(avg_apy)}")
            print(f"  • Max APY: {format_percentage(max_apy)}")
            
            print(f"  • Top 3 Pools:")
            for i, yd in enumerate(yields[:3], 1):
                print(f"    {i}. {yd.protocol} - {yd.pool_name}: {format_percentage(yd.apy)}")

    print("\n" + "="*80 + "\n")


def save_strategies_json(strategies: List, output_path: str) -> None:
    """
    Save strategies to JSON file.

    Args:
        strategies: List of AllocationStrategy objects
        output_path: Output file path
    """
    data = {
        "strategies": [s.to_dict() for s in strategies],
        "count": len(strategies),
    }

    ensure_output_dir(Path(output_path).parent)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def load_strategies_json(input_path: str) -> List[Dict]:
    """
    Load strategies from JSON file.

    Args:
        input_path: Input file path

    Returns:
        List of strategy dictionaries
    """
    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("strategies", [])
