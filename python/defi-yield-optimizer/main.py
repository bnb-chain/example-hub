"""
Main CLI for DeFi Yield Optimizer.

Usage:
    python main.py optimize --amount 10000 --risk medium
    python main.py compare  # Compare protocols
    python main.py analyze  # Risk/reward analysis
    python main.py top --n 10  # Show top pools
"""

import argparse
import sys

from src.fetcher import create_fetcher
from src.optimizer import YieldOptimizer
from src.utils import (
    load_config,
    print_strategy_report,
    print_protocol_comparison,
    print_risk_analysis,
    save_strategies_json,
    format_percentage,
)


def cmd_optimize(args, config):
    """Run yield optimization."""
    print(f"\n🚀 DeFi Yield Optimizer - Running in {config['fetcher_mode']} mode\n")

    # Create fetcher
    fetcher = create_fetcher(
        mode=config["fetcher_mode"],
        rpc_url=config.get("bsc_rpc_url"),
    )

    # Determine investment amount
    amount = args.amount if args.amount else config["default_investment_amount"]
    
    # Determine risk level
    risk_level = args.risk if args.risk else None
    if args.risk and args.risk not in ["low", "medium", "high"]:
        print(f"⚠️  Invalid risk level: {args.risk}. Using all risk levels.")
        risk_level = None

    # Create optimizer
    optimizer = YieldOptimizer(
        fetcher=fetcher,
        investment_amount=amount,
        min_apy_threshold=config["min_apy_threshold"],
    )

    # Determine strategy types
    strategy_types = None
    if args.strategy_type:
        valid_types = ["single", "diversified", "risk_adjusted"]
        if args.strategy_type in valid_types:
            strategy_types = [args.strategy_type]
        else:
            print(f"⚠️  Invalid strategy type: {args.strategy_type}. Using all types.")

    # Run optimization
    print(f"💰 Investment Amount: ${amount:,.2f}")
    if risk_level:
        print(f"⚖️  Risk Level Filter: {risk_level.title()}")
    print(f"📊 Min APY Threshold: {format_percentage(config['min_apy_threshold'])}")
    print("\nAnalyzing opportunities...\n")

    strategies = optimizer.optimize(
        strategy_types=strategy_types,
        risk_level=risk_level,
        max_strategies=args.max_results,
    )

    # Print results
    print_strategy_report(strategies, detailed=config["show_detailed_report"])

    # Save to JSON if requested
    if args.output:
        output_path = args.output
        save_strategies_json(strategies, output_path)
        print(f"✅ Strategies saved to: {output_path}\n")

    # Show best single strategy
    if strategies:
        best = strategies[0]
        print("🏆 RECOMMENDED STRATEGY:")
        print(f"   {best.name}")
        print(f"   Expected APY: {format_percentage(best.expected_apy)}")
        expected_return = (amount * best.expected_apy) / 100.0
        print(f"   Expected Annual Return: ${expected_return:,.2f}\n")


def cmd_compare(args, config):
    """Compare protocols."""
    print(f"\n🔍 Protocol Comparison - Running in {config['fetcher_mode']} mode\n")

    # Create fetcher and optimizer
    fetcher = create_fetcher(mode=config["fetcher_mode"])
    optimizer = YieldOptimizer(fetcher=fetcher)

    # Get protocol comparison
    protocol_stats = optimizer.compare_protocols()

    # Print comparison
    print_protocol_comparison(protocol_stats)


def cmd_analyze(args, config):
    """Analyze risk/reward."""
    print(f"\n📈 Risk/Reward Analysis - Running in {config['fetcher_mode']} mode\n")

    # Create fetcher and optimizer
    fetcher = create_fetcher(mode=config["fetcher_mode"])
    optimizer = YieldOptimizer(fetcher=fetcher)

    # Get risk analysis
    risk_groups = optimizer.analyze_risk_reward()

    # Print analysis
    print_risk_analysis(risk_groups)


def cmd_top(args, config):
    """Show top pools by APY."""
    print(f"\n🏅 Top Yield Pools - Running in {config['fetcher_mode']} mode\n")

    # Create fetcher and optimizer
    fetcher = create_fetcher(mode=config["fetcher_mode"])
    optimizer = YieldOptimizer(fetcher=fetcher)

    # Get top pools
    top_pools = optimizer.get_top_pools(n=args.n)

    print(f"Top {len(top_pools)} Pools by APY:")
    print("="*80 + "\n")

    for i, pool in enumerate(top_pools, 1):
        print(f"{i:2d}. {pool.protocol:15s} - {pool.pool_name:25s}")
        print(f"    APY: {format_percentage(pool.apy):8s} | Risk: {pool.risk_level:6s} | TVL: ${pool.tvl:,.0f}")
        print(f"    Token Pair: {pool.token_pair}")
        print()

    print("="*80 + "\n")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="DeFi Yield Optimizer - Find optimal yield farming strategies",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Optimize with default settings
  python main.py optimize

  # Optimize with specific amount and risk level
  python main.py optimize --amount 25000 --risk low

  # Optimize and save results to JSON
  python main.py optimize --amount 10000 --output outputs/strategies.json

  # Compare protocols
  python main.py compare

  # Analyze risk/reward
  python main.py analyze

  # Show top 10 pools
  python main.py top --n 10

  # Show only single-pool strategies
  python main.py optimize --strategy-type single
        """,
    )

    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    # Optimize command
    optimize_parser = subparsers.add_parser("optimize", help="Optimize yield farming strategy")
    optimize_parser.add_argument(
        "--amount",
        type=float,
        help="Investment amount in USD (default: from config)",
    )
    optimize_parser.add_argument(
        "--risk",
        type=str,
        choices=["low", "medium", "high"],
        help="Risk level filter",
    )
    optimize_parser.add_argument(
        "--strategy-type",
        type=str,
        choices=["single", "diversified", "risk_adjusted"],
        help="Strategy type to generate",
    )
    optimize_parser.add_argument(
        "--max-results",
        type=int,
        default=5,
        help="Maximum number of strategies to show (default: 5)",
    )
    optimize_parser.add_argument(
        "--output",
        type=str,
        help="Output JSON file path",
    )

    # Compare command
    compare_parser = subparsers.add_parser("compare", help="Compare protocols")

    # Analyze command
    analyze_parser = subparsers.add_parser("analyze", help="Analyze risk/reward")

    # Top command
    top_parser = subparsers.add_parser("top", help="Show top pools by APY")
    top_parser.add_argument(
        "--n",
        type=int,
        default=10,
        help="Number of top pools to show (default: 10)",
    )

    args = parser.parse_args()

    # Load configuration
    try:
        config = load_config()
    except Exception as e:
        print(f"⚠️  Warning: Could not load .env file: {e}")
        print("Using default configuration (mock mode)\n")
        config = {
            "fetcher_mode": "mock",
            "default_investment_amount": 10000.0,
            "default_risk_level": "medium",
            "max_protocols": 5,
            "min_apy_threshold": 5.0,
            "output_dir": "outputs",
            "show_detailed_report": True,
        }

    # Execute command
    if args.command == "optimize":
        cmd_optimize(args, config)
    elif args.command == "compare":
        cmd_compare(args, config)
    elif args.command == "analyze":
        cmd_analyze(args, config)
    elif args.command == "top":
        cmd_top(args, config)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
