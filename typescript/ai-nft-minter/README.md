# AI-Generated NFT Minter on BNB Chain

## Overview
A complete DApp that combines AI image generation with Web3 technology to mint NFTs on BNB Smart Chain.

## Example Details
- **Name**: AI-Generated NFT Minter
- **Language**: TypeScript/JavaScript
- **Description**: AI-powered NFT minting platform that generates images using Stability AI and mints them as NFTs on BNB Smart Chain with IPFS storage
- **Tags**: `ai`, `nft`, `bnb-chain`, `ipfs`, `stability-ai`, `nextjs`, `web3`

## Features
- 🎨 AI image generation using Stability AI
- 🔗 NFT minting on BNB Smart Chain (BSC)
- 📁 IPFS storage via Pinata
- 🏪 NFT marketplace with pagination
- 💰 Web3 wallet integration
- 📱 Responsive modern UI

## Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, ethers.js
- **Smart Contract**: Solidity, Hardhat, OpenZeppelin
- **Blockchain**: BNB Smart Chain Testnet
- **Storage**: IPFS (Pinata)
- **AI Service**: Stability AI

## Quick Start

### Prerequisites
- Node.js >= 18.0.0
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/tuofangzhe/bnb-nft-ai-minter.git
   cd bnb-nft-ai-minter
   ```

2. **Install dependencies**
   ```bash
   # Frontend
   cd frontend && npm install
   
   # Backend
   cd ../backend && npm install
   
   # Smart Contracts
   cd ../contracts && npm install
   ```

3. **Environment Setup**
   
   Copy the example environment files and configure them:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.local.example frontend/.env.local
   cp contracts/.env.example contracts/.env
   ```

4. **Configure Environment Variables**
   
   **Backend (.env):**
   ```env
   STABILITY_API_KEY=your_stability_api_key
   PINATA_API_KEY=your_pinata_api_key
   PINATA_SECRET_KEY=your_pinata_secret_key
   MINTER_PRIVATE_KEY=your_private_key
   BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
   CONTRACT_ADDRESS=your_deployed_contract_address
   ```
   
   **Frontend (.env.local):**
   ```env
   NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
   NEXT_PUBLIC_CONTRACT_ADDRESS=your_deployed_contract_address
   ```

5. **Deploy Smart Contract (Optional)**
   ```bash
   cd contracts
   npx hardhat compile
   npx hardhat deploy --network bscTestnet
   ```

6. **Run the Application**
   ```bash
   # Terminal 1: Start backend
   cd backend && npm run dev
   
   # Terminal 2: Start frontend
   cd frontend && npm run dev
   ```

7. **Access the Application**
   Open http://localhost:3000 in your browser

## Usage

### Mint NFT
1. Connect your Web3 wallet
2. Enter a text prompt for AI image generation
3. Click "Generate & Mint NFT"
4. Confirm the transaction in your wallet
5. View your minted NFT in the marketplace

### Browse NFTs
1. Navigate to the marketplace page
2. Browse through all minted NFTs
3. Click "Load More" to see additional NFTs
4. View NFT details and transaction info

## API Endpoints

### Mint NFT
```http
POST /api/mint
Content-Type: application/json

{
  "prompt": "a beautiful sunset over mountains",
  "userAddress": "0x..."
}
```

### Get NFTs
```http
GET /api/nfts?page=1&limit=4
```

## Smart Contract

The project uses an ERC721 smart contract deployed on BNB Smart Chain:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AINFT is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;
    
    constructor(address initialOwner) ERC721("AI NFT", "AINFT") Ownable(initialOwner) {}
    
    function safeMint(address to, string memory uri) public onlyOwner {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }
}
```

## Architecture

### Data Flow
1. User inputs text prompt
2. Frontend sends request to backend
3. Backend generates image using Stability AI
4. Image uploaded to IPFS via Pinata
5. NFT metadata created and uploaded to IPFS
6. Smart contract mints NFT with metadata URI
7. Transaction hash returned to frontend

### Directory Structure
```
bnb-nft-ai-minter/
├── frontend/           # Next.js frontend
├── backend/            # Node.js backend
├── contracts/          # Smart contracts
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- GitHub Issues: https://github.com/tuofangzhe/bnb-nft-ai-minter/issues
- Documentation: See README.md in the repository
