# BNBChain Agentkit LangChain Extension Examples - Chatbot Python

This example demonstrates an agent setup as a terminal style chatbot with access to the full set of BNBChain Agentkit actions.

## Ask the chatbot to engage in the Web3 ecosystem!

- "Transfer a portion of your BNB to a random address"
- "What is the price of BNB?"
- "Deploy an NFT that will go super viral!"
- "Deploy an BEP-20 token with total supply 1 billion"

## Requirements

- Python 3.12+
- Uv for package management and tooling
  - [Uv installation instructions](https://docs.astral.sh/uv/getting-started/installation/)
- [OpenAI API Key](https://platform.openai.com/docs/quickstart#create-and-export-an-api-key)

### Checking Python Version

Before using the example, ensure that you have the correct version of Python installed. The example requires Python 3.12 or higher. You can check your Python version by running:

```bash
python --version
```

## Installation

```bash
uv venv --python 3.12
source .venv/bin/activate

uv sync
```

## Run the Chatbot

### Set ENV Vars

- Ensure the following ENV Vars are set:
  - BSC_PROVIDER_URL (optional)
  - OPBNB_PROVIDER_URL (optional)
  - BSCSCAN_API_KEY (optional)
  - PRIVATE_KEY (required)
  - OPENAI_API_KEY (required)

```bash
fastapi dev api-wrapper.py
```
