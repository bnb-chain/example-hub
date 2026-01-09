"""
Order book implementation with matching engine.

Implements a price-time priority order book for DEX simulation.
"""

from typing import List, Dict, Optional, Tuple
from collections import defaultdict
from src.order import Order, OrderSide, OrderType, OrderStatus
import bisect


class Trade:
    """Represents a completed trade."""
    
    def __init__(
        self,
        buy_order_id: str,
        sell_order_id: str,
        buyer_id: str,
        seller_id: str,
        price: float,
        quantity: float,
        timestamp,
    ):
        """
        Initialize a trade.
        
        Args:
            buy_order_id: ID of the buy order
            sell_order_id: ID of the sell order
            buyer_id: ID of the buyer trader
            seller_id: ID of the seller trader
            price: Trade execution price
            quantity: Trade quantity
            timestamp: When the trade occurred
        """
        self.buy_order_id = buy_order_id
        self.sell_order_id = sell_order_id
        self.buyer_id = buyer_id
        self.seller_id = seller_id
        self.price = price
        self.quantity = quantity
        self.timestamp = timestamp
    
    def to_dict(self) -> dict:
        """Convert trade to dictionary."""
        return {
            "buy_order_id": self.buy_order_id,
            "sell_order_id": self.sell_order_id,
            "price": self.price,
            "quantity": self.quantity,
            "timestamp": self.timestamp.isoformat(),
        }
    
    def __repr__(self) -> str:
        return f"Trade({self.quantity:.2f} @ ${self.price:.2f})"


class OrderBook:
    """
    Order book with price-time priority matching.
    
    Maintains separate lists for buy and sell orders, sorted by price
    and time priority.
    """
    
    def __init__(self, initial_price: float = 100.0):
        """
        Initialize an empty order book.
        
        Args:
            initial_price: Initial market price (for reference)
        """
        self.initial_price = initial_price
        
        # Buy orders: sorted by price (descending), then time (ascending)
        self.buy_orders: List[Order] = []
        
        # Sell orders: sorted by price (ascending), then time (ascending)
        self.sell_orders: List[Order] = []
        
        # Track all orders by ID
        self.orders: Dict[str, Order] = {}
        
        # Trade history
        self.trades: List[Trade] = []
        
        # Counter for orders
        self.order_count = 0
        
        # Price levels for quick depth lookup
        self._update_price_levels()
    
    def _update_price_levels(self):
        """Update price level aggregations."""
        # Group buy orders by price
        self.buy_price_levels = defaultdict(float)
        for order in self.buy_orders:
            if order.is_active and order.price:
                self.buy_price_levels[order.price] += order.remaining_quantity
        
        # Group sell orders by price
        self.sell_price_levels = defaultdict(float)
        for order in self.sell_orders:
            if order.is_active and order.price:
                self.sell_price_levels[order.price] += order.remaining_quantity
    
    def place_order(self, order: Order) -> List[Trade]:
        """
        Place an order to the book and attempt to match it.
        
        Args:
            order: Order to place
            
        Returns:
            List of trades executed
        """
        # Store order
        self.orders[order.order_id] = order
        self.order_count += 1
        
        # Try to match the order
        trades = self._match_order(order)
        
        # If order has remaining quantity and is a limit order, add to book
        if order.is_active and order.order_type == OrderType.LIMIT:
            if order.side == OrderSide.BUY:
                self._insert_buy_order(order)
            else:
                self._insert_sell_order(order)
        
        self._update_price_levels()
        
        return trades
    
    def _insert_buy_order(self, order: Order):
        """Insert buy order maintaining price-time priority (descending price)."""
        # Find insertion point: higher prices first, then earlier timestamps
        idx = 0
        for i, existing_order in enumerate(self.buy_orders):
            if order.price > existing_order.price:
                idx = i
                break
            elif order.price == existing_order.price:
                if order.timestamp < existing_order.timestamp:
                    idx = i
                    break
                idx = i + 1
            else:
                idx = i + 1
        
        self.buy_orders.insert(idx, order)
    
    def _insert_sell_order(self, order: Order):
        """Insert sell order maintaining price-time priority (ascending price)."""
        # Find insertion point: lower prices first, then earlier timestamps
        idx = 0
        for i, existing_order in enumerate(self.sell_orders):
            if order.price < existing_order.price:
                idx = i
                break
            elif order.price == existing_order.price:
                if order.timestamp < existing_order.timestamp:
                    idx = i
                    break
                idx = i + 1
            else:
                idx = i + 1
        
        self.sell_orders.insert(idx, order)
    
    def _match_order(self, order: Order) -> List[Trade]:
        """
        Match an order against the opposite side of the book.
        
        Args:
            order: Order to match
            
        Returns:
            List of trades executed
        """
        trades = []
        
        if order.side == OrderSide.BUY:
            # Match against sell orders
            opposite_orders = self.sell_orders
        else:
            # Match against buy orders
            opposite_orders = self.buy_orders
        
        # Try to match with existing orders
        i = 0
        while i < len(opposite_orders) and order.is_active:
            opposite = opposite_orders[i]
            
            if not opposite.is_active:
                i += 1
                continue
            
            # Check if prices cross
            can_trade = False
            trade_price = opposite.price
            
            if order.order_type == OrderType.MARKET:
                # Market orders always trade at the best available price
                can_trade = True
                trade_price = opposite.price
            elif order.side == OrderSide.BUY:
                # Buy order: can trade if our price >= sell price
                can_trade = order.price >= opposite.price
                trade_price = opposite.price  # Trade at the limit order price
            else:
                # Sell order: can trade if our price <= buy price
                can_trade = order.price <= opposite.price
                trade_price = opposite.price  # Trade at the limit order price
            
            if not can_trade:
                break
            
            # Execute trade
            trade_qty = min(order.remaining_quantity, opposite.remaining_quantity)
            
            # Fill both orders
            order.fill(trade_qty)
            opposite.fill(trade_qty)
            
            # Record trade
            if order.side == OrderSide.BUY:
                trade = Trade(
                    buy_order_id=order.order_id,
                    sell_order_id=opposite.order_id,
                    buyer_id=order.trader_id,
                    seller_id=opposite.trader_id,
                    price=trade_price,
                    quantity=trade_qty,
                    timestamp=order.timestamp,
                )
            else:
                trade = Trade(
                    buy_order_id=opposite.order_id,
                    sell_order_id=order.order_id,
                    buyer_id=opposite.trader_id,
                    seller_id=order.trader_id,
                    price=trade_price,
                    quantity=trade_qty,
                    timestamp=order.timestamp,
                )
            
            trades.append(trade)
            self.trades.append(trade)
            
            # If opposite order is filled, remove it
            if not opposite.is_active:
                i += 1
            else:
                i += 1
        
        # Clean up filled/cancelled orders
        if order.side == OrderSide.BUY:
            self.sell_orders = [o for o in self.sell_orders if o.is_active]
        else:
            self.buy_orders = [o for o in self.buy_orders if o.is_active]
        
        return trades
    
    def cancel_order(self, order_id: str) -> bool:
        """
        Cancel an order.
        
        Args:
            order_id: ID of order to cancel
            
        Returns:
            True if cancelled, False if not found or already filled
        """
        if order_id not in self.orders:
            return False
        
        order = self.orders[order_id]
        success = order.cancel()
        
        if success:
            # Remove from book
            if order.side == OrderSide.BUY:
                self.buy_orders = [o for o in self.buy_orders if o.order_id != order_id]
            else:
                self.sell_orders = [o for o in self.sell_orders if o.order_id != order_id]
            
            self._update_price_levels()
        
        return success
    
    def get_order(self, order_id: str) -> Optional[Order]:
        """Get an order by ID."""
        return self.orders.get(order_id)
    
    def get_best_bid(self) -> Optional[float]:
        """Get the best (highest) buy price."""
        for order in self.buy_orders:
            if order.is_active and order.price:
                return order.price
        return None
    
    def get_best_ask(self) -> Optional[float]:
        """Get the best (lowest) sell price."""
        for order in self.sell_orders:
            if order.is_active and order.price:
                return order.price
        return None
    
    def get_spread(self) -> Optional[float]:
        """Get the bid-ask spread."""
        bid = self.get_best_bid()
        ask = self.get_best_ask()
        
        if bid and ask:
            return ask - bid
        return None
    
    def get_mid_price(self) -> Optional[float]:
        """Get the mid price between best bid and ask."""
        bid = self.get_best_bid()
        ask = self.get_best_ask()
        
        if bid and ask:
            return (bid + ask) / 2
        return None
    
    def get_order_book_depth(self, levels: int = 10) -> Dict:
        """
        Get order book depth (aggregated by price level).
        
        Args:
            levels: Number of price levels to return on each side
            
        Returns:
            Dictionary with bids and asks
        """
        # Aggregate bids
        bids = []
        for price in sorted(self.buy_price_levels.keys(), reverse=True)[:levels]:
            bids.append({
                "price": price,
                "quantity": self.buy_price_levels[price]
            })
        
        # Aggregate asks
        asks = []
        for price in sorted(self.sell_price_levels.keys())[:levels]:
            asks.append({
                "price": price,
                "quantity": self.sell_price_levels[price]
            })
        
        return {
            "bids": bids,
            "asks": asks,
            "spread": self.get_spread(),
            "mid_price": self.get_mid_price(),
        }
    
    def get_stats(self) -> Dict:
        """Get order book statistics."""
        total_volume = sum(t.quantity for t in self.trades)
        return {
            "total_orders": len(self.orders),
            "active_orders": len([o for o in self.orders.values() if o.is_active]),
            "buy_orders": len(self.buy_orders),
            "sell_orders": len(self.sell_orders),
            "total_trades": len(self.trades),
            "total_volume": total_volume,
            "best_bid": self.get_best_bid(),
            "best_ask": self.get_best_ask(),
            "spread": self.get_spread(),
            "mid_price": self.get_mid_price(),
        }
    
    def clear(self):
        """Clear the order book."""
        self.buy_orders.clear()
        self.sell_orders.clear()
        self.orders.clear()
        self.trades.clear()
        self._update_price_levels()
