# EIP-8004 Trustless Agents Implementation

An implementation of EIP-8004 (ERC-8004) Trustless Agents standard, enabling AI agents to discover, choose, and interact with each other across organizational boundaries without pre-existing trust.

## Overview

EIP-8004 provides mechanisms for discovering and trusting agents in untrusted settings. It complements existing agent communication protocols like Model Context Protocol (MCP) and Agent2Agent (A2A) by addressing the gap in agent discovery and trust establishment.

This implementation includes:
- **Identity Registry**: ERC-721 based agent identity management
- **Reputation Registry**: Feedback and scoring system for agents
- **Validation Registry**: Independent validator checks and verification
- **Interaction Logging**: Record of agent-to-agent interactions

![Trustless Agent Interface](https://i.imgur.com/vnLWiMA.png)

## Features

- **Agent Registration**: Register agents with identity, capabilities, and metadata
- **Agent Discovery**: Find agents by type, capability, or reputation score
- **Reputation System**: Submit and track reputation feedback
- **Validation Requests**: Request and record validator checks
- **Interaction Tracking**: Log agent-to-agent interactions
- **Interactive Frontend**: Web interface for managing agents
- **MCP Integration**: Full Model Context Protocol support

## Prerequisites

- Python 3.8 or higher
- A BSC testnet wallet for agent operations
- Access to BSC testnet RPC endpoint

## Installation

1. Navigate to the trustless-agent-example directory:
```bash
cd trustless-agent-example
```

2. Run the setup script:
```bash
./run.sh
```

The script will:
- Create a virtual environment
- Install all dependencies
- Run tests
- Start the server

## Configuration

Create a `.env` file (or copy from `.env.example`):

```bash
PRIVATE_KEY=0xYourPrivateKeyHere
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/
```

## Usage

### Running the Application

```bash
./run.sh
```

The application will start on `http://localhost:5002`

### Available Tools

#### `register_agent_identity`

Register an agent identity in the Identity Registry.

**Parameters:**
- `agent_name` (string, required): Name of the agent
- `agent_type` (string, required): Type of agent (payment, data, computation, oracle, etc.)
- `capabilities` (list, required): List of agent capabilities
- `metadata_uri` (string, optional): URI to agent metadata
- `description` (string, optional): Agent description

**Example:**
```json
{
  "agent_name": "Payment Processor Agent",
  "agent_type": "payment",
  "capabilities": ["payment", "api-access", "multi-currency"],
  "description": "Handles payment processing for AI services"
}
```

**Returns:**
```json
{
  "success": true,
  "agent_id": "agent_1234567890",
  "identity": {
    "agent_id": "agent_1234567890",
    "agent_name": "Payment Processor Agent",
    "agent_type": "payment",
    "capabilities": ["payment", "api-access"],
    "status": "active"
  }
}
```

#### `discover_agents`

Discover agents matching criteria.

**Parameters:**
- `agent_type` (string, optional): Filter by agent type
- `capability` (string, optional): Filter by specific capability
- `min_reputation` (float, optional): Minimum reputation score (default: 0.0)

**Returns:**
```json
{
  "success": true,
  "count": 5,
  "agents": [
    {
      "agent_id": "agent_1234567890",
      "agent_name": "Payment Processor Agent",
      "agent_type": "payment",
      "capabilities": ["payment", "api-access"],
      "reputation_score": 4.5
    }
  ]
}
```

#### `submit_reputation_feedback`

Submit reputation feedback for an agent.

**Parameters:**
- `agent_id` (string, required): The agent ID to rate
- `rating` (float, required): Rating score (0.0 to 5.0)
- `feedback_type` (string, optional): Type of feedback (default: "general")
- `comment` (string, optional): Feedback comment

**Returns:**
```json
{
  "success": true,
  "feedback": {
    "agent_id": "agent_1234567890",
    "rating": 4.5,
    "feedback_type": "performance",
    "comment": "Excellent performance!"
  }
}
```

#### `request_validation`

Request validation for an agent.

**Parameters:**
- `agent_id` (string, required): The agent ID to validate
- `validation_type` (string, required): Type of validation (stake, zk_proof, tee)
- `validation_data` (dict, required): Validation-specific data

**Returns:**
```json
{
  "success": true,
  "validation": {
    "agent_id": "agent_1234567890",
    "validation_type": "stake",
    "status": "pending"
  }
}
```

#### `record_agent_interaction`

Record an interaction between agents.

**Parameters:**
- `from_agent_id` (string, required): Source agent ID
- `to_agent_id` (string, required): Target agent ID
- `interaction_type` (string, required): Type of interaction
- `result` (string, optional): Interaction result (default: "success")
- `metadata` (dict, optional): Additional metadata

**Returns:**
```json
{
  "success": true,
  "interaction": {
    "from_agent_id": "agent_1234567890",
    "to_agent_id": "agent_9876543210",
    "interaction_type": "payment",
    "result": "success"
  }
}
```

#### `get_agent_profile`

Get complete agent profile including identity, reputation, and validations.

**Parameters:**
- `agent_id` (string, required): The agent ID

**Returns:**
```json
{
  "success": true,
  "agent_id": "agent_1234567890",
  "identity": {...},
  "reputation": {
    "score": 4.5,
    "feedback_count": 10,
    "recent_feedback": [...]
  },
  "validations": {
    "count": 3,
    "recent": [...]
  },
  "interactions": {
    "as_source": 15,
    "as_target": 20
  }
}
```

## Demo Example

### Step 1: Register an Agent

**Input:**
```json
POST /api/register
{
  "agent_name": "Payment Processor",
  "agent_type": "payment",
  "capabilities": ["payment", "api-access"],
  "description": "Handles payment processing"
}
```

**Output:**
```json
{
  "success": true,
  "agent_id": "agent_1234567890",
  "identity": {
    "agent_name": "Payment Processor",
    "status": "active"
  }
}
```

### Step 2: Discover Agents

**Input:**
```json
GET /api/discover?agent_type=payment&min_reputation=4.0
```

**Output:**
```json
{
  "success": true,
  "count": 1,
  "agents": [
    {
      "agent_id": "agent_1234567890",
      "agent_name": "Payment Processor",
      "reputation_score": 4.5
    }
  ]
}
```

### Step 3: Submit Feedback

**Input:**
```json
POST /api/feedback
{
  "agent_id": "agent_1234567890",
  "rating": 4.5,
  "feedback_type": "performance",
  "comment": "Fast and reliable"
}
```

**Output:**
```json
{
  "success": true,
  "feedback": {
    "rating": 4.5,
    "feedback_type": "performance"
  }
}
```

### Step 4: Record Interaction

**Input:**
```json
POST /api/interaction
{
  "from_agent_id": "agent_1111111111",
  "to_agent_id": "agent_1234567890",
  "interaction_type": "payment",
  "result": "success"
}
```

**Output:**
```json
{
  "success": true,
  "interaction": {
    "interaction_type": "payment",
    "result": "success"
  }
}
```

## Network Information

- **Network**: Binance Smart Chain Testnet
- **Chain ID**: 97
- **Standard**: EIP-8004 (ERC-8004) Trustless Agents
- **RPC Endpoint**: https://data-seed-prebsc-1-s1.binance.org:8545/
- **Explorer**: https://testnet.bscscan.com/

## Testing

Run unit tests:

```bash
source venv/bin/activate
pytest test_trustless_agents.py -v
```

Run tests with coverage:

```bash
pytest test_trustless_agents.py --cov=trustless_agents --cov-report=html
```

## Architecture

- **Backend**: Flask web server with MCP integration
- **Frontend**: HTML/CSS/JavaScript single-page application
- **Blockchain**: Web3.py for BSC testnet interaction
- **Registries**: In-memory storage (production would use on-chain contracts)
- **Protocol**: Model Context Protocol (MCP) for AI agent integration

## Key Components

### Identity Registry
- ERC-721 based agent identifiers
- Portable, censorship-resistant identities
- Metadata URI support

### Reputation Registry
- On-chain and off-chain feedback
- Scoring system (0.0 to 5.0)
- Multiple feedback types

### Validation Registry
- Generic validation hooks
- Support for stake-secured validation
- Zero-knowledge proof support
- Trusted execution environment oracles

## Trust Models

EIP-8004 supports pluggable, tiered trust models with security proportional to value at risk:
- **Low-stake**: Simple reputation-based trust
- **Medium-stake**: Reputation + validation
- **High-stake**: Reputation + validation + stake

## Security Notes

- ⚠️ **Never commit your private key** to version control
- Use environment variables for sensitive data
- This example is for testnet use only
- In production, registries should be on-chain contracts
- Implement proper access control for production use

## Troubleshooting

### Agent Registration Fails
- Verify agent address is configured
- Check RPC endpoint is accessible
- Ensure all required fields are provided

### Discovery Returns No Results
- Check filter criteria are not too restrictive
- Verify agents are registered and active
- Lower minimum reputation threshold

### Frontend Not Loading
- Verify Flask server is running on port 5002
- Check browser console for errors
- Ensure templates directory exists

## License

This project is provided as-is for educational and demonstration purposes.

## References

- [EIP-8004: Trustless Agents](https://eips.ethereum.org/EIPS/eip-8004)
- [ERC-721: Non-Fungible Token Standard](https://eips.ethereum.org/EIPS/eip-721)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [BNB Chain Documentation](https://docs.bnbchain.org)
