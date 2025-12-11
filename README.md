# Example Hub

A hub of frontend, agent kits, and smart contract examples for BNB Chain developers. Build and innovate with
ready-to-use resources.

## Table of Contents

- [Quick Start](#quick-start)
- [Example List](#example-list)
- [How to Add a New Example](#how-to-add-a-new-example)
  - [Development Setup](#development-setup)
  - [Steps to Add a New Example](#steps-to-add-a-new-example)
  - [Additional Notes](#additional-notes)
- [Feedback](#feedback)

## Quick Start

To quickly set up and run a demo locally or kickstart a new project based on an existing demo, use the following
command:

```sh
npx create-bnb-app@latest --example [example-name]
```

This command downloads and sets up the specified example (replace `[example-name]` with an option from
the [Example List](#example-list)).
After setup, navigate to the project directory and follow the example's `README.md` instructions to run it.

## Example List

Explore a variety of examples for different implementations below. The table includes each example's name, programming
language, description, and tags to help you find what you need quickly.

| Name                                                   | Language   | Description                                  | Tags                |
| ------------------------------------------------------ | ---------- | -------------------------------------------- | ------------------- |
| [go/eip7702](./go/eip7702-demo)                        | Go         | EIP-7702 implementation for BNB Chain        | Smart Contract, EIP |
| [go/tg-token-launch](./go/tg-token-launch-example)     | Go         | Telegram bot for token launch automation     | Bot, Token Launch   |
| [python/langchain-chatbot](./python/langchain-chatbot) | Python     | A chatbot example using LangChain            | AI, BSC, opBNB      |
| [python/pancacke-swap](./python/pancake-swap-example)  | Python     | PancakeSwap integration example              | DeFi, DEX, BSC      |
| [python/ai-wallet-reputation-nft](./python/ai-wallet-reputation-nft) | Python     | AI-generated, soulbound reputation NFTs on BNB Chain | AI, NFT, Reputation |
| [typescript/bnbchain-mcp](./typescript/bnbchain-mcp)   | TypeScript | AI-powered blockchain assistant using Claude | AI, BSC, MCP        |
| [typescript/eliza-chatbot](./typescript/eliza-chatbot) | TypeScript | A chatbot example using Eliza plugin-bnb     | AI, BSC, opBNB      |
| [typescript/ai-trading-assistant](./typescript/ai-trading-assistant) | Typescript | AI-powered trading assistant for BNB Chain ecosystem with real USDT→BNB swaps via PancakeSwap, technical analysis, and natural language interface | BNBChain, trading, analysis, PancakeSwap, AI, MCP |
| [typescript/discord-bot](./typescript/discord-bot) | Typescript | A Discord bot that can monitor transactions on the BSC and opBNB chains, as well as BEP20 contract transfer events. | BSC, opBNB, Discord, BEP20 |
More examples are coming soon—stay tuned for updates!

## How to Add a New Example

Contributing a new example is a fantastic way to support the BNB Chain developer community. Follow these steps to ensure
your submission is seamless and aligns with the repository's standards.

### Development Setup

To maintain code consistency, install these VS Code extensions before you begin:

- **Python Development**: We use **Black** for Python code formatting. Install
  the <a href="https://marketplace.visualstudio.com/items?itemName=ms-python.black-formatter" target="_blank">Black Formatter</a>..
- **TypeScript Development**: We use **Prettier** for formatting TypeScript code.
  Install <a href="https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode" target="_blank">Prettier</a>.

### Steps to Add a New Example

1. Fork the repository to your GitHub account.
2. Create a feature branch with a descriptive name (e.g., `feature/new-example`).
3. Run `npm run generate:new-example` to automatically create the required files and folder structure.
4. Develop and test your example to ensure it functions as intended.
5. Submit a pull request for review once all changes are finalized.

### Additional Notes

- Ensure your example works fully and is well-documented for ease of use.
- Stick to the coding standards to keep the repository consistent.
- For questions or support, open an issue or reach out to the maintainers.

## Feedback

Have ideas to improve this hub or run into any issues? We'd love to hear from you! Please share your thoughts via [GitHub
Issues](https://github.com/bnb-chain/example-hub/issues). Your feedback helps us enhance this resource for all developers.
