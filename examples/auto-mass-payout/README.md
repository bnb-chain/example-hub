# BNB Chain Auto-Mass Payouts

*Youtube video link: https://youtu.be/KjxE98f1FB8?si=YGA8a4rSsYGhviaG*

*Live website link: https://auto-mass-bnb-payout.vercel.app/* **note: live website only available for testnet**

🚀 **A production-ready application for distributing tokens to hundreds of wallets in a single transaction on BNB Chain.**

## 🌟 Features

- **Mass Token Distribution**: Send BNB or ERC20 tokens to up to 500 recipients in one transaction
- **CSV/JSON Upload**: Easy bulk recipient management with file upload
- **Real-time Validation**: Address and amount validation before execution
- **Gas Optimization**: Efficient smart contract design to minimize transaction costs
- **Progress Tracking**: Real-time transaction monitoring and status updates
- **Export Reports**: Download detailed CSV/JSON reports of payout results
- **Multi-Network**: Support for both BSC Testnet and Mainnet
- **Professional UI**: Clean, responsive interface built with React and Tailwind CSS

## 🛠 Technology Stack

- **Frontend**: React 18, Tailwind CSS, Vite
- **Web3 Integration**: Ethers.js, Web3Modal, WalletConnect
- **Smart Contract**: Solidity 0.8.19, Hardhat
- **File Processing**: PapaParse for CSV handling
- **UI Components**: Custom components with Radix UI primitives

## 📋 Prerequisites

Before you begin, ensure you have:

- Node.js 16+ installed
- MetaMask or compatible Web3 wallet
- BNB for gas fees (testnet or mainnet)
- BSCScan API key (for contract verification)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd bnb-auto-mass-payouts
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
PRIVATE_KEY=your_wallet_private_key_here
BSCSCAN_API_KEY=your_bscscan_api_key_here
VITE_CONTRACT_ADDRESS_TESTNET=0x0213761aCBb1366640Fe7CCAbB61a79f58c0D2d5
VITE_CONTRACT_ADDRESS_MAINNET=
```

### 3. Smart Contract Deployment

#### Deploy to BSC Testnet

```bash
npm run compile
npm run deploy:testnet
```

#### Deploy to BSC Mainnet

```bash
npm run deploy:mainnet
```

After deployment, update your `.env` file with the contract addresses.

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### 5. Build for Production

```bash
npm run build
npm run preview
```

## 📖 How to Use

### Step 1: Connect Wallet

- Click "Connect Wallet" and select your preferred wallet
- Ensure you're on BSC Testnet or Mainnet
- Make sure you have sufficient BNB for gas fees

### Step 2: Upload Recipients

- Prepare a CSV file with format: `address,amount`
- Or use JSON format: `[{"address": "0x...", "amount": "100"}]`
- Upload via drag-and-drop or file browser
- Review validation results

### Step 3: Select Token

- Choose from popular tokens (BNB, BUSD, USDT, USDC)
- Or add custom ERC20 token by contract address
- Verify your token balance is sufficient

### Step 4: Review & Confirm

- Review payout summary and cost breakdown
- Approve token spending if using ERC20 tokens
- Check gas estimates and service fees
- Execute the mass payout

### Step 5: Monitor Progress

- Watch real-time transaction progress
- View transaction hash and BSCScan link
- See individual payout results

### Step 6: Export Results

- Download CSV or JSON report
- Save transaction details for records
- Start new payout if needed

## 🔧 Configuration

### Smart Contract Settings

The smart contract includes configurable parameters:

- **Service Fee**: Default 0.001 BNB per transaction
- **Max Recipients**: 500 recipients per transaction
- **Fee Collector**: Address that receives service fees

### Network Configuration

Supported networks:

- **BSC Testnet**: ChainID 97
- **BSC Mainnet**: ChainID 56

## 📁 Project Structure

```
bnb-auto-mass-payouts/
├── src/
│   ├── components/        # React components
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Utility functions
│   ├── contracts/        # Smart contract files
│   └── lib/              # Shared libraries
├── scripts/              # Deployment scripts
├── public/               # Static assets
└── hardhat.config.js     # Hardhat configuration
```

## 🧪 Testing

### Smart Contract Testing

```bash
npx hardhat test
```

### Local Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

## 🔐 Security Features

- **Reentrancy Protection**: Smart contract uses ReentrancyGuard
- **Input Validation**: Comprehensive address and amount validation
- **Gas Limit Protection**: Maximum 500 recipients per transaction
- **Allowance Checks**: ERC20 token allowance verification
- **Error Handling**: Graceful handling of failed individual payouts

## 💰 Cost Optimization

- **Batch Processing**: Multiple transfers in single transaction
- **Gas Estimation**: Real-time gas cost calculation
- **Efficient Contract**: Optimized Solidity code for minimal gas usage
- **Service Fee**: Small fee to cover operational costs

## 🌐 Deployment

### Vercel Deployment (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

1. Build the application: `npm run build`
2. Upload `dist/` folder to your hosting provider
3. Configure environment variables on your hosting platform

## 🆘 Troubleshooting

### Common Issues

**"Insufficient funds" error:**

- Ensure you have enough BNB for gas + service fees
- For token payouts, also need enough tokens

**"Invalid address" error:**

- Verify all addresses in your CSV file are valid
- Use checksummed addresses when possible

**Transaction failing:**

- Check network congestion and increase gas price
- Verify contract has sufficient allowance for ERC20 tokens
- Ensure recipients list doesn't exceed 500 addresses

**Wallet connection issues:**

- Clear browser cache and try again
- Switch networks manually in MetaMask
- Try different wallet provider (WalletConnect)

### Getting Help

- Check the console for detailed error messages
- Verify contract addresses in `.env` file
- Ensure you're on the correct network (testnet/mainnet)

## Deployment to BNB Chain Cookbook

This project is designed for submission to the BNB Chain Cookbook Challenge.

### ✅ **Code Quality**

- Production-ready TypeScript/JavaScript code
- Comprehensive error handling
- Clean, maintainable architecture
- Professional UI/UX design

### ✅ **Innovation**

- Solves real business problems (payroll, airdrops, rewards)
- Gas-optimized smart contract design
- Batch processing for efficiency
- Real-time progress tracking

### ✅ **Documentation**

- Complete setup instructions
- API documentation
- Usage examples
- Troubleshooting guide

### ✅ **Usability**

- Intuitive drag-and-drop interface
- Real-time validation and feedback
- Export functionality for record-keeping
- Mobile-responsive design

## 📝 License

MIT License - feel free to use this code for your own projects.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For questions or support, please open an issue in the GitHub repository.

---

Built with ❤️ for the BNB Chain ecosystem



