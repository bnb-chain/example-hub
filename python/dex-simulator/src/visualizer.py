"""
Visualization utilities for the DEX simulator.

Provides text-based and optional matplotlib visualizations.
"""

from typing import Dict, List, Optional
from src.order_book import OrderBook


def print_order_book(order_book: OrderBook, levels: int = 10):
    """
    Print a text-based order book visualization.
    
    Args:
        order_book: OrderBook to visualize
        levels: Number of price levels to show
    """
    depth = order_book.get_order_book_depth(levels=levels)
    
    print("\n" + "="*70)
    print("ORDER BOOK".center(70))
    print("="*70)
    
    # Print stats
    stats = order_book.get_stats()
    if stats["best_bid"] and stats["best_ask"]:
        print(f"Best Bid: ${stats['best_bid']:.2f}  |  Best Ask: ${stats['best_ask']:.2f}  |  Spread: ${stats['spread']:.2f}")
        print(f"Mid Price: ${stats['mid_price']:.2f}")
    print(f"Total Orders: {stats['total_orders']}  |  Active: {stats['active_orders']}  |  Trades: {stats['total_trades']}")
    print("-"*70)
    
    # Print order book
    print(f"{'BIDS':<30} | {'ASKS':>30}")
    print(f"{'Price':<10} {'Quantity':<15} | {'Price':>10} {'Quantity':>15}")
    print("-"*70)
    
    max_rows = max(len(depth["bids"]), len(depth["asks"]))
    
    for i in range(max_rows):
        # Bid side
        if i < len(depth["bids"]):
            bid = depth["bids"][i]
            bid_str = f"${bid['price']:<9.2f} {bid['quantity']:<15.2f}"
        else:
            bid_str = " " * 30
        
        # Ask side
        if i < len(depth["asks"]):
            ask = depth["asks"][i]
            ask_str = f"${ask['price']:>9.2f} {ask['quantity']:>15.2f}"
        else:
            ask_str = " " * 30
        
        print(f"{bid_str} | {ask_str}")
    
    print("="*70 + "\n")


def print_simulation_step(snapshot: Dict, step: int):
    """
    Print simulation step summary.
    
    Args:
        snapshot: Simulation step snapshot
        step: Step number
    """
    print(f"\n{'='*60}")
    print(f"STEP {step}".center(60))
    print(f"{'='*60}")
    print(f"Price: ${snapshot['price']:.2f}")
    print(f"Volume: {snapshot['volume']:.2f}")
    print(f"Orders Placed: {snapshot['orders_placed']}")
    print(f"Trades Executed: {snapshot['trades_executed']}")
    
    stats = snapshot['stats']
    print(f"\nOrder Book Stats:")
    print(f"  Active Orders: {stats['active_orders']}")
    print(f"  Best Bid: ${stats['best_bid']:.2f}" if stats['best_bid'] else "  Best Bid: None")
    print(f"  Best Ask: ${stats['best_ask']:.2f}" if stats['best_ask'] else "  Best Ask: None")
    print(f"  Spread: ${stats['spread']:.2f}" if stats['spread'] else "  Spread: None")


def print_simulation_summary(summary: Dict):
    """
    Print simulation summary.
    
    Args:
        summary: Summary dictionary from simulator
    """
    print("\n" + "="*60)
    print("SIMULATION SUMMARY".center(60))
    print("="*60)
    print(f"Total Steps: {summary['total_steps']}")
    print(f"Initial Price: ${summary['initial_price']:.2f}")
    print(f"Final Price: ${summary['final_price']:.2f}")
    print(f"Price Change: ${summary['price_change']:.2f} ({summary['price_change_pct']:.2f}%)")
    print(f"Total Volume: {summary['total_volume']:.2f}")
    print(f"Avg Volume per Step: {summary['avg_volume_per_step']:.2f}")
    print(f"Total Trades: {summary['total_trades']}")
    print(f"Total Orders: {summary['total_orders']}")
    print(f"Active Orders: {summary['active_orders']}")
    print("="*60 + "\n")


def plot_simulation_results(
    price_history: List[float],
    volume_history: List[float],
    output_path: Optional[str] = None,
):
    """
    Plot simulation results using matplotlib.
    
    Args:
        price_history: List of prices over time
        volume_history: List of volumes over time
        output_path: Optional path to save figure
    """
    try:
        import matplotlib.pyplot as plt
        import numpy as np
    except ImportError:
        print("⚠️  Matplotlib not installed. Install with: pip install matplotlib numpy")
        return
    
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 8))
    
    # Plot price
    steps = list(range(len(price_history)))
    ax1.plot(steps, price_history, 'b-', linewidth=2, label='Price')
    ax1.set_xlabel('Step')
    ax1.set_ylabel('Price ($)')
    ax1.set_title('Price Over Time')
    ax1.grid(True, alpha=0.3)
    ax1.legend()
    
    # Plot volume
    ax2.bar(steps, volume_history, color='green', alpha=0.6, label='Volume')
    ax2.set_xlabel('Step')
    ax2.set_ylabel('Volume')
    ax2.set_title('Trading Volume per Step')
    ax2.grid(True, alpha=0.3)
    ax2.legend()
    
    plt.tight_layout()
    
    if output_path:
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        print(f"✅ Plot saved to: {output_path}")
    else:
        plt.show()


def plot_order_book_depth(
    order_book: OrderBook,
    levels: int = 20,
    output_path: Optional[str] = None,
):
    """
    Plot order book depth chart.
    
    Args:
        order_book: OrderBook to visualize
        levels: Number of levels to show
        output_path: Optional path to save figure
    """
    try:
        import matplotlib.pyplot as plt
        import numpy as np
    except ImportError:
        print("⚠️  Matplotlib not installed. Install with: pip install matplotlib numpy")
        return
    
    depth = order_book.get_order_book_depth(levels=levels)
    
    # Extract data
    bid_prices = [b['price'] for b in depth['bids']]
    bid_quantities = [b['quantity'] for b in depth['bids']]
    
    ask_prices = [a['price'] for a in depth['asks']]
    ask_quantities = [a['quantity'] for a in depth['asks']]
    
    # Create cumulative depth
    bid_cumulative = np.cumsum(bid_quantities[::-1])[::-1]
    ask_cumulative = np.cumsum(ask_quantities)
    
    # Plot
    fig, ax = plt.subplots(figsize=(12, 6))
    
    ax.step(bid_prices, bid_cumulative, where='post', color='green', linewidth=2, label='Bids', alpha=0.7)
    ax.fill_between(bid_prices, 0, bid_cumulative, step='post', color='green', alpha=0.3)
    
    ax.step(ask_prices, ask_cumulative, where='pre', color='red', linewidth=2, label='Asks', alpha=0.7)
    ax.fill_between(ask_prices, 0, ask_cumulative, step='pre', color='red', alpha=0.3)
    
    # Add mid price line
    if depth['mid_price']:
        ax.axvline(depth['mid_price'], color='blue', linestyle='--', linewidth=1, label=f'Mid Price: ${depth["mid_price"]:.2f}')
    
    ax.set_xlabel('Price ($)')
    ax.set_ylabel('Cumulative Quantity')
    ax.set_title('Order Book Depth')
    ax.legend()
    ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    
    if output_path:
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        print(f"✅ Plot saved to: {output_path}")
    else:
        plt.show()
