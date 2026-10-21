"""
Tests for simulator functionality.
"""

import pytest
from src.simulator import DEXSimulator, Trader
from src.order_book import OrderBook


class TestTrader:
    """Test trader functionality."""
    
    def test_create_trader(self):
        """Test creating a trader."""
        trader = Trader(
            trader_id="trader_1",
            strategy="random",
            initial_balance=10000.0
        )
        
        assert trader.trader_id == "trader_1"
        assert trader.strategy == "random"
        assert trader.balance == 10000.0
        assert trader.position == 0.0
    
    def test_trader_strategies(self):
        """Test different trader strategies."""
        ob = OrderBook(initial_price=100.0)
        
        # Test random strategy
        trader1 = Trader("trader_1", "random", 10000.0)
        order1 = trader1.generate_order(ob, step=1)
        if order1:
            assert order1.trader_id == "trader_1"
        
        # Test market maker strategy
        trader2 = Trader("trader_2", "market_maker", 10000.0)
        order2 = trader2.generate_order(ob, step=1)
        if order2:
            assert order2.trader_id == "trader_2"
        
        # Test momentum strategy
        trader3 = Trader("trader_3", "momentum", 10000.0)
        order3 = trader3.generate_order(ob, step=1)
        if order3:
            assert order3.trader_id == "trader_3"
    
    def test_trader_invalid_strategy(self):
        """Test that invalid strategy raises error."""
        with pytest.raises(ValueError, match="Unknown strategy"):
            trader = Trader("trader_1", "invalid", 10000.0)
            ob = OrderBook(initial_price=100.0)
            trader.generate_order(ob, step=1)


class TestDEXSimulator:
    """Test DEX simulator functionality."""
    
    def test_create_simulator(self):
        """Test creating a simulator."""
        sim = DEXSimulator(initial_price=100.0)
        
        assert sim.order_book.initial_price == 100.0
        assert len(sim.traders) == 0
        assert sim.step_count == 0
        assert len(sim.price_history) == 1
        assert sim.price_history[0] == 100.0
    
    def test_add_traders(self):
        """Test adding traders to simulator."""
        sim = DEXSimulator(initial_price=100.0)
        
        trader1 = Trader("trader_1", "random", 10000.0)
        trader2 = Trader("trader_2", "market_maker", 10000.0)
        
        sim.add_trader(trader1)
        sim.add_trader(trader2)
        
        assert len(sim.traders) == 2
    
    def test_reset_simulator(self):
        """Test resetting simulator state."""
        sim = DEXSimulator(initial_price=100.0)
        
        trader = Trader("trader_1", "random", 10000.0)
        sim.add_trader(trader)
        
        # Run some steps
        sim.run(steps=10, verbose=False)
        
        assert sim.step_count == 10
        assert len(sim.price_history) > 1
        
        # Reset
        sim.reset()
        
        assert sim.step_count == 0
        assert len(sim.price_history) == 1
        assert len(sim.snapshots) == 0
    
    def test_step_execution(self):
        """Test single step execution."""
        sim = DEXSimulator(initial_price=100.0)
        
        trader = Trader("trader_1", "random", 10000.0)
        sim.add_trader(trader)
        
        # Execute one step
        snapshot = sim.step()
        
        assert sim.step_count == 1
        assert "price" in snapshot
        assert "volume" in snapshot
        assert "orders_placed" in snapshot
        assert "trades_executed" in snapshot
    
    def test_run_simulation(self):
        """Test running full simulation."""
        sim = DEXSimulator(initial_price=100.0)
        
        # Add multiple traders
        for i in range(3):
            trader = Trader(f"trader_{i+1}", "random", 10000.0)
            sim.add_trader(trader)
        
        # Run simulation
        snapshots = sim.run(steps=20, verbose=False)
        
        assert sim.step_count == 20
        assert len(snapshots) == 20
        assert len(sim.price_history) == 21  # Initial + 20 steps
        assert len(sim.volume_history) == 20
    
    def test_get_summary(self):
        """Test getting simulation summary."""
        sim = DEXSimulator(initial_price=100.0)
        
        trader = Trader("trader_1", "random", 10000.0)
        sim.add_trader(trader)
        
        # Run simulation
        sim.run(steps=10, verbose=False)
        
        # Get summary
        summary = sim.get_summary()
        
        assert summary["total_steps"] == 10
        assert summary["initial_price"] == 100.0
        assert "final_price" in summary
        assert "price_change" in summary
        assert "price_change_pct" in summary
        assert "total_volume" in summary
        assert "avg_volume_per_step" in summary
        assert "total_trades" in summary
        assert "total_orders" in summary
        assert "active_orders" in summary
    
    def test_price_tracking(self):
        """Test that price history is tracked correctly."""
        sim = DEXSimulator(initial_price=100.0)
        
        trader = Trader("trader_1", "random", 10000.0)
        sim.add_trader(trader)
        
        initial_price = sim.price_history[0]
        
        # Run simulation
        sim.run(steps=5, verbose=False)
        
        assert len(sim.price_history) == 6  # Initial + 5 steps
        assert sim.price_history[0] == initial_price
    
    def test_volume_tracking(self):
        """Test that volume history is tracked correctly."""
        sim = DEXSimulator(initial_price=100.0)
        
        trader = Trader("trader_1", "random", 10000.0)
        sim.add_trader(trader)
        
        # Run simulation
        sim.run(steps=5, verbose=False)
        
        assert len(sim.volume_history) == 5
        # All volumes should be non-negative
        assert all(v >= 0 for v in sim.volume_history)


class TestSimulatorIntegration:
    """Integration tests for full simulation scenarios."""
    
    def test_mixed_strategies_simulation(self):
        """Test simulation with mixed trading strategies."""
        sim = DEXSimulator(initial_price=100.0)
        
        # Add traders with different strategies
        sim.add_trader(Trader("random_1", "random", 10000.0))
        sim.add_trader(Trader("mm_1", "market_maker", 10000.0))
        sim.add_trader(Trader("momentum_1", "momentum", 10000.0))
        
        # Run simulation
        snapshots = sim.run(steps=50, verbose=False)
        
        assert len(snapshots) == 50
        assert sim.step_count == 50
        
        # Check that some trading occurred
        summary = sim.get_summary()
        assert summary["total_orders"] > 0
    
    def test_long_simulation(self):
        """Test longer simulation for stability."""
        sim = DEXSimulator(initial_price=100.0)
        
        # Add several traders
        for i in range(5):
            strategy = ["random", "market_maker", "momentum"][i % 3]
            sim.add_trader(Trader(f"trader_{i+1}", strategy, 10000.0))
        
        # Run longer simulation
        sim.run(steps=100, verbose=False)
        
        assert sim.step_count == 100
        
        # Verify price is still reasonable
        summary = sim.get_summary()
        assert summary["final_price"] > 0
        assert summary["final_price"] < summary["initial_price"] * 2
    
    def test_snapshot_recording(self):
        """Test that snapshots are recorded correctly."""
        sim = DEXSimulator(initial_price=100.0)
        
        sim.add_trader(Trader("trader_1", "random", 10000.0))
        
        # Run with snapshot recording
        snapshots = sim.run(steps=10, verbose=False)
        
        assert len(snapshots) == 10
        assert len(sim.snapshots) == 10
        
        # Verify snapshot structure
        for snapshot in snapshots:
            assert "step" in snapshot
            assert "price" in snapshot
            assert "volume" in snapshot
            assert "orders_placed" in snapshot
            assert "trades_executed" in snapshot
            assert "stats" in snapshot
