"""
Simulation engine for automated DEX trading.

Simulates multiple traders placing orders and tracks market evolution.
"""

import random
from typing import List, Dict, Optional, Callable
from datetime import datetime, timedelta
from src.order_book import OrderBook
from src.order import Order, create_order, OrderSide, OrderType


class Trader:
    """Represents an automated trader in the simulation."""
    
    def __init__(
        self,
        trader_id: str,
        strategy: str = "random",
        initial_balance: float = 10000.0,
    ):
        """
        Initialize a trader.
        
        Args:
            trader_id: Unique trader identifier
            strategy: Trading strategy ("random", "market_maker", "momentum")
            initial_balance: Initial balance
        """
        self.trader_id = trader_id
        self.strategy = strategy
        self.balance = initial_balance
        self.position = 0.0  # Net position (positive = long, negative = short)
        self.orders_placed = []
        self.trades_executed = []
    
    def generate_order(
        self,
        order_book,
        step: int = 0,
    ) -> Optional[Order]:
        """
        Generate an order based on trader's strategy.
        
        Args:
            order_book: Current order book state
            step: Current simulation step (unused, for compatibility)
            
        Returns:
            Order or None
        """
        # Get current market state
        mid_price = order_book.get_mid_price() or 100.0
        spread = order_book.get_spread() or 1.0
        
        if self.strategy == "random":
            return self._random_strategy(mid_price)
        elif self.strategy == "market_maker":
            return self._market_maker_strategy(mid_price, spread)
        elif self.strategy == "momentum":
            return self._momentum_strategy(mid_price)
        else:
            raise ValueError(f"Unknown strategy: {self.strategy}")
    
    def _random_strategy(self, current_price: float) -> Optional[Order]:
        """Generate random orders."""
        # 50% chance to place order
        if random.random() > 0.5:
            return None
        
        # Random side
        side = random.choice(["BUY", "SELL"])
        
        # Random type (80% limit, 20% market)
        order_type = "LIMIT" if random.random() < 0.8 else "MARKET"
        
        # Random quantity (0.1 to 5.0)
        quantity = round(random.uniform(0.1, 5.0), 2)
        
        # Random price around current (±5%)
        price = None
        if order_type == "LIMIT":
            price_offset = random.uniform(-0.05, 0.05)
            price = round(current_price * (1 + price_offset), 2)
        
        return create_order(
            trader_id=self.trader_id,
            side=side,
            order_type=order_type,
            quantity=quantity,
            price=price,
        )
    
    def _market_maker_strategy(self, current_price: float, spread: float) -> Optional[Order]:
        """Place orders on both sides to provide liquidity."""
        # Place limit orders with tighter spread
        side = random.choice(["BUY", "SELL"])
        quantity = round(random.uniform(1.0, 3.0), 2)
        
        # Place orders closer to mid price
        offset = spread / 4
        if side == "BUY":
            price = round(current_price - offset, 2)
        else:
            price = round(current_price + offset, 2)
        
        return create_order(
            trader_id=self.trader_id,
            side=side,
            order_type="LIMIT",
            quantity=quantity,
            price=price,
        )
    
    def _momentum_strategy(self, current_price: float) -> Optional[Order]:
        """Follow momentum (buy high, sell low)."""
        # Simplified momentum: random direction with market orders
        if random.random() > 0.7:  # 30% chance
            side = random.choice(["BUY", "SELL"])
            quantity = round(random.uniform(0.5, 2.0), 2)
            
            return create_order(
                trader_id=self.trader_id,
                side=side,
                order_type="MARKET",
                quantity=quantity,
            )
        
        return None


class DEXSimulator:
    """
    DEX order book simulator with automated traders.
    
    Runs step-by-step simulation of trading activity.
    """
    
    def __init__(
        self,
        initial_price: float = 100.0,
        num_traders: int = 0,
        trader_strategies: Optional[List[str]] = None,
    ):
        """
        Initialize the simulator.
        
        Args:
            initial_price: Starting market price
            num_traders: Number of automated traders
            trader_strategies: List of strategies for traders (random if None)
        """
        self.order_book = OrderBook(initial_price=initial_price)
        self.initial_price = initial_price
        self.current_price = initial_price
        
        # Create traders
        self.traders: List[Trader] = []
        if num_traders > 0:
            for i in range(num_traders):
                strategy = "random"
                if trader_strategies and i < len(trader_strategies):
                    strategy = trader_strategies[i]
                
                trader = Trader(
                    trader_id=f"trader_{i+1}",
                    strategy=strategy,
                )
                self.traders.append(trader)
        
        # Simulation state
        self.step_count = 0
        self.price_history = [initial_price]
        self.volume_history = []
        self.snapshots = []
        
        # Initialize with some orders if we have traders
        if self.traders:
            self._seed_order_book()
    
    def add_trader(self, trader: Trader):
        """
        Add a trader to the simulation.
        
        Args:
            trader: Trader to add
        """
        self.traders.append(trader)
    
    def reset(self):
        """Reset simulation state."""
        self.order_book = OrderBook(initial_price=self.initial_price)
        self.current_price = self.initial_price
        self.step_count = 0
        self.price_history = [self.initial_price]
        self.volume_history = []
        self.snapshots = []
        
        # Reset trader states
        for trader in self.traders:
            trader.orders_placed = []
            trader.trades_executed = []
        
        # Re-seed if we have traders
        if self.traders:
            self._seed_order_book()
    
    def _seed_order_book(self):
        """Seed the order book with initial orders."""
        # Add some buy orders below initial price
        for i in range(5):
            price = self.initial_price - (i + 1) * 0.5
            quantity = random.uniform(1.0, 3.0)
            trader = random.choice(self.traders)
            
            order = create_order(
                trader_id=trader.trader_id,
                side="BUY",
                order_type="LIMIT",
                quantity=round(quantity, 2),
                price=round(price, 2),
            )
            self.order_book.place_order(order)
        
        # Add some sell orders above initial price
        for i in range(5):
            price = self.initial_price + (i + 1) * 0.5
            quantity = random.uniform(1.0, 3.0)
            trader = random.choice(self.traders)
            
            order = create_order(
                trader_id=trader.trader_id,
                side="SELL",
                order_type="LIMIT",
                quantity=round(quantity, 2),
                price=round(price, 2),
            )
            self.order_book.place_order(order)
    
    def step(self) -> Dict:
        """
        Execute one simulation step.
        
        Returns:
            Dictionary with step results
        """
        self.step_count += 1
        trades_this_step = []
        orders_this_step = []
        
        # Each trader has a chance to place an order
        for trader in self.traders:
            # Generate order
            order = trader.generate_order(self.order_book, self.step_count)
            
            if order:
                # Place order to book
                trades = self.order_book.place_order(order)
                orders_this_step.append(order)
                trades_this_step.extend(trades)
                
                # Update trader state
                trader.orders_placed.append(order)
                trader.trades_executed.extend(trades)
        
        # Update price based on trades
        if trades_this_step:
            # Last trade price becomes current price
            self.current_price = trades_this_step[-1].price
            total_volume = sum(t.quantity for t in trades_this_step)
        else:
            # Use mid price if no trades
            mid = self.order_book.get_mid_price()
            if mid:
                self.current_price = mid
            total_volume = 0.0
        
        self.price_history.append(self.current_price)
        self.volume_history.append(total_volume)
        
        # Create snapshot
        snapshot = {
            "step": self.step_count,
            "price": self.current_price,
            "volume": total_volume,
            "orders_placed": len(orders_this_step),
            "trades_executed": len(trades_this_step),
            "order_book": self.order_book.get_order_book_depth(levels=5),
            "stats": self.order_book.get_stats(),
        }
        
        self.snapshots.append(snapshot)
        
        return snapshot
    
    def run(self, steps: int = 100, verbose: bool = False) -> List[Dict]:
        """
        Run simulation for multiple steps.
        
        Args:
            steps: Number of steps to simulate
            verbose: Whether to print step-by-step output
            
        Returns:
            List of snapshots for each step
        """
        results = []
        
        for i in range(steps):
            snapshot = self.step()
            results.append(snapshot)
            
            if verbose:
                from src.visualizer import print_simulation_step
                print_simulation_step(snapshot, i + 1)
        
        return results
    
    def get_summary(self) -> Dict:
        """Get simulation summary statistics."""
        if not self.price_history:
            return {}
        
        price_change = self.price_history[-1] - self.price_history[0]
        price_change_pct = (price_change / self.price_history[0]) * 100
        
        total_volume = sum(self.volume_history)
        avg_volume = total_volume / len(self.volume_history) if self.volume_history else 0
        
        return {
            "total_steps": self.step_count,
            "initial_price": self.price_history[0],
            "final_price": self.price_history[-1],
            "price_change": price_change,
            "price_change_pct": price_change_pct,
            "total_volume": total_volume,
            "avg_volume_per_step": avg_volume,
            "total_trades": len(self.order_book.trades),
            "total_orders": len(self.order_book.orders),
            "active_orders": len([o for o in self.order_book.orders.values() if o.is_active]),
        }
    
    def reset(self):
        """Reset the simulation."""
        self.order_book.clear()
        self.step_count = 0
        self.current_price = self.initial_price
        self.price_history = [self.initial_price]
        self.volume_history = []
        self.snapshots = []
        self._seed_order_book()
