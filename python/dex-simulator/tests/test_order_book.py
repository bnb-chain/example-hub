"""
Tests for order book functionality.
"""

import pytest
from src.order import OrderSide, OrderType, create_order
from src.order_book import OrderBook, Trade


class TestOrderBookBasics:
    """Test basic order book functionality."""
    
    def test_create_order_book(self):
        """Test creating an order book."""
        ob = OrderBook(initial_price=100.0)
        
        assert ob.initial_price == 100.0
        assert len(ob.buy_orders) == 0
        assert len(ob.sell_orders) == 0
        assert ob.order_count == 0
        assert len(ob.trades) == 0
    
    def test_place_limit_buy_order(self):
        """Test placing a limit buy order."""
        ob = OrderBook(initial_price=100.0)
        
        order = create_order(
            side=OrderSide.BUY,
            order_type=OrderType.LIMIT,
            price=99.0,
            quantity=10.0,
            trader_id="trader_1"
        )
        
        trades = ob.place_order(order)
        
        assert len(trades) == 0
        assert len(ob.buy_orders) == 1
        assert ob.order_count == 1
    
    def test_place_limit_sell_order(self):
        """Test placing a limit sell order."""
        ob = OrderBook(initial_price=100.0)
        
        order = create_order(
            side=OrderSide.SELL,
            order_type=OrderType.LIMIT,
            price=101.0,
            quantity=10.0,
            trader_id="trader_1"
        )
        
        trades = ob.place_order(order)
        
        assert len(trades) == 0
        assert len(ob.sell_orders) == 1
        assert ob.order_count == 1


class TestOrderBookMatching:
    """Test order matching logic."""
    
    def test_match_limit_orders_exact(self):
        """Test matching two limit orders with exact quantities."""
        ob = OrderBook(initial_price=100.0)
        
        # Place buy order
        buy_order = create_order(
            side=OrderSide.BUY,
            order_type=OrderType.LIMIT,
            price=100.0,
            quantity=10.0,
            trader_id="trader_1"
        )
        ob.place_order(buy_order)
        
        # Place matching sell order
        sell_order = create_order(
            side=OrderSide.SELL,
            order_type=OrderType.LIMIT,
            price=100.0,
            quantity=10.0,
            trader_id="trader_2"
        )
        trades = ob.place_order(sell_order)
        
        assert len(trades) == 1
        assert trades[0].quantity == 10.0
        assert trades[0].price == 100.0
        assert len(ob.buy_orders) == 0
        assert len(ob.sell_orders) == 0
    
    def test_match_limit_orders_partial_taker(self):
        """Test matching where taker order is partially filled."""
        ob = OrderBook(initial_price=100.0)
        
        # Place buy order
        buy_order = create_order(
            side=OrderSide.BUY,
            order_type=OrderType.LIMIT,
            price=100.0,
            quantity=15.0,
            trader_id="trader_1"
        )
        ob.place_order(buy_order)
        
        # Place smaller sell order
        sell_order = create_order(
            side=OrderSide.SELL,
            order_type=OrderType.LIMIT,
            price=100.0,
            quantity=10.0,
            trader_id="trader_2"
        )
        trades = ob.place_order(sell_order)
        
        assert len(trades) == 1
        assert trades[0].quantity == 10.0
        assert len(ob.buy_orders) == 1
        assert ob.buy_orders[0].remaining_quantity == 5.0
        assert len(ob.sell_orders) == 0
    
    def test_match_limit_orders_partial_maker(self):
        """Test matching where maker order is partially filled."""
        ob = OrderBook(initial_price=100.0)
        
        # Place buy order
        buy_order = create_order(
            side=OrderSide.BUY,
            order_type=OrderType.LIMIT,
            price=100.0,
            quantity=10.0,
            trader_id="trader_1"
        )
        ob.place_order(buy_order)
        
        # Place larger sell order
        sell_order = create_order(
            side=OrderSide.SELL,
            order_type=OrderType.LIMIT,
            price=100.0,
            quantity=15.0,
            trader_id="trader_2"
        )
        trades = ob.place_order(sell_order)
        
        assert len(trades) == 1
        assert trades[0].quantity == 10.0
        assert len(ob.buy_orders) == 0
        assert len(ob.sell_orders) == 1
        assert ob.sell_orders[0].remaining_quantity == 5.0
    
    def test_match_multiple_makers(self):
        """Test matching against multiple maker orders."""
        ob = OrderBook(initial_price=100.0)
        
        # Place multiple buy orders
        for i in range(3):
            order = create_order(
                side=OrderSide.BUY,
                order_type=OrderType.LIMIT,
                price=100.0,
                quantity=5.0,
                trader_id=f"trader_{i+1}"
            )
            ob.place_order(order)
        
        # Place sell order that matches all
        sell_order = create_order(
            side=OrderSide.SELL,
            order_type=OrderType.LIMIT,
            price=100.0,
            quantity=15.0,
            trader_id="seller"
        )
        trades = ob.place_order(sell_order)
        
        assert len(trades) == 3
        assert sum(t.quantity for t in trades) == 15.0
        assert len(ob.buy_orders) == 0
        assert len(ob.sell_orders) == 0
    
    def test_no_match_prices_dont_cross(self):
        """Test that orders don't match when prices don't cross."""
        ob = OrderBook(initial_price=100.0)
        
        # Place buy order at 99
        buy_order = create_order(
            side=OrderSide.BUY,
            order_type=OrderType.LIMIT,
            price=99.0,
            quantity=10.0,
            trader_id="trader_1"
        )
        ob.place_order(buy_order)
        
        # Place sell order at 101
        sell_order = create_order(
            side=OrderSide.SELL,
            order_type=OrderType.LIMIT,
            price=101.0,
            quantity=10.0,
            trader_id="trader_2"
        )
        trades = ob.place_order(sell_order)
        
        assert len(trades) == 0
        assert len(ob.buy_orders) == 1
        assert len(ob.sell_orders) == 1
    
    def test_market_order_buy(self):
        """Test market buy order execution."""
        ob = OrderBook(initial_price=100.0)
        
        # Place sell orders
        for i in range(3):
            order = create_order(
                side=OrderSide.SELL,
                order_type=OrderType.LIMIT,
                price=100.0 + i,
                quantity=10.0,
                trader_id=f"seller_{i+1}"
            )
            ob.place_order(order)
        
        # Place market buy order
        market_order = create_order(
            side=OrderSide.BUY,
            order_type=OrderType.MARKET,
            price=None,
            quantity=25.0,
            trader_id="buyer"
        )
        trades = ob.place_order(market_order)
        
        assert len(trades) == 3
        assert sum(t.quantity for t in trades) == 25.0
        # Should match at best prices first
        assert trades[0].price == 100.0
        assert trades[1].price == 101.0
        assert trades[2].price == 102.0
    
    def test_market_order_sell(self):
        """Test market sell order execution."""
        ob = OrderBook(initial_price=100.0)
        
        # Place buy orders
        for i in range(3):
            order = create_order(
                side=OrderSide.BUY,
                order_type=OrderType.LIMIT,
                price=100.0 - i,
                quantity=10.0,
                trader_id=f"buyer_{i+1}"
            )
            ob.place_order(order)
        
        # Place market sell order
        market_order = create_order(
            side=OrderSide.SELL,
            order_type=OrderType.MARKET,
            price=None,
            quantity=25.0,
            trader_id="seller"
        )
        trades = ob.place_order(market_order)
        
        assert len(trades) == 3
        assert sum(t.quantity for t in trades) == 25.0
        # Should match at best prices first
        assert trades[0].price == 100.0
        assert trades[1].price == 99.0
        assert trades[2].price == 98.0


class TestOrderBookPriceTimePriority:
    """Test price-time priority matching."""
    
    def test_price_priority(self):
        """Test that better prices match first."""
        ob = OrderBook(initial_price=100.0)
        
        # Place buy orders at different prices
        order1 = create_order(
            side=OrderSide.BUY,
            order_type=OrderType.LIMIT,
            price=99.0,
            quantity=10.0,
            trader_id="trader_1"
        )
        order2 = create_order(
            side=OrderSide.BUY,
            order_type=OrderType.LIMIT,
            price=100.0,
            quantity=10.0,
            trader_id="trader_2"
        )
        ob.place_order(order1)
        ob.place_order(order2)
        
        # Place sell order
        sell_order = create_order(
            side=OrderSide.SELL,
            order_type=OrderType.LIMIT,
            price=99.0,
            quantity=10.0,
            trader_id="seller"
        )
        trades = ob.place_order(sell_order)
        
        # Should match with higher price (100.0) first
        assert len(trades) == 1
        assert trades[0].price == 100.0
        assert trades[0].buyer_id == "trader_2"
    
    def test_time_priority(self):
        """Test that earlier orders match first at same price."""
        ob = OrderBook(initial_price=100.0)
        
        # Place buy orders at same price
        order1 = create_order(
            side=OrderSide.BUY,
            order_type=OrderType.LIMIT,
            price=100.0,
            quantity=10.0,
            trader_id="trader_1"
        )
        order2 = create_order(
            side=OrderSide.BUY,
            order_type=OrderType.LIMIT,
            price=100.0,
            quantity=10.0,
            trader_id="trader_2"
        )
        ob.place_order(order1)
        ob.place_order(order2)
        
        # Place sell order
        sell_order = create_order(
            side=OrderSide.SELL,
            order_type=OrderType.LIMIT,
            price=100.0,
            quantity=10.0,
            trader_id="seller"
        )
        trades = ob.place_order(sell_order)
        
        # Should match with first order
        assert len(trades) == 1
        assert trades[0].buyer_id == "trader_1"


class TestOrderBookDepth:
    """Test order book depth aggregation."""
    
    def test_get_order_book_depth(self):
        """Test getting aggregated order book depth."""
        ob = OrderBook(initial_price=100.0)
        
        # Place buy orders
        for i in range(5):
            order = create_order(
                side=OrderSide.BUY,
                order_type=OrderType.LIMIT,
                price=100.0 - i,
                quantity=10.0,
                trader_id=f"buyer_{i+1}"
            )
            ob.place_order(order)
        
        # Place sell orders
        for i in range(5):
            order = create_order(
                side=OrderSide.SELL,
                order_type=OrderType.LIMIT,
                price=101.0 + i,
                quantity=10.0,
                trader_id=f"seller_{i+1}"
            )
            ob.place_order(order)
        
        depth = ob.get_order_book_depth(levels=5)
        
        assert len(depth["bids"]) == 5
        assert len(depth["asks"]) == 5
        assert depth["bids"][0]["price"] == 100.0
        assert depth["asks"][0]["price"] == 101.0
        assert depth["mid_price"] == 100.5


class TestOrderBookStats:
    """Test order book statistics."""
    
    def test_get_stats_empty(self):
        """Test stats for empty order book."""
        ob = OrderBook(initial_price=100.0)
        
        stats = ob.get_stats()
        
        assert stats["total_orders"] == 0
        assert stats["active_orders"] == 0
        assert stats["total_trades"] == 0
        assert stats["best_bid"] is None
        assert stats["best_ask"] is None
        assert stats["spread"] is None
        assert stats["mid_price"] is None
    
    def test_get_stats_with_orders(self):
        """Test stats with active orders."""
        ob = OrderBook(initial_price=100.0)
        
        # Place orders
        buy_order = create_order(
            side=OrderSide.BUY,
            order_type=OrderType.LIMIT,
            price=99.0,
            quantity=10.0,
            trader_id="buyer"
        )
        sell_order = create_order(
            side=OrderSide.SELL,
            order_type=OrderType.LIMIT,
            price=101.0,
            quantity=10.0,
            trader_id="seller"
        )
        ob.place_order(buy_order)
        ob.place_order(sell_order)
        
        stats = ob.get_stats()
        
        assert stats["total_orders"] == 2
        assert stats["active_orders"] == 2
        assert stats["best_bid"] == 99.0
        assert stats["best_ask"] == 101.0
        assert stats["spread"] == 2.0
        assert stats["mid_price"] == 100.0
    
    def test_get_stats_after_trade(self):
        """Test stats after trades are executed."""
        ob = OrderBook(initial_price=100.0)
        
        # Place and match orders
        buy_order = create_order(
            side=OrderSide.BUY,
            order_type=OrderType.LIMIT,
            price=100.0,
            quantity=10.0,
            trader_id="buyer"
        )
        ob.place_order(buy_order)
        
        sell_order = create_order(
            side=OrderSide.SELL,
            order_type=OrderType.LIMIT,
            price=100.0,
            quantity=10.0,
            trader_id="seller"
        )
        ob.place_order(sell_order)
        
        stats = ob.get_stats()
        
        assert stats["total_orders"] == 2
        assert stats["active_orders"] == 0
        assert stats["total_trades"] == 1
        assert stats["total_volume"] == 10.0
