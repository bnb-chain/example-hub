# DeFi Yield Optimizer

An intelligent tool for analyzing and optimizing DeFi yield farming strategies across multiple protocols on BNB Chain. Automatically compares opportunities across PancakeSwap, Venus, Alpaca Finance, Wombat Exchange, Thena, and other major protocols to maximize your yields.

## Overview

This project helps you:

- **Discover optimal yields**: Analyze yield opportunities across multiple DeFi protocols
- **Compare strategies**: Single-pool vs diversified allocation strategies
- **Risk management**: Filter and optimize by risk level (low, medium, high)
- **Smart allocation**: APY-weighted and equal-weight diversification strategies
- **Quick testing**: Mock mode for testing without API keys or network calls

Perfect for yield farmers, DeFi developers, and anyone looking to optimize their crypto returns on BNB Chain.

## Features

- 🎯 **Multi-Protocol Support**: PancakeSwap, Venus, Alpaca, Wombat, Thena, and more
- 📊 **Strategy Types**: Single pool, diversified, and risk-adjusted strategies
- ⚖️ **Risk Analysis**: Categorized pools by risk level with expected APY ranges
- 💰 **Yield Optimization**: Automatic selection of highest-yield opportunities
- 🔒 **Mock Mode**: Deterministic mock data for safe testing (default)
- 🌐 **API Mode**: Optional real data fetching from DeFi protocols
- ✅ **Comprehensive Tests**: Full pytest test suite included

## Prerequisites

- Python 3.12+
- uv for package management (recommended) or pip
  - [uv installation instructions](https://docs.astral.sh/uv/getting-started/installation/)

## Installation

### Option 1: Using uv (Recommended)

1. Clone the repository:

```bash
git clone <your-repo-url>
cd defi-yield-optimizer
```

2. Create and activate a virtual environment:

**For macOS/Linux:**

```bash
uv venv
source .venv/bin/activate
```

**For Windows:**

```powershell
uv venv
.venv\Scripts\activate
```

3. Install dependencies:

```bash
uv sync
```

### Option 2: Using pip

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -e .
```

### Optional: Install API dependencies

If you want to connect to real DeFi protocols (not required for mock mode):

```bash
pip install -e ".[api]"
```

### Development Setup

For running tests and development:

```bash
pip install -e ".[dev]"
```

## Quick Start

### 1. Basic Optimization (Mock Mode - Default)

Find the best yield farming strategies with default settings:

```bash
python main.py optimize
```

This will analyze all available pools and show you the top 5 strategies ranked by expected APY.

### 2. Custom Investment Amount

Optimize for a specific investment amount:

```bash
python main.py optimize --amount 25000
```

### 3. Risk-Filtered Optimization

Optimize for low-risk strategies only:

```bash
python main.py optimize --risk low
```

Available risk levels: `low`, `medium`, `high`

### 4. Single-Pool Strategies

Show only single-pool strategies (100% allocation to one pool):

```bash
python main.py optimize --strategy-type single
```

### 5. Compare Protocols

Compare average APY across all protocols:

```bash
python main.py compare
```

### 6. Risk/Reward Analysis

Analyze yield opportunities by risk level:

```bash
python main.py analyze
```

### 7. Top Pools

Show the top 10 pools by APY:

```bash
python main.py top --n 10
```

### 8. Save Results to JSON

Save optimization results for later analysis:

```bash
python main.py optimize --amount 10000 --output outputs/my_strategies.json
```

## Example Output

### Optimization Results

```
🚀 DeFi Yield Optimizer - Running in mock mode

💰 Investment Amount: $10,000.00
📊 Min APY Threshold: 5.00%

Analyzing opportunities...

================================================================================
🎯 OPTIMAL YIELD FARMING STRATEGIES
================================================================================

────────────────────────────────────────────────────────────────────────────────
Strategy #1: Alpaca - CAKE-BNB Leveraged
────────────────────────────────────────────────────────────────────────────────
Expected APY: 47.89%
Total Investment: $10,000.00
Risk Score: 3.00/3.00
Description: 100% allocation to Alpaca CAKE-BNB Leveraged

Allocation Breakdown:
  1. Alpaca - CAKE-BNB Leveraged
     • Token Pair: CAKE-BNB
     • Amount: $10,000.00 (100.00%)
     • Pool APY: 47.89%

💰 Expected Annual Return: $4,789.00

────────────────────────────────────────────────────────────────────────────────
Strategy #2: Equal Weight Diversified
────────────────────────────────────────────────────────────────────────────────
Expected APY: 41.23%
Total Investment: $10,000.00
Risk Score: 2.67/3.00
Description: Equal allocation across 3 top-performing pools

Allocation Breakdown:
  1. Alpaca - CAKE-BNB Leveraged
     • Token Pair: CAKE-BNB
     • Amount: $3,333.33 (33.33%)
     • Pool APY: 47.89%
  2. Alpaca - BNB-USDT Leveraged
     • Token Pair: BNB-USDT
     • Amount: $3,333.33 (33.33%)
     • Pool APY: 44.04%
  3. Thena - THE-BNB sAMM
     • Token Pair: THE-BNB
     • Amount: $3,333.33 (33.33%)
     • Pool APY: 31.77%

💰 Expected Annual Return: $4,123.00

🏆 RECOMMENDED STRATEGY:
   Alpaca - CAKE-BNB Leveraged
   Expected APY: 47.89%
   Expected Annual Return: $4,789.00
```

### Protocol Comparison

```
📊 PROTOCOL COMPARISON
================================================================================

Alpaca:
  • Average APY: 45.96%
  • Max APY: 47.89%
  • Min APY: 44.04%
  • Pool Count: 2

Thena:
  • Average APY: 22.68%
  • Max APY: 31.77%
  • Min APY: 13.60%
  • Pool Count: 2

PancakeSwap:
  • Average APY: 17.12%
  • Max APY: 20.45%
  • Min APY: 11.83%
  • Pool Count: 4
```

## Configuration

Create a `.env` file from the example:

```bash
cp .env.example .env
```

### Mock Mode (Default)

No configuration needed! The optimizer works out of the box with deterministic mock data.

### API Mode (Optional)

To connect to real DeFi protocols, update your `.env` file:

```env
# Change mode to api
FETCHER_MODE=api

# BSC RPC endpoint
BSC_RPC_URL=https://bsc-dataseed.binance.org/

# Optional: Protocol API keys
PANCAKESWAP_API_KEY=your_api_key_here
AAVE_API_KEY=your_api_key_here

# Optimization settings
DEFAULT_INVESTMENT_AMOUNT=10000
DEFAULT_RISK_LEVEL=medium
MIN_APY_THRESHOLD=5.0
```

**Note**: API mode requires additional setup:

1. Install API dependencies: `pip install -e ".[api]"`
2. Implement protocol-specific fetchers in `src/fetcher.py` (stubs provided)
3. Obtain API keys from respective protocols

## Running Tests

Run the complete test suite:

```bash
pytest
```

Run with coverage report:

```bash
pytest --cov=src --cov-report=html
```

Run specific test file:

```bash
pytest tests/test_optimizer.py -v
```

All tests use mock data and run quickly without external dependencies.

## Project Structure

```
defi-yield-optimizer/
├── src/
│   ├── __init__.py          # Package initialization
│   ├── fetcher.py           # Data fetchers (Mock and API)
│   ├── optimizer.py         # Main yield optimizer logic
│   ├── strategies.py        # Strategy builders and allocations
│   └── utils.py             # Utility functions and formatting
├── tests/
│   ├── __init__.py
│   ├── test_fetcher.py      # Fetcher tests
│   ├── test_optimizer.py    # Optimizer tests
│   ├── test_strategies.py   # Strategy tests
│   └── test_utils.py        # Utility tests
├── outputs/                 # Generated output files
├── main.py                  # CLI entry point
├── pyproject.toml          # Project configuration
├── .env.example            # Example environment file
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

## How It Works

### 1. Data Fetching

The optimizer fetches yield data from multiple protocols:

- **Mock Mode** (default): Uses deterministic mock data based on a seed value
- **API Mode**: Connects to real DeFi protocol contracts and APIs (requires implementation)

### 2. Strategy Building

Three types of strategies are generated:

- **Single Pool**: 100% allocation to the highest-yield pool
- **Diversified**: Split allocation across multiple pools (equal-weight or APY-weighted)
- **Risk-Adjusted**: Optimized for specific risk tolerance levels

### 3. Optimization

The optimizer:

1. Filters pools by minimum APY threshold
2. Applies risk level filters if specified
3. Generates multiple strategy options
4. Ranks strategies by expected APY
5. Calculates risk scores based on pool risk levels

### 4. Output

Results include:

- Expected APY for each strategy
- Detailed allocation breakdowns
- Risk scores (1.0 = low risk, 3.0 = high risk)
- Expected annual returns in USD

## Advanced Usage

### Custom Risk Scoring

Modify risk scores in `src/strategies.py`:

```python
RISK_SCORES = {
    "low": 1.0,
    "medium": 2.0,
    "high": 3.0,
}
```

### Add New Protocols

Add protocol data to `MockFetcher.MOCK_PROTOCOLS` in `src/fetcher.py`:

```python
MOCK_PROTOCOLS = {
    "YourProtocol": [
        ("Pool Name", "TOKEN-PAIR", "risk_level", tvl_amount),
        # Add more pools...
    ],
}
```

### Implement Real API Fetching

Implement the `_fetch_*_yields()` methods in `APIFetcher` class:

```python
def _fetch_pancakeswap_yields(self) -> List[YieldData]:
    # Query MasterChef contracts
    # Calculate APYs from emissions
    # Return YieldData objects
    pass
```

## Troubleshooting

### Import Errors

If you see import errors, make sure you've activated your virtual environment:

```bash
# Check if venv is activated (should show .venv in prompt)
# If not:
source .venv/bin/activate  # macOS/Linux
.venv\Scripts\activate     # Windows
```

### No Strategies Found

If optimization returns no strategies:

- Lower the `MIN_APY_THRESHOLD` in `.env`
- Remove risk level filters
- Check that mock data is being generated correctly

### API Connection Issues

For API mode:

- Verify your RPC URL is accessible
- Check that Web3 dependencies are installed: `pip install -e ".[api]"`
- Ensure your BSC RPC endpoint is working

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. Areas for contribution:

- Implement real API fetchers for protocols
- Add more DeFi protocols to the mock data
- Improve strategy optimization algorithms
- Add more comprehensive risk analysis
- Create visualization tools for strategy comparison

## Resources

- [BNB Chain Cookbook](https://www.bnbchain.org/en/cookbook)
- [PancakeSwap Documentation](https://docs.pancakeswap.finance/)
- [Venus Protocol](https://venus.io/)
- [Alpaca Finance](https://www.alpacafinance.org/)
- [DeFi Llama](https://defillama.com/chain/BSC) - Real-time TVL and APY data

## License

MIT License - see LICENSE file for details

## Disclaimer

⚠️ **Important**: This tool is for educational and informational purposes only. It does not constitute financial advice. Always do your own research before investing in DeFi protocols. Cryptocurrency investments carry significant risk, including potential loss of principal.

The mock mode uses simulated data and does not reflect real market conditions. Past performance and projected yields do not guarantee future results.
