# Faucet Token Distribution MCP

A Model Context Protocol (MCP) server that provides secure, rate-limited faucet token distribution for BSC testnet. This implementation addresses the requirements outlined in [BNB Chain Example Hub Issue #156](https://github.com/bnb-chain/example-hub/issues/156).

## Overview

This MCP server enables secure tBNB distribution with built-in identity verification and anti-abuse mechanisms:

- **GitHub-based Identity Verification**: Verifies users via GitHub API (account age, repository count)
- **Rate Limiting**: Enforces 24-hour cooldown per GitHub user ID
- **MCP Protocol Compliant**: Implements JSON-RPC 2.0 over HTTP for MCP compatibility
- **Dockerized Deployment**: Ready-to-deploy containerized services

## Live Demo

This MCP server has been deployed to AWS and is ready for use:

**MCP Server URL:**
```
https://your-aws-server.com:8090
```

**Connection Settings:**
- **Protocol**: HTTP/HTTPS
- **MCP Endpoint**: `/mcp/v1/tools`
- **Method**: POST
- **Content-Type**: `application/json`

**Example Connection Configuration:**
```json
{
  "mcpServers": {
    "faucet-mcp": {
      "url": "https://your-aws-server.com:8090/mcp/v1/tools",
      "transport": "http",
      "headers": {
        "Content-Type": "application/json"
      }
    }
  }
}
```

## Architecture

The system consists of two microservices:

1. **Verification Service** (`verification_service/`): FastAPI service that verifies builders via GitHub API with rate limiting
2. **MCP Server** (`mcp_server/`): MCP-compliant server that validates requests and initiates tBNB transfers on BSC testnet

## Quick Start

### Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- BSC testnet RPC endpoint
- Treasury wallet with tBNB for payouts

### Configuration

1. **Create `.env` file** in the project root:

```env
# Required for MCP Server
BSC_RPC_URL=https://data-seed-prebsc-1-s1.bnbchain.org:8545
TREASURY_PRIVATE_KEY=your_private_key_or_mnemonic_here

# Optional
GITHUB_TOKEN=ghp_your_token_here  # For higher GitHub API rate limits (5000/hour vs 60/hour)
DEFAULT_PAYOUT_AMOUNT=0.3
PAYOUT_GAS_LIMIT=21000
```

**Getting a GitHub Token (Optional):**
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Set expiration and check `read:user` scope
4. Copy the token and add it to `.env`

### Deployment

**Start services with Docker Compose:**
```bash
docker-compose up -d
```

**Check service status:**
```bash
docker-compose ps
docker-compose logs -f
```

**Stop services:**
```bash
docker-compose down
```

## MCP Protocol Usage

### List Available Tools

```bash
curl -X POST http://localhost:8090/mcp/v1/tools \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

### Call Tool (Issue tBNB)

```bash
curl -X POST http://localhost:8090/mcp/v1/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "issue_tbnb",
      "arguments": {
        "github_username": "octocat",
        "wallet_address": "0x1234567890123456789012345678901234567890",
        "channel": "web"
      }
    }
  }'
```

### Available Tools

**`issue_tbnb`** - Request tBNB payout for a verified GitHub user

**Parameters:**
- `github_username` (required): GitHub username for verification
- `wallet_address` (required): BSC wallet address to receive tBNB
- `builder_id` (optional): Builder identifier
- `channel` (optional): Support channel (discord, telegram, web)

**Returns:**
- Transaction hash
- Verification details
- Request status

## Verification Requirements

The verification service performs the following checks:

1. **GitHub Account Exists**: Verifies the GitHub username exists
2. **Repository Count**: Builder must have at least 1 public repository
3. **Account Age**: GitHub account must be at least 30 days old
4. **Rate Limiting**: Each GitHub user can only collect tBNB once per 24 hours

Rate limiting is enforced per GitHub user ID (not username), preventing users from bypassing limits by changing usernames.

## Health Checks

Both services expose health check endpoints:

```bash
# Verification service
curl http://localhost:8080/health

# MCP server
curl http://localhost:8090/health
```

## Production Deployment

### AWS EC2 Deployment

1. **Launch EC2 instance** (Ubuntu 22.04 LTS recommended)

2. **Install Docker:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

3. **Clone and configure:**
```bash
git clone <repo-url>
cd faucet-mcp
# Create .env file with your secrets
nano .env
```

4. **Start services:**
```bash
docker-compose up -d
```

5. **Configure Security Groups:**
   - Open ports 8080 (verification service) and 8090 (MCP server)
   - Or use a reverse proxy (nginx/traefik) for HTTPS

### Production Considerations

- **Database Persistence**: Use AWS RDS or mount EBS volume for SQLite
- **Security**: Use AWS Secrets Manager for sensitive credentials
- **HTTPS**: Enable HTTPS with reverse proxy (nginx/traefik)
- **Monitoring**: Set up CloudWatch logs and alerts
- **Scaling**: Consider AWS ECS/EKS for high traffic

## Troubleshooting

**Check container logs:**
```bash
docker-compose logs -f [service-name]
```

**Restart services:**
```bash
docker-compose restart
```

**Rebuild after code changes:**
```bash
docker-compose up -d --build
```

**Check health endpoints:**
```bash
curl http://localhost:8080/health
curl http://localhost:8090/health
```

## License

Apache License 2.0

## Contributing

This implementation addresses the requirements in [Issue #156](https://github.com/bnb-chain/example-hub/issues/156). Contributions, especially around identity and anti-Sybil modules, are welcome.

