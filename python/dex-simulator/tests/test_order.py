"""
Tests for order functionality.
"""

import pytest
from src.order import (
    Order,
    OrderSide,
    OrderType,
    OrderStatus,
    create_order,
)


class TestOrderCreation:
    """Test order creation and validation."""
    
    def test_create_limit_buy_order(self):
        """Test creating a limit buy order."""
        order = create_order(
            side=OrderSide.BUY,
            order_type=OrderType.LIMIT,
            price=100.0,
            quantity=10.0,
            trader_id="trader_1"
        )
        
        assert order.side == OrderSide.BUY
        assert order.order_type == OrderType.LIMIT
        assert order.price == 100.0
        assert order.quantity == 10.0
        assert order.filled_quantity == 0.0
        assert order.status == OrderStatus.ACTIVE
        assert order.trader_id == "trader_1"
    
    def test_create_limit_sell_order(self):
        """Test creating a limit sell order."""
        order = create_order(
            side=OrderSide.SELL,
            order_type=OrderType.LIMIT,
            price=100.0,
            quantity=10.0,
            trader_id="trader_1"
        )
        
        assert order.side == OrderSide.SELL
        assert order.order_type == OrderType.LIMIT
        assert order.price == 100.0
    
    def test_create_market_order(self):
        """Test creating a market order."""
        order = create_order(
            side=OrderSide.BUY,
            order_type=OrderType.MARKET,
            price=None,
            quantity=10.0,
            trader_id="trader_1"
        )
        
        assert order.order_type == OrderType.MARKET
        assert order.price is None
    
    def test_invalid_price_for_limit_order(self):
        """Test that limit orders require a price."""
        with pytest.raises(ValueError, match="Limit orders must have a price"):
            create_order(
                side=OrderSide.BUY,
                order_type=OrderType.LIMIT,
                price=None,
                quantity=10.0,
                trader_id="trader_1"
            )
    
    def test_invalid_negative_price(self):
        """Test that negative prices are rejected."""
        with pytest.raises(ValueError, match="Order price must be positive"):
            create_order(
                side=OrderSide.BUY,
                order_type=OrderType.LIMIT,
                price=-10.0,
                quantity=10.0,
                trader_id="trader_1"
            )
    
    def test_invalid_zero_quantity(self):
        """Test that zero quantity is rejected."""
        with pytest.raises(ValueError, match="Order quantity must be positive"):
            create_order(
                side=OrderSide.BUY,
                order_type=OrderType.LIMIT,
                price=100.0,
                quantity=0.0,
                trader_id="trader_1"
            )
    
    def test_invalid_negative_quantity(self):
        """Test that negative quantity is rejected."""
        with pytest.raises(ValueError, match="Order quantity must be positive"):
            create_order(
                side=OrderSide.BUY,
                order_type=OrderType.LIMIT,
                price=100.0,
                quantity=-10.0,
                trader_id="trader_1"
            )


class TestOrderFilling:
    """Test order filling logic."""
    
    def test_partial_fill(self):
        """Test partially filling an order."""
        order = create_order(
            side=OrderSide.BUY,
            order_type=OrderType.LIMIT,
            price=100.0,
            quantity=10.0,
            trader_id="trader_1"
        )
        
        order.fill(5.0)
        
        assert order.filled_quantity == 5.0
        assert order.remaining_quantity == 5.0
        assert order.status == OrderStatus.PARTIALLY_FILLED
    
    def test_complete_fill(self):
        """Test completely filling an order."""
        order = create_order(
            side=OrderSide.BUY,
            order_type=OrderType.LIMIT,
            price=100.0,
            quantity=10.0,
            trader_id="trader_1"
        )
        
        order.fill(10.0)
        
        assert order.filled_quantity == 10.0
        assert order.remaining_quantity == 0.0
        assert order.status == OrderStatus.FILLED
    
    def test_multiple_partial_fills(self):
        """Test filling an order in multiple steps."""
        order = create_order(
            side=OrderSide.BUY,
            order_type=OrderType.LIMIT,
            price=100.0,
            quantity=10.0,
            trader_id="trader_1"
        )
        
        order.fill(3.0)
        assert order.filled_quantity == 3.0
        assert order.remaining_quantity == 7.0
        assert order.status == OrderStatus.PARTIALLY_FILLED
        
        order.fill(4.0)
        assert order.filled_quantity == 7.0
        assert order.remaining_quantity == 3.0
        assert order.status == OrderStatus.PARTIALLY_FILLED
        
        order.fill(3.0)
        assert order.filled_quantity == 10.0
        assert order.remaining_quantity == 0.0
        assert order.status == OrderStatus.FILLED
    
    def test_overfill_raises_error(self):
        """Test that overfilling raises an error."""
        order = create_order(
            side=OrderSide.BUY,
            order_type=OrderType.LIMIT,
            price=100.0,
            quantity=10.0,
            trader_id="trader_1"
        )
        
        with pytest.raises(ValueError, match="Fill quantity .* exceeds remaining"):
            order.fill(15.0)
    
    def test_fill_cancelled_order_raises_error(self):
        """Test that filling a cancelled order raises an error."""
        order = create_order(
            side=OrderSide.BUY,
            order_type=OrderType.LIMIT,
            price=100.0,
            quantity=10.0,
            trader_id="trader_1"
        )
        
        order.cancel()
        
        with pytest.raises(ValueError, match="Cannot fill .* order"):
            order.fill(5.0)


class TestOrderCancellation:
    """Test order cancellation logic."""
    
    def test_cancel_active_order(self):
        """Test cancelling an active order."""
        order = create_order(
            side=OrderSide.BUY,
            order_type=OrderType.LIMIT,
            price=100.0,
            quantity=10.0,
            trader_id="trader_1"
        )
        
        order.cancel()
        
        assert order.status == OrderStatus.CANCELLED
    
    def test_cancel_partially_filled_order(self):
        """Test cancelling a partially filled order."""
        order = create_order(
            side=OrderSide.BUY,
            order_type=OrderType.LIMIT,
            price=100.0,
            quantity=10.0,
            trader_id="trader_1"
        )
        
        order.fill(5.0)
        order.cancel()
        
        assert order.status == OrderStatus.CANCELLED
        assert order.filled_quantity == 5.0
    
    def test_cancel_filled_order_raises_error(self):
        """Test that cancelling a filled order raises an error."""
        order = create_order(
            side=OrderSide.BUY,
            order_type=OrderType.LIMIT,
            price=100.0,
            quantity=10.0,
            trader_id="trader_1"
        )
        
        order.fill(10.0)
        
        with pytest.raises(ValueError, match="Cannot cancel .* order"):
            order.cancel()
    
    def test_cancel_already_cancelled_order_raises_error(self):
        """Test that cancelling an already cancelled order raises an error."""
        order = create_order(
            side=OrderSide.BUY,
            order_type=OrderType.LIMIT,
            price=100.0,
            quantity=10.0,
            trader_id="trader_1"
        )
        
        order.cancel()
        
        with pytest.raises(ValueError, match="Cannot cancel .* order"):
            order.cancel()


class TestOrderProperties:
    """Test order property calculations."""
    
    def test_remaining_quantity_unfilled(self):
        """Test remaining quantity for unfilled order."""
        order = create_order(
            side=OrderSide.BUY,
            order_type=OrderType.LIMIT,
            price=100.0,
            quantity=10.0,
            trader_id="trader_1"
        )
        
        assert order.remaining_quantity == 10.0
    
    def test_remaining_quantity_partially_filled(self):
        """Test remaining quantity for partially filled order."""
        order = create_order(
            side=OrderSide.BUY,
            order_type=OrderType.LIMIT,
            price=100.0,
            quantity=10.0,
            trader_id="trader_1"
        )
        
        order.fill(3.0)
        assert order.remaining_quantity == 7.0
    
    def test_remaining_quantity_filled(self):
        """Test remaining quantity for filled order."""
        order = create_order(
            side=OrderSide.BUY,
            order_type=OrderType.LIMIT,
            price=100.0,
            quantity=10.0,
            trader_id="trader_1"
        )
        
        order.fill(10.0)
        assert order.remaining_quantity == 0.0
