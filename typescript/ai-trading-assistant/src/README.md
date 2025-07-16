# BNBChain AI Trading Assistant

This project is an AI-powered trading assistant for the BNB Chain ecosystem that combines **BNBChain MCP (Model Context Protocol)** with **OpenAI's GPT-4** for natural language blockchain interactions and automated trading on BNB Smart Chain (BSC).

## 🚀 BNB Chain Ecosystem Integration

This AI trading assistant leverages the BNB Chain ecosystem through:

### 🔗 MCP Server Connection
- **BNBChain MCP Server**: Connects to the official `@bnb-chain/mcp` server for blockchain operations
- **Real Blockchain Interactions**: Uses MCP tools for wallet operations and balance checks
- **Secure Key Management**: Integrates with private key management for wallet operations

### 💱 Real Trading Capabilities
- **PancakeSwap Integration**: Executes real USDT→BNB swaps using PancakeSwap Universal Router
- **Permit2 Support**: Implements gasless approvals using Uniswap's Permit2 standard
- **Smart Contract Interaction**: Direct interaction with BNB Chain smart contracts
- **Balance Verification**: Real-time USDT balance checks before trade execution

### 🏗️ BNB Chain Infrastructure
- **BSC Network**: Built specifically for BNB Smart Chain (BSC)
- **Gas Optimization**: Efficient transaction handling with proper gas estimation

## 📁 Directory Structure

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

## 🔧 Core Components

### BNB Chain Services (`src/services/`)

#### Trading Service (`tradingService.ts`)
- **`executeTrade`**: Execute real trades with USDT balance verification
- **`checkUSDTBalance`**: Real-time USDT balance checking via MCP
- **`getUserAddress`**: Wallet address derivation from private key
- **`checkTradingEligibility`**: Pre-trade balance validation

#### Swap Service (`swapService.ts`)
- **`executeUSDTToBNBSwap`**: Real USDT→BNB swaps via PancakeSwap
- **`swapUSDTForBNB`**: Low-level swap implementation with Permit2
- **PancakeSwap Universal Router integration**
- **Permit2 gasless approval system**

#### Current Price Service (`currentPriceService.ts`)
- **`getCurrentPrice`**: Real-time token price fetching
- **CoinGecko API integration for market data**

### MCP Integration (`src/client.ts`)

- **BNBChain MCP Server Connection**: Connects to `@bnb-chain/mcp` server
- **Tool Registration**: Combines MCP server tools with local trading tools
- **Function Calling**: OpenAI function calling for natural language trading
- **Real-time Blockchain Operations**: Direct blockchain interaction

## 🚀 Usage

The AI trading assistant supports natural language queries for both analysis and real trading:

```bash
pnpm start

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

## 🔄 Data Flow

### Analysis Flow
1. **User Query** → Natural language request for analysis
2. **Tool Detection** → AI determines to use `performAnalysis` tool
3. **Data Fetching** → CoinGecko API provides real market data
4. **Technical Analysis** → Calculate indicators (RSI, MACD, Bollinger Bands)
5. **Text Generation** → OpenAI generates analysis
6. **Response** → Formatted analysis returned to user

### Trading Flow
1. **User Query** → Natural language trade request
2. **Balance Check** → MCP verifies USDT balance on BNB Chain
3. **Price Fetch** → Get current BNB price from CoinGecko
4. **Smart Contract Interaction** → Execute swap via PancakeSwap
5. **Transaction Confirmation** → Return transaction hash and results

## 🛠️ BNB Chain Features

### Supported Operations
- **Real USDT→BNB Swaps**: Via PancakeSwap Universal Router
- **Balance Checking**: Real-time USDT balance verification
- **Wallet Management**: Private key to address derivation
- **Gas Optimization**: Efficient transaction handling
- **Permit2 Integration**: Gasless token approvals

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

## 🎯 Benefits of BNB Chain Integration

- **Real Trading**: Execute actual trades on BNB Smart Chain
- **Gas Efficiency**: Optimized for BSC's low gas fees
- **DEX Integration**: Direct PancakeSwap integration
- **Security**: MCP server provides secure blockchain access
- **User Experience**: Natural language trading interface
- **Compliance**: Built-in balance verification and safety checks

## 🔐 Security Features

- **Private Key Management**: Secure environment variable handling
- **Balance Verification**: Pre-trade balance checks
- **Transaction Validation**: Proper error handling and confirmation
- **Gas Estimation**: Automatic gas calculation for transactions

## 📊 Supported Tokens

- **BNB** (Binance Coin) - Native BSC token with real trading
- **BTC** (Bitcoin) - Analysis and price tracking
- **ETH** (Ethereum) - Analysis and price tracking
- **SOL** (Solana) - Analysis and price tracking
- **XRP** (Ripple) - Analysis and price tracking
- **ADA** (Cardano) - Analysis and price tracking
- **DOGE** (Dogecoin) - Analysis and price tracking
- **TRX** (Tron) - Analysis and price tracking

## 🚀 Getting Started

1. **Install Dependencies**:
   ```bash
   pnpm install
   ```

2. **Environment Setup**:
   ```bash
   cp .env.example .env
   # Add your OpenAI API key and private key
   ```

3. **Start the AI Trading Assistant**:
   ```bash
   pnpm start
   ```

4. **Start Trading**:
   - Ask for analysis: "Analyze BNB for me"
   - Check current price: "What's the current price of BNB?"
   - Check balance: "What's my USDT balance?"
   - Execute trades: "Trade 10 USDT for BNB"

## 🔗 Dependencies

- **`@bnb-chain/mcp`**: Official BNBChain MCP server
- **`@modelcontextprotocol/sdk`**: MCP client SDK
- **`viem`**: Ethereum library for BSC interaction
- **`openai`**: OpenAI API for natural language processing
- **`axios`**: HTTP client for API calls
- **`chalk`**: Terminal styling

This project demonstrates the power of combining AI with blockchain technology, specifically leveraging the BNB Chain ecosystem for real-world trading applications with actual USDT→BNB swaps and technical analysis.
