"""
Order data structures for the DEX simulator.

Defines order types, sides, and the Order class.
"""

from enum import Enum
from dataclasses import dataclass
from typing import Optional
from datetime import datetime
import uuid


class OrderSide(Enum):
    """Order side: BUY or SELL."""
    BUY = "BUY"
    SELL = "SELL"


class OrderType(Enum):
    """Order type: LIMIT or MARKET."""
    LIMIT = "LIMIT"
    MARKET = "MARKET"


class OrderStatus(Enum):
    """Order status."""
    ACTIVE = "ACTIVE"
    PARTIALLY_FILLED = "PARTIALLY_FILLED"
    FILLED = "FILLED"
    CANCELLED = "CANCELLED"


@dataclass
class Order:
    """
    Represents a single order in the order book.
    
    Attributes:
        order_id: Unique identifier for the order
        trader_id: ID of the trader who placed the order
        side: BUY or SELL
        order_type: LIMIT or MARKET
        price: Limit price (None for market orders)
        quantity: Order size
        timestamp: When the order was created
        status: Current order status
        filled_quantity: How much has been filled
    """
    
    order_id: str
    trader_id: str
    side: OrderSide
    order_type: OrderType
    quantity: float
    price: Optional[float] = None
    timestamp: datetime = None
    status: OrderStatus = OrderStatus.ACTIVE
    filled_quantity: float = 0.0
    
    def __post_init__(self):
        """Initialize defaults after dataclass creation."""
        if self.timestamp is None:
            self.timestamp = datetime.now()
        
        # Market orders shouldn't have a price
        if self.order_type == OrderType.MARKET and self.price is not None:
            self.price = None
        
        # Limit orders must have a price
        if self.order_type == OrderType.LIMIT and self.price is None:
            raise ValueError("Limit orders must have a price")
        
        # Validate quantity
        if self.quantity <= 0:
            raise ValueError("Order quantity must be positive")
        
        # Validate price if provided
        if self.price is not None and self.price <= 0:
            raise ValueError("Order price must be positive")
    
    @property
    def remaining_quantity(self) -> float:
        """Calculate remaining unfilled quantity."""
        return self.quantity - self.filled_quantity
    
    @property
    def is_filled(self) -> bool:
        """Check if order is completely filled."""
        return self.filled_quantity >= self.quantity
    
    @property
    def is_active(self) -> bool:
        """Check if order is still active (not filled or cancelled)."""
        return self.status in [OrderStatus.ACTIVE, OrderStatus.PARTIALLY_FILLED]
    
    def fill(self, quantity: float) -> float:
        """
        Fill part or all of the order.
        
        Args:
            quantity: Amount to fill
            
        Returns:
            Actual amount filled
            
        Raises:
            ValueError: If trying to fill more than remaining quantity or if order is not active
        """
        if not self.is_active:
            raise ValueError(f"Cannot fill {self.status.value} order")
        
        if quantity <= 0:
            raise ValueError("Fill quantity must be positive")
        
        if quantity > self.remaining_quantity:
            raise ValueError(f"Fill quantity {quantity} exceeds remaining {self.remaining_quantity}")
        
        self.filled_quantity += quantity
        
        # Update status
        if self.is_filled:
            self.status = OrderStatus.FILLED
        elif self.filled_quantity > 0:
            self.status = OrderStatus.PARTIALLY_FILLED
        
        return quantity
    
    def cancel(self):
        """
        Cancel the order.
        
        Raises:
            ValueError: If order is already filled or cancelled
        """
        if self.status in [OrderStatus.FILLED, OrderStatus.CANCELLED]:
            raise ValueError(f"Cannot cancel {self.status.value} order")
        
        self.status = OrderStatus.CANCELLED
    
    def to_dict(self) -> dict:
        """Convert order to dictionary representation."""
        return {
            "order_id": self.order_id,
            "trader_id": self.trader_id,
            "side": self.side.value,
            "order_type": self.order_type.value,
            "price": self.price,
            "quantity": self.quantity,
            "filled_quantity": self.filled_quantity,
            "remaining_quantity": self.remaining_quantity,
            "status": self.status.value,
            "timestamp": self.timestamp.isoformat(),
        }
    
    def __repr__(self) -> str:
        """String representation of order."""
        price_str = f"${self.price:.2f}" if self.price else "MARKET"
        return (
            f"Order({self.order_id[:8]}... {self.side.value} {self.quantity:.2f} @ {price_str}, "
            f"filled={self.filled_quantity:.2f}, {self.status.value})"
        )


def create_order(
    trader_id: str = None,
    side: OrderSide = None,
    order_type: OrderType = None,
    quantity: float = None,
    price: Optional[float] = None,
) -> Order:
    """
    Factory function to create an order.
    
    Args:
        trader_id: ID of the trader
        side: OrderSide enum (BUY or SELL)
        order_type: OrderType enum (LIMIT or MARKET)
        quantity: Order size
        price: Price (required for LIMIT orders)
        
    Returns:
        New Order instance
    """
    order_id = str(uuid.uuid4())
    
    # Allow string input for backward compatibility
    if isinstance(side, str):
        side = OrderSide[side.upper()]
    if isinstance(order_type, str):
        order_type = OrderType[order_type.upper()]
    
    return Order(
        order_id=order_id,
        trader_id=trader_id,
        side=side,
        order_type=order_type,
        quantity=quantity,
        price=price,
    )
