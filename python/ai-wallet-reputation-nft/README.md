# AI-Powered Reputation NFT Badges on BNB Chain

Forge unique, soulbound ERC-721 NFT reputation badges on the BNB Chain! This project demonstrates a powerful fusion of onchain data analysis with generative AI (LLMs) to assess wallet activity, provide insightful explanations, and mint personalized, non-transferable NFT credentials. **Metadata is stored off-chain on IPFS for maximum efficiency and low gas costs.**

Elevate user engagement by offering meaningful, AI-driven insights into their onchain identity, captured forever as a unique digital asset.

**Key Highlights:**
*   Analyzes basic onchain activity (transaction count) from the BNB Chain.
*   Applies customizable scoring logic to categorize wallet reputation.
*   Leverages **LLM integration** (easily adaptable for different providers like OpenAI, Anthropic, OpenRouter, Gemini) to generate unique, natural language explanations for each reputation level.
*   Mints a soulbound (non-transferable) **ERC-721** NFT badge representing the user's reputation.
*   **Stores NFT metadata off-chain on IPFS** via Pinata, ensuring low gas fees for minting.
*   Features a clean web interface (Flask) for analysis and minting.
*   Built with Python, Solidity, `web3.py`, and the `openai` library client.

**Core Concept:** The project showcases the powerful pattern of combining blockchain data, adaptable analysis logic, AI-generated insights, and NFT minting with decentralized off-chain storage. This foundation is ready for expansion with more sophisticated data sources and scoring models.

## Author

-   Vamshi Paili

## Features

-   **Wallet Input:** Simple web UI (Flask) for address input.
-   **Onchain Data Analysis:** Fetches transaction count via `web3.py`.
-   **Rule-Based Scoring:** Categorizes wallets (Newcomer, Explorer, etc.) based on configurable thresholds.
-   **AI-Generated Rationale:** Uses a configured LLM API to explain the assigned category.
-   **Reputation Display:** Shows score, category, SVG preview, and the AI rationale.
-   **ERC-721 NFT Minting:** Mints a non-transferable badge for all analyzed wallets (except on analysis error).

## Technology Stack

-   **Backend:** Python, Flask
-   **LLM Integration:** Configurable LLM API call using the `openai` library client (Adaptable to providers like OpenAI, Anthropic, OpenRouter, etc.)
-   **Blockchain Interaction:** `web3.py`
-   **Smart Contract:** Solidity (OpenZeppelin ERC-721 standard)
-   **Decentralized Storage:** IPFS via Pinata for NFT metadata.
-   **Blockchain:** BNB Smart Chain / opBNB (Testnet recommended)
-   **Dependencies:** `pip` / `uv`, `python-dotenv`

## Setup Instructions

### 1. Prerequisites

-   **Python:** Version >=3.10, <3.13 recommended.
-   **Package Manager:** `pip` or `uv`.
-   **BNB Chain Wallet:** e.g., MetaMask.
-   **Testnet BNB:** Required in the deployer/minter wallet (see Step 5) for gas fees. Get from [BNB Chain Testnet Faucet](https://www.bnbchain.org/en/testnet-faucet).
-   **LLM API Key:** An API key for your chosen LLM service provider (e.g., OpenRouter, OpenAI, Anthropic).
    *   The default configuration uses OpenRouter. See Step 5 and `.env.example` for details.
-   **Pinata JWT Key:** An API key from [Pinata](https://pinata.cloud) to store NFT metadata on IPFS.
    *   Go to the [Pinata Keys page](https://app.pinata.cloud/keys), create a new key, and ensure it has permission for `pinFileToIPFS`. Copy the JWT (JSON Web Token) provided.
-   **Core Libraries:** `Flask`, `web3.py`, `python-dotenv`, `requests`, `openai` (installed via `requirements.txt`).

### 2. Clone Repository

```bash
git clone <repository-url> # Replace if needed
cd example-hub-main/python/ai-reputation-badge
```

### 3. Set Up Backend Environment

Using a virtual environment is strongly recommended.

```bash
# 1. Create virtual environment
python3 -m venv .venv

# 2. Activate environment
#    Linux/macOS:  source .venv/bin/activate
#    Windows:      .\.venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# (Optional) Or using uv:
# uv sync
```

### 4. Set Up Smart Contract (`ReputationBadge.sol`)

Deploy your own contract. Follow these steps using Remix IDE to deploy the contract to a BNB Chain Testnet:

1.  Open Remix: [https://remix.ethereum.org/](https://remix.ethereum.org/)
2.  Load Contract: Create `ReputationBadge.sol` in Remix, paste code from the local `contracts/ReputationBadge.sol` file.
3.  Compile Contract: Select compiler (e.g., 0.8.20), compile `ReputationBadge.sol`.
4.  Deploy Contract: Connect wallet (on Testnet), select `ReputationBadge` contract, deploy, confirm transaction.
5.  Copy Contract Address: Get the newly deployed contract address from Remix's "Deployed Contracts" section. You will use this in Step 5 (Configure Environment Variables).

### 5. Configure Environment Variables

1.  **Create `.env` file (if it doesn't exist):**
    ```bash
    cp .env.example .env
    ```
2.  **Edit `.env`:** Open your `.env` file and configure the settings based on the instructions and examples in `.env.example`. Make sure to:
    *   Set your `RPC_URL`, `CONTRACT_ADDRESS` (from deploying your own contract), and `TESTNET_SCAN_URL`.
    *   Set your `PRIVATE_KEY` (ensure it corresponds to the owner of the chosen `CONTRACT_ADDRESS` for backend minting).
    *   Set your `OPENROUTER_API_KEY`.
    *   Set your `PINATA_JWT` with the key you generated from Pinata.
    *   Adjust optional thresholds if desired.

    **CRITICAL:** Secure your `PRIVATE_KEY` and API keys. **Never commit your `.env` file.** Ensure the `PRIVATE_KEY` wallet has Testnet BNB.

### 6. Update Contract ABI (If You Modified and Deployed Your Own Contract)

If you edited `ReputationBadge.sol` and deployed it yourself, you MUST copy the new ABI from Remix and paste it into `contracts/ReputationBadge.abi.json`, replacing the old content.

## Running the Application

1.  **Activate virtual environment:** `source .venv/bin/activate` (or equivalent)
2.  **Start Flask server:** `flask --app src.app:app run --port 5001`
3.  **Access:** Open `http://127.0.0.1:5001` in your browser.

## How it Works

1.  **Frontend Interaction:** User provides wallet address in the web UI (`index.html`).
2.  **Backend Analysis Request:** Flask backend (`app.py`) receives the address via `/analyze`.
3.  **Onchain Data & Scoring:** `analyzer.py` connects to the RPC, gets the transaction count, and applies local rules to assign a reputation `category` and `score`.
4.  **AI Rationale Generation:** `analyzer.py` uses the `openai` library client (configured for the LLM provider specified in `.env` / code) to call `generate_rationale_with_llm`. This sends context to the chosen LLM and receives a natural language `rationale`.
5.  **Response to Frontend:** Backend sends the full analysis back to the UI.
6.  **UI Update:** JavaScript displays the results, including the AI-generated rationale.
7.  **Badge Eligibility Check:** If analysis succeeded, the frontend calls `/check_badge` to check the smart contract.
8.  **Minting:** If eligible, the user clicks "Mint". The backend (`/mint`) triggers `contract_interaction.py`.
    *   The backend generates the metadata and uploads it to **IPFS via Pinata**.
    *   It then builds, signs (using `PRIVATE_KEY`), and sends the `safeMint` transaction containing the lightweight **IPFS URI**.
9.  **Result Display:** UI shows mint success or failure.

## Customization

-   **Scoring:** Enhance `simulate_ai_reputation_score` in `analyzer.py`.
-   **LLM Integration:** This is highly adaptable! Modify `generate_rationale_with_llm` and the client setup in `analyzer.py` to use different LLMs (GPT-4, Claude, Gemini, etc.), prompts, or API providers. Ensure you update the API key environment variable name and value in your `.env` file accordingly.
-   **NFT Metadata/SVG:** Update `generate_token_uri` and `generate_badge_svg` in `contract_interaction.py`.
-   **Smart Contract:** Modify `contracts/ReputationBadge.sol`.
-   **Frontend:** Edit `src/templates/index.html`.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests to the original repository. 
