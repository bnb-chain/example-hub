#!/usr/bin/env python3
"""
DEX Simulator - Educational decentralized exchange order book simulator.

CLI interface for simulating order book dynamics and automated trading.
"""

import argparse
import sys
from typing import Optional

from src.order import Order, OrderSide, OrderType, create_order
from src.order_book import OrderBook
from src.simulator import DEXSimulator, Trader
from src.visualizer import (
    print_order_book,
    print_simulation_step,
    print_simulation_summary,
    plot_simulation_results,
    plot_order_book_depth,
)
from src.utils import load_config


def cmd_manual(args):
    """Manual trading mode - place and cancel orders interactively."""
    config = load_config()
    initial_price = float(config.get("INITIAL_PRICE", 100.0))
    
    order_book = OrderBook(initial_price=initial_price)
    
    # Seed with some initial orders
    print("🌱 Seeding order book with initial orders...\n")
    for i in range(5):
        bid_price = initial_price - (i + 1) * 0.5
        order_book.place_order(create_order(
            side=OrderSide.BUY,
            order_type=OrderType.LIMIT,
            price=bid_price,
            quantity=10.0,
            trader_id="seed"
        ))
        
        ask_price = initial_price + (i + 1) * 0.5
        order_book.place_order(create_order(
            side=OrderSide.SELL,
            order_type=OrderType.LIMIT,
            price=ask_price,
            quantity=10.0,
            trader_id="seed"
        ))
    
    print_order_book(order_book, levels=10)
    
    print("\nManual Trading Mode")
    print("Commands:")
    print("  buy <price> <quantity>  - Place limit buy order")
    print("  sell <price> <quantity> - Place limit sell order")
    print("  market buy <quantity>   - Place market buy order")
    print("  market sell <quantity>  - Place market sell order")
    print("  book                    - Show order book")
    print("  stats                   - Show statistics")
    print("  quit                    - Exit")
    print()
    
    order_id = 1000
    
    while True:
        try:
            cmd = input(">> ").strip().lower()
            
            if not cmd:
                continue
            
            parts = cmd.split()
            
            if parts[0] == "quit":
                print("👋 Goodbye!")
                break
            
            elif parts[0] == "book":
                print_order_book(order_book, levels=10)
            
            elif parts[0] == "stats":
                stats = order_book.get_stats()
                print("\n📊 Order Book Statistics:")
                for key, value in stats.items():
                    print(f"  {key}: {value}")
                print()
            
            elif parts[0] == "buy" and len(parts) == 3:
                price = float(parts[1])
                quantity = float(parts[2])
                order = create_order(
                    side=OrderSide.BUY,
                    order_type=OrderType.LIMIT,
                    price=price,
                    quantity=quantity,
                    trader_id="manual"
                )
                order.order_id = order_id
                order_id += 1
                trades = order_book.place_order(order)
                print(f"✅ Buy order placed: #{order.order_id}")
                if trades:
                    print(f"   🔄 Executed {len(trades)} trade(s)")
                    for trade in trades:
                        print(f"      {trade.quantity:.2f} @ ${trade.price:.2f}")
            
            elif parts[0] == "sell" and len(parts) == 3:
                price = float(parts[1])
                quantity = float(parts[2])
                order = create_order(
                    side=OrderSide.SELL,
                    order_type=OrderType.LIMIT,
                    price=price,
                    quantity=quantity,
                    trader_id="manual"
                )
                order.order_id = order_id
                order_id += 1
                trades = order_book.place_order(order)
                print(f"✅ Sell order placed: #{order.order_id}")
                if trades:
                    print(f"   🔄 Executed {len(trades)} trade(s)")
                    for trade in trades:
                        print(f"      {trade.quantity:.2f} @ ${trade.price:.2f}")
            
            elif parts[0] == "market" and len(parts) == 3:
                side = OrderSide.BUY if parts[1] == "buy" else OrderSide.SELL
                quantity = float(parts[2])
                order = create_order(
                    side=side,
                    order_type=OrderType.MARKET,
                    price=None,
                    quantity=quantity,
                    trader_id="manual"
                )
                order.order_id = order_id
                order_id += 1
                trades = order_book.place_order(order)
                print(f"✅ Market {parts[1]} order placed: #{order.order_id}")
                if trades:
                    print(f"   🔄 Executed {len(trades)} trade(s)")
                    for trade in trades:
                        print(f"      {trade.quantity:.2f} @ ${trade.price:.2f}")
                else:
                    print(f"   ⚠️  No matching orders found")
            
            else:
                print("❌ Invalid command. Type 'help' for commands.")
        
        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"❌ Error: {e}")


def cmd_simulate(args):
    """Run automated simulation with multiple traders."""
    config = load_config()
    
    # Get config values
    initial_price = float(config.get("INITIAL_PRICE", 100.0))
    num_traders = int(config.get("NUM_TRADERS", 5))
    num_steps = args.steps if args.steps else int(config.get("NUM_STEPS", 100))
    verbose = args.verbose
    
    print(f"🎮 Starting DEX Simulation")
    print(f"   Initial Price: ${initial_price:.2f}")
    print(f"   Traders: {num_traders}")
    print(f"   Steps: {num_steps}")
    print()
    
    # Create simulator
    simulator = DEXSimulator(initial_price=initial_price)
    
    # Add traders with different strategies
    strategies = ["random", "market_maker", "momentum"]
    for i in range(num_traders):
        strategy = strategies[i % len(strategies)]
        trader = Trader(
            trader_id=f"trader_{i+1}",
            strategy=strategy,
            initial_balance=10000.0
        )
        simulator.add_trader(trader)
    
    # Run simulation
    snapshots = simulator.run(steps=num_steps, verbose=verbose)
    
    # Print summary
    summary = simulator.get_summary()
    print_simulation_summary(summary)
    
    # Final order book
    if args.show_book:
        print_order_book(simulator.order_book, levels=10)
    
    # Save results
    if args.output:
        plot_simulation_results(
            simulator.price_history,
            simulator.volume_history,
            output_path=args.output
        )


def cmd_visualize(args):
    """Visualize order book depth."""
    config = load_config()
    initial_price = float(config.get("INITIAL_PRICE", 100.0))
    
    # Create order book with seed orders
    order_book = OrderBook(initial_price=initial_price)
    
    print("🌱 Seeding order book...\n")
    for i in range(10):
        bid_price = initial_price - (i + 1) * 1.0
        order_book.place_order(create_order(
            side=OrderSide.BUY,
            order_type=OrderType.LIMIT,
            price=bid_price,
            quantity=10.0 * (10 - i),
            trader_id="seed"
        ))
        
        ask_price = initial_price + (i + 1) * 1.0
        order_book.place_order(create_order(
            side=OrderSide.SELL,
            order_type=OrderType.LIMIT,
            price=ask_price,
            quantity=10.0 * (10 - i),
            trader_id="seed"
        ))
    
    # Text visualization
    print_order_book(order_book, levels=args.levels)
    
    # Graphical visualization
    if args.output or not args.no_plot:
        plot_order_book_depth(
            order_book,
            levels=args.levels,
            output_path=args.output
        )


def cmd_stats(args):
    """Show order book statistics."""
    config = load_config()
    initial_price = float(config.get("INITIAL_PRICE", 100.0))
    
    # Run quick simulation to gather stats
    simulator = DEXSimulator(initial_price=initial_price)
    
    # Add a few traders
    for i in range(3):
        trader = Trader(
            trader_id=f"trader_{i+1}",
            strategy=["random", "market_maker", "momentum"][i],
            initial_balance=10000.0
        )
        simulator.add_trader(trader)
    
    # Run for a few steps
    simulator.run(steps=50, verbose=False)
    
    # Show stats
    stats = simulator.order_book.get_stats()
    print("\n📊 Order Book Statistics:")
    print(f"   Total Orders: {stats['total_orders']}")
    print(f"   Active Orders: {stats['active_orders']}")
    print(f"   Total Trades: {stats['total_trades']}")
    print(f"   Total Volume: {stats['total_volume']:.2f}")
    
    if stats['best_bid']:
        print(f"   Best Bid: ${stats['best_bid']:.2f}")
    if stats['best_ask']:
        print(f"   Best Ask: ${stats['best_ask']:.2f}")
    if stats['spread']:
        print(f"   Spread: ${stats['spread']:.2f}")
    if stats['mid_price']:
        print(f"   Mid Price: ${stats['mid_price']:.2f}")
    
    print()


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="DEX Simulator - Educational order book simulator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s manual                    # Interactive trading mode
  %(prog)s simulate --steps 100      # Run 100-step simulation
  %(prog)s simulate --output chart.png  # Save results to file
  %(prog)s visualize                 # Show order book depth
  %(prog)s stats                     # Show order book statistics
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Manual command
    parser_manual = subparsers.add_parser(
        "manual",
        help="Manual trading mode - place orders interactively"
    )
    parser_manual.set_defaults(func=cmd_manual)
    
    # Simulate command
    parser_simulate = subparsers.add_parser(
        "simulate",
        help="Run automated simulation with traders"
    )
    parser_simulate.add_argument(
        "--steps",
        type=int,
        help="Number of simulation steps (default: from .env)"
    )
    parser_simulate.add_argument(
        "--verbose",
        action="store_true",
        help="Show detailed step-by-step output"
    )
    parser_simulate.add_argument(
        "--show-book",
        action="store_true",
        help="Show final order book state"
    )
    parser_simulate.add_argument(
        "--output",
        type=str,
        help="Save visualization to file"
    )
    parser_simulate.set_defaults(func=cmd_simulate)
    
    # Visualize command
    parser_visualize = subparsers.add_parser(
        "visualize",
        help="Visualize order book depth"
    )
    parser_visualize.add_argument(
        "--levels",
        type=int,
        default=10,
        help="Number of price levels to show (default: 10)"
    )
    parser_visualize.add_argument(
        "--output",
        type=str,
        help="Save plot to file"
    )
    parser_visualize.add_argument(
        "--no-plot",
        action="store_true",
        help="Skip graphical plot (text only)"
    )
    parser_visualize.set_defaults(func=cmd_visualize)
    
    # Stats command
    parser_stats = subparsers.add_parser(
        "stats",
        help="Show order book statistics"
    )
    parser_stats.set_defaults(func=cmd_stats)
    
    # Parse args
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Run command
    args.func(args)


if __name__ == "__main__":
    main()
