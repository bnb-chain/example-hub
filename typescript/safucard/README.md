# Safucard

This is a dApp project that showcases how to integrate Alchemy’s APIs to retrieve a wallet’s BEP-20 token data which includes the whale status, the first and most recent tokens held, and address age based on its first transaction on a Slick Card Design and is optionally minted as an NFT.

---

## DEMO

- Live Link: [SafuCard](https://scorecard-frontend-teal.vercel.app)
- Network: BNB Smart Chain Testnet
- Verified Contract: 0x2B20F646CEdB8D40f2a37358A3b712ced3D5B294
- RPC URL: https://data-seed-prebsc-1-s1.binance.org:8545/

---

### TECH STACK/ PREREQUISITES

- Node.js v18+
- Express
- Hardhat
- React v19+
- A wallet (e.g metamask)
- Wagmi
- AlchemySDK
- PinataSDK

---

## How To Setup

1. Clone The Repo

```bash
   git clone https://github.com/Domistro16/safucard.git
   cd safucard
```

2. Install Dependencies

```bash
   cd SafuServer
   npm install
   cd ../Scorecard_NFT
   npm install
   cd ../scorecard-frontend
   npm install
   cd ..
```

3. Configure .env variables

   Copy .env.example variables to .env using the following command:

   ```bash
   cp SafuServer/.env.example SafuServer/.env
   cp Scorecard_NFT/.env.example Scorecard_NFT/.env
   cp scorecard-frontend/.env.example scorecard-frontend/.env
   ```

   Then update your .env variables for each folder

   Scorecard_NFT:

   This includes your RPC_URL and your Deployer's Private key

   ```bash
   API_URL=
   DEPLOYER_KEY=
   ```

   SafuServer:

   This includes your Alchemy Key and your Pinata Gateway URL and Pinata JWT

   ```bash
   ALCHEMY_KEY=
   GATEWAY_URL=
   JWT=
   ```

   scorecard-frontend:

   This includes the NFT Contract Address and the API Url to your Server

   ```bash
   CONTRACT_ADDRESS=0x2B20F646CEdB8D40f2a37358A3b712ced3D5B294
   VITE_API_URL=
   ```

4. Get Your Alchemy Key:

- Go to https://www.alchemy.com/
- Create an account
- Go to your Dashboard and create a new Project for BSC Testnet
- Copy Your API Key and update your .env variable

5. Start the Express Server

   ```bash
   cd SafuServer
   npm run build
   npm run dev
   ```

6. Deploy/Use Already Deployed Testnet Contract

   You can choose to deply a new NFT contract:

   ```bash
   cd Scorecard_NFT
   npx hardhat compile
   npx hardhat run ./scripts/deploy.ts
   ```

   Or Use the Already Deployed Contract:
   
   ```bash
   CONTRACT_ADDRESS=0x2B20F646CEdB8D40f2a37358A3b712ced3D5B294
   ```

---

## How To Interact With Frontend

1. Run the Development Server
   ```bash
   cd scorecard-frontend
   npm run dev
   ```
2. Connect your Web3 wallet using the **Connect Wallet** button.
3. Enter your BNB wallet address in the input field.
4. Click **Search** to fetch scorecard data and generate your SafuCard.
5. Click **Download** or **Fullscreen** to preview or save the image.
6. Optionally, click **Mint NFT** to upload to IPFS and mint the card as an NFT.

---

## Smart Contract

- **Address:** `0x2B20F646CEdB8D40f2a37358A3b712ced3D5B294`
- **Function Used:** `mintNFT(tokenURI)`
- **Value Calculation:** Based on price feed (5 USD in native token)

---

## 📡 API / Endpoints

| Path                      | Method | Description                             |
| ------------------------- | ------ | --------------------------------------- |
| `/api/address/${address}` | GET    | Returns the wallet's safu erc20 details |

---

## Notes

- Make sure your smart contract is deployed and funded.
- Backend must handle Pinata upload endpoints securely.
- This project uses Chainlink's price feeds for pricing NFT mint.

---

## License

This project is licensed under the MIT License.

---

## Contact

Email: desmondesih@gmail.com
