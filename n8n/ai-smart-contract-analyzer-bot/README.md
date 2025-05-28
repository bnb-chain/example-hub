# ai-smart-contract-analyzer-bot

A Telegram bot that uses AI to analyze and summarize BNB Chain smart contracts.

🧠 Features
🟢 Users send a smart contract address to Telegram.
🤖 AI checks if the address is valid and known (e.g., USDT, USDC...).
🧠 If valid, it uses BscScan to fetch the ABI and analyze it using OpenAI.
📄 The contract is explained in simple terms, including warnings if it's potentially dangerous.
💬 Supports structured output and memory for context-aware interaction.
🛑 Ignores /start command and does nothing.

## Getting Started

### Prerequisites
n8n installed (self-hosted or desktop app)
A Telegram Bot Token
BscScan API Key
OpenAI API Key

### Installation
1. Clone the repository
2. Import the provided workflow JSON into your n8n instance.
3. Set environment variables or credentials:
TELEGRAM_API_TOKEN
BSCSCAN_API_KEY
OPENAI_API_KEY

### Running the Project
1. Make sure Telegram Trigger is enabled in your n8n workflow.
2. Start the n8n service:
3. Send a contract address (e.g., 0x55d398326f99059fF775485246999027B3197955) to the bot on Telegram.

## Usage
### Example Flow
1. User sends a smart contract address.
2. Workflow checks if it’s /start → does nothing.
3. If it’s a valid EVM address:
+ Fetch ABI from BscScan using contract address.
+ Analyze the ABI with OpenAI using an AI Agent.
+ Return summarized explanation back to Telegram.

### Output
+ Simple explanation of functions and risks.
+ Mention if it's a famous token (like USDT, BUSD).
+ Warning if high-risk or unusual code is detected.

## Contributing
Feel free to fork, submit issues, or open PRs.

## License
Distributed under the MIT License.

## Contact
Created by KelvinCOD - feel free to reach out!

## Youtube Video
https://www.youtube.com/watch?v=bXmBM1GdccA
