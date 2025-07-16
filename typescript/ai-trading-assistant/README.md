# BNBChain AI Trading Assistant

AI-powered trading assistant for BNB Chain ecosystem with real USDT→BNB swaps via PancakeSwap, technical analysis, and natural language interface

## Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **pnpm** package manager
- **OpenAI API Key** for AI-powered analysis
- **Private Key** for BNB Chain wallet operations with some BNB balance
- **USDT Balance** at least 10 USDT on BNB Smart Chain (BSC) for trading

### Installation

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Environment setup**:
   ```bash
   cp .env.example .env
   ```
   
   Add your credentials to `.env`:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_MODEL=gpt-4o

   PRIVATE_KEY=your_bnb_chain_private_key_here
   ```

### Running the Project

1. **Start the AI Trading Assistant**:
   ```bash
   pnpm start
   ```

2. **Start trading with natural language**:
   ```
   > bnbchain-mcp-with-anthropic@1.0.0 start /Users/siew/DAOventures/ThirdFi/bnbchain-mcp
   > tsx src/index.ts
   
   MCP Client Started!
   Type your queries and I'll help you with trading analysis and blockchain operations!
   
   User: analysis bnb
   ⏳ Fetching market data and generating analysis... Please wait.
   📡 Fetching BNB market data from CoinGecko...
   ✅ Received 180 data points
   📊 Calculating technical indicators...
   ✅ Technical analysis complete
   🤖 Generating AI analysis...
   🔍 Extracting trading signal data...
   🤖 Generating Trump-style analysis text...
   ✅ Analysis text generated
   ✅ Analysis generated successfully
   📊 Trading Signal JSON: {
     asset: 'BNB',
     position: 'long',
     entry: 689.86,
     target: 704.21,
     stopLoss: 674.79,
     confidence: 7
   }
   
   Assistant:
   [Calling tool performAnalysis with args {"token":"BNB"}]
   The analysis on BNB shows a **BULLISH** sentiment with very promising indicators:
   
   - **Current Price**: BNB is trading above key moving averages, signifying strong upward momentum.
   - **RSI**: Not in overbought territory, implying there's still room for growth.
   - **Bollinger Bands**: Indicating a squeeze, which often leads to significant price movement.
   - **MACD**: A bullish cross is likely, suggesting an increase in momentum.
   
   ### Trading Opportunity
   - **Entry Price**: $689.86
   - **Target Price**: $704.21
   - **Stop Loss**: $674.79
   - **Confidence Score**: 7 out of 10
   
   Would you like to proceed with a trade for 10 USDT? This would capitalize on the bullish momentum identified in the analysis. If you're unsure, I can check the current price for you.
   
   User: check the current price
   📡 Fetching current price... Please wait.
   📡 Fetching current price for BNB...
   ✅ Current price fetched: $691.75
   
   Assistant:
   [Calling tool getCurrentPrice with args {"token":"BNB"}]
   💰 **Current BNB Price:** $691.75 USD
   
   The price has moved slightly since the analysis. Would you like to proceed with the trade at the updated price of $691.75, or do you have any other questions?
   
   User: proceed with the trade
   🔍 Checking USDT balance and executing trade... Please wait.
   🔍 Checking USDT balance...
   🔍 Getting user's wallet address...
   ✅ User address: 0x7719E324D758Dc4B140D215FF8b999F5Ac1C7F45
   ✅ USDT Balance: 10
   🚀 Executing trade for 10 USDT worth of BNB...
   🔍 Getting user's wallet address...
   ✅ User address: 0x7719E324D758Dc4B140D215FF8b999F5Ac1C7F45
   📊 Fetching current BNB price for swap calculation...
   🚀 Starting USDT to BNB swap...
   💰 Amount: 10 USDT
   📊 BNB Price: $691.75
   🔍 Checking USDT allowance...
   ✅ Approving USDT for Permit2...
   ✅ USDT approval completed
   ✍️ Generating Permit2 signature...
   🔄 Executing swap via Universal Router...
   ⏳ Waiting for transaction confirmation...
   ✅ Swap completed successfully!
   📝 Transaction hash: 0x0e8af450cecefb33515f8e15c7d4e56fdff25ea5f744d9722d3a4650c6536c28
   
   Assistant:
   [Calling tool executeTrade with args {"token":"BNB","amount":10}]
   ✅ Your trade was executed successfully! You swapped **10 USDT** for BNB.
   
   ### Transaction Details:
   - **Transaction Hash**: [0x0e8af450cecefb33515f8e15c7d4e56fdff25ea5f744d9722d3a4650c6536c28](https://bscscan.com/tx/0x0e8af450cecefb33515f8e15c7d4e56fdff25ea5f744d9722d3a4650c6536c28)
   - **New USDT Balance**: **0.00 USDT**
   
   You have now entered a position in BNB. Keep an eye on the price to reach your target of $704.21, and remember to monitor the stop loss at $674.79! If you need further assistance or want to perform another action, feel free to ask.
   ```

## Usage

### Available Commands

The AI trading assistant supports natural language queries for both analysis and real trading:

- **Technical Analysis**: "Analyze BNB for me"
- **Price Checking**: "What's the current price of BNB?"
- **Balance Verification**: "What's my USDT balance?"
- **Real Trading**: "Trade 10 USDT for BNB"

### BNB Chain Ecosystem Features

#### 🔗 MCP Server Integration
- **BNBChain MCP Server**: Connects to the official `@bnb-chain/mcp` server for blockchain operations
- **Real Blockchain Interactions**: Uses MCP tools for wallet operations and balance checks
- **Secure Key Management**: Integrates with private key management for wallet operations

#### 💱 Real Trading Capabilities
- **PancakeSwap Integration**: Executes real USDT→BNB swaps using PancakeSwap Universal Router
- **Permit2 Support**: Implements gasless approvals using Uniswap's Permit2 standard
- **Smart Contract Interaction**: Direct interaction with BNB Chain smart contracts
- **Balance Verification**: Real-time USDT balance checks before trade execution

#### 🏗️ BNB Chain Infrastructure
- **BSC Network**: Built specifically for BNB Smart Chain (BSC)
- **Gas Optimization**: Efficient transaction handling with proper gas estimation

### Smart Contract Addresses

- **USDT Token**: `0x55d398326f99059fF775485246999027B3197955`
- **Permit2**: `0x31c2F6fcFf4F8759b3Bd5Bf0e1084A055615c768`
- **Universal Router**: `0x1A0A18AC4BECDDbd6389559687d1A73d8927E416`
- **WBNB Token**: `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c`

### Technical Indicators

- **Bollinger Bands**: Volatility and trend analysis
- **RSI**: Overbought/oversold conditions
- **MACD**: Trend momentum and crossovers
- **Moving Averages**: Trend direction

### Supported Tokens

- **BNB** (Binance Coin) - Native BSC token with real trading
- **BTC** (Bitcoin) - Analysis and price tracking
- **ETH** (Ethereum) - Analysis and price tracking
- **SOL** (Solana) - Analysis and price tracking
- **XRP** (Ripple) - Analysis and price tracking
- **ADA** (Cardano) - Analysis and price tracking
- **DOGE** (Dogecoin) - Analysis and price tracking
- **TRX** (Tron) - Analysis and price tracking

### Data Flow

#### Analysis Flow
1. **User Query** → Natural language request for analysis
2. **Tool Detection** → AI determines to use `performAnalysis` tool
3. **Data Fetching** → CoinGecko API provides real market data
4. **Technical Analysis** → Calculate indicators (RSI, MACD, Bollinger Bands)
5. **Text Generation** → OpenAI generates analysis
6. **Response** → Formatted analysis returned to user

#### Trading Flow
1. **User Query** → Natural language trade request
2. **Balance Check** → MCP verifies USDT balance on BNB Chain
3. **Price Fetch** → Get current BNB price from CoinGecko
4. **Smart Contract Interaction** → Execute swap via PancakeSwap
5. **Transaction Confirmation** → Return transaction hash and results

### Security Features

- **Private Key Management**: Secure environment variable handling
- **Balance Verification**: Pre-trade balance checks
- **Transaction Validation**: Proper error handling and confirmation
- **Gas Estimation**: Automatic gas calculation for transactions

### Project Structure

```
src/
├── client.ts              # Main MCP client with OpenAI integration
├── index.ts               # Entry point
├── types/
│   └── index.ts           # TypeScript type definitions
├── utils/
│   ├── index.ts           # Utility exports
│   └── technicalAnalysis.ts # Technical analysis calculations
└── services/
    ├── index.ts           # Service exports
    ├── coinGeckoService.ts # CoinGecko API integration
    ├── analysisService.ts # OpenAI analysis text generation
    ├── tradingAnalysisService.ts # Main analysis orchestration
    ├── currentPriceService.ts # Real-time price fetching
    ├── tradingService.ts  # BNB Chain trading operations
    └── swapService.ts     # PancakeSwap integration
```

## Contact

dev@maiga.ai