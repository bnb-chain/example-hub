# DEX Simulator

**Educational decentralized exchange (DEX) order book simulator with price-time priority matching engine.**

A Python-based order book simulator that demonstrates how decentralized exchanges match orders and execute trades. Features automated traders with different strategies, real-time visualization, and comprehensive testing. Perfect for learning order book mechanics and testing trading strategies in a controlled environment.

## Features

### Core Functionality

- **Order Book with Price-Time Priority**: Implements industry-standard matching logic where better prices match first, and earlier orders match before later ones at the same price
- **Multiple Order Types**: Support for limit orders (specify price) and market orders (execute immediately at best available price)
- **Automated Traders**: Simulated traders with three distinct strategies:
  - **Random**: Places random buy/sell orders with 50% probability
  - **Market Maker**: Provides liquidity by placing orders on both sides
  - **Momentum**: Follows market trends with directional orders
- **Order Book Depth**: View aggregated liquidity at each price level
- **Trade History**: Complete record of all executed trades
- **Statistics Tracking**: Monitor spread, volume, price movements, and order counts

### Interactive CLI

- **Manual Trading Mode**: Place and cancel orders interactively
- **Automated Simulation**: Run multi-step simulations with multiple traders
- **Visualization**: Text-based order book display and optional matplotlib charts
- **Statistics Dashboard**: Real-time order book metrics

### Visualization

- Order book depth charts (cumulative bid/ask visualization)
- Price history over time
- Trading volume per simulation step
- Text-based order book display for terminal use

## Installation

### Using uv (Recommended)

```bash
cd python/dex-simulator
uv venv
uv pip install -e .
```

### Using pip

```bash
cd python/dex-simulator
python -m venv venv
venv\Scripts\activate  # On Windows
# source venv/bin/activate  # On Unix
pip install -e .
```

### Optional Dependencies

For visualization features (matplotlib charts):

```bash
pip install matplotlib numpy
```

## Quick Start

### 1. Configure Settings

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` to customize simulation parameters:

```bash
# Initial asset price
INITIAL_PRICE=100.0

# Number of automated traders
NUM_TRADERS=5

# Simulation duration (steps)
NUM_STEPS=100

# Order size constraints
MIN_ORDER_SIZE=1.0
MAX_ORDER_SIZE=50.0

# Price volatility factor
PRICE_VOLATILITY=0.02
```

### 2. Run Interactive Trading

```bash
python main.py manual
```

This opens an interactive terminal where you can:

- Place limit buy/sell orders: `buy 99.50 10.0`
- Execute market orders: `market buy 5.0`
- View order book: `book`
- Check statistics: `stats`

### 3. Run Automated Simulation

```bash
# Run 100-step simulation
python main.py simulate --steps 100

# Show detailed step-by-step output
python main.py simulate --steps 50 --verbose

# Save visualization to file
python main.py simulate --steps 100 --output results.png

# Show final order book state
python main.py simulate --steps 100 --show-book
```

### 4. Visualize Order Book

```bash
# Text-based visualization
python main.py visualize --levels 10

# Save matplotlib chart
python main.py visualize --output orderbook.png

# Text only (no matplotlib)
python main.py visualize --no-plot
```

### 5. View Statistics

```bash
python main.py stats
```

## Project Structure

```
dex-simulator/
├── src/
│   ├── __init__.py           # Package initialization
│   ├── order.py              # Order dataclass and enums
│   ├── order_book.py         # Order book and matching engine
│   ├── simulator.py          # Simulation engine and traders
│   ├── visualizer.py         # Visualization utilities
│   └── utils.py              # Configuration and helpers
├── tests/
│   ├── __init__.py
│   ├── test_order.py         # Order validation tests
│   ├── test_order_book.py    # Matching engine tests
│   ├── test_simulator.py     # Simulation tests
│   └── test_utils.py         # Utility function tests
├── main.py                   # CLI entry point
├── pyproject.toml            # Project metadata and dependencies
├── .env.example              # Example configuration
├── .gitignore                # Git ignore patterns
└── README.md                 # This file
```

## How It Works

### Order Book Matching Engine

The order book implements **price-time priority** matching:

1. **Price Priority**: Better prices match first

   - Buy orders: highest price has priority
   - Sell orders: lowest price has priority

2. **Time Priority**: At the same price, earlier orders match first

   - Orders are stored in submission order
   - First in, first out (FIFO) at each price level

3. **Matching Logic**:
   - Buy order matches if bid price ≥ ask price
   - Sell order matches if ask price ≤ bid price
   - Market orders execute immediately at best available price
   - Partial fills supported for large orders

### Trading Strategies

**Random Strategy**:

- 50% chance to generate an order each step
- Randomly chooses buy or sell
- Random price within ±5% of current price
- Random quantity between min and max order size

**Market Maker Strategy**:

- Places orders on both sides of the market
- Buy order slightly below current price
- Sell order slightly above current price
- Provides liquidity and earns the spread

**Momentum Strategy**:

- Analyzes recent price movements
- Places market orders in trending direction
- Uptrend → market buy
- Downtrend → market sell
- Sideways → no action

### Simulation Flow

1. **Initialize**: Create order book at initial price
2. **Seed**: Place initial buy/sell orders to establish market
3. **For Each Step**:
   - Each trader generates an order (strategy-dependent)
   - Orders are placed in the order book
   - Matching engine executes trades
   - Price and volume are recorded
   - Statistics are updated
4. **Summary**: Calculate total volume, price change, trade count

## Running Tests

Run the full test suite with coverage:

```bash
python -m pytest --cov=src --cov-report=term-missing
```

Run specific test modules:

```bash
# Test order logic
python -m pytest tests/test_order.py -v

# Test matching engine
python -m pytest tests/test_order_book.py -v

# Test simulation
python -m pytest tests/test_simulator.py -v
```

Run tests for a specific function:

```bash
python -m pytest tests/test_order_book.py::TestOrderBookMatching::test_match_limit_orders_exact -v
```

## Example Output

### Simulation Summary

```
🎮 Starting DEX Simulation
   Initial Price: $100.00
   Traders: 5
   Steps: 100

============================================================
SIMULATION SUMMARY
============================================================
Total Steps: 100
Initial Price: $100.00
Final Price: $101.25
Price Change: $1.25 (1.25%)
Total Volume: 847.50
Avg Volume per Step: 8.48
Total Trades: 156
Total Orders: 289
Active Orders: 12
============================================================
```

### Order Book Visualization

```
======================================================================
ORDER BOOK
======================================================================
Best Bid: $99.50  |  Best Ask: $100.50  |  Spread: $1.00
Mid Price: $100.00
Total Orders: 24  |  Active: 24  |  Trades: 0
----------------------------------------------------------------------
BIDS                           | ASKS
Price      Quantity            | Price      Quantity
----------------------------------------------------------------------
$99.50     15.00               | $100.50    12.00
$99.00     20.00               | $101.00    18.00
$98.50     25.00               | $101.50    22.00
$98.00     30.00               | $102.00    25.00
$97.50     35.00               | $102.50    28.00
======================================================================
```

## Troubleshooting

### Import Errors

If you see `ModuleNotFoundError`:

```bash
# Make sure you're in the dex-simulator directory
cd python/dex-simulator

# Install in editable mode
pip install -e .
```

### Pytest Not Found

```bash
# Install pytest
pip install pytest pytest-cov

# Run with python -m prefix
python -m pytest
```

### Matplotlib Errors

Visualization features are optional. If matplotlib is not installed:

```bash
pip install matplotlib numpy
```

Or use text-only visualization:

```bash
python main.py visualize --no-plot
```

### Configuration Issues

If simulation behaves unexpectedly, check your `.env` file:

```bash
# Reset to defaults
cp .env.example .env
```

## Resources

### Learn More About Order Books

- [How Order Books Work](https://www.investopedia.com/terms/o/order-book.asp)
- [Price-Time Priority Explained](https://en.wikipedia.org/wiki/Order_matching_system)
- [DEX Architecture](https://chain.link/education-hub/what-is-decentralized-exchange-dex)

### BNB Chain Documentation

- [BNB Chain Developer Docs](https://docs.bnbchain.org/)
- [Smart Chain Guide](https://academy.binance.com/en/articles/how-to-get-started-with-binance-smart-chain-bsc)
- [Web3 Development](https://docs.bnbchain.org/docs/learn/ecosystem)

### Related Examples

- [BNB Chain Example Hub](https://github.com/bnb-chain/example-hub)
- [Trading Bot Examples](https://github.com/bnb-chain/example-hub/tree/main/python)
- [DeFi Integration Examples](https://github.com/bnb-chain/example-hub/tree/main/typescript)

## Disclaimer

**This is an educational tool for learning purposes only.**

- This simulator is designed to teach order book mechanics and trading concepts
- It does not connect to any real blockchain or exchange
- Do not use this code in production trading systems without proper modifications
- No real assets are at risk in this simulation
- Past simulated performance does not indicate future results

For production DEX development on BNB Chain, please refer to:

- [Official BNB Chain Documentation](https://docs.bnbchain.org/)
- [Security Best Practices](https://docs.bnbchain.org/docs/learn/security)
- [Smart Contract Auditing Guidelines](https://docs.bnbchain.org/docs/dev-outlook/audits)

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! This project is part of the BNB Chain Example Hub. To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass: `python -m pytest`
6. Submit a pull request

## Support

- **Issues**: [GitHub Issues](https://github.com/bnb-chain/example-hub/issues)
- **Discussions**: [GitHub Discussions](https://github.com/bnb-chain/example-hub/discussions)
- **BNB Chain Discord**: [Join Community](https://discord.gg/bnbchain)
