# Safucard

Safucard is a React-based decentralized application (dApp) that allows users to input their wallet address and receive a customized visual "SafuCard" scorecard based on their bep-20 token interactions and other metrics. Users can optionally mint their SafuCard as an NFT to commemorate or showcase their on-chain profile.

## Getting Started

### Prerequisites

- Node.js v18+
- A wallet (e.g. MetaMask)
- An API endpoint (for score data and Pinata uploads)
- Hardhat
- Deployed NFT Contract Address and ABI

## Usage

1. Connect your Web3 wallet using the **Connect Wallet** button.
2. Enter your BNB wallet address in the input field.
3. Click **Search** to fetch scorecard data and generate your SafuCard.
4. Click **Download** or **Fullscreen** to preview or save the image.
5. Optionally, click **Mint NFT** to upload to IPFS and mint the card as an NFT.

## Self-Hosting

To run the server locally:

1. ```bash
   npm install
   npm run build
   ```
2. Configure .env variables by renaming .env.example to .env and inputing your
   ALCHEMY_KEY=
   GATEWAY_URL=
   JWT=

## License

This project is licensed under the MIT License.

## Contact

Email: desmondesih@gmail.com
