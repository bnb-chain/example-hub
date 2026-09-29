# BNB Testnet Faucet - Server-Side MCP

A server-side Model Context Protocol (MCP) server for distributing testnet BNB tokens on Binance Smart Chain testnet. This server runs as a public HTTP service that any MCP client can connect to over the internet.

## Overview

This is a **server-side MCP implementation** designed to be deployed as a public service. Unlike client-side MCP servers that run locally, this server:

- Runs as an HTTP service accessible over the internet
- Uses Streamable HTTP transport for MCP communication
- Can be accessed by any MCP client with the server URL
- Designed for SaaS-style deployment where the vendor hosts the service

## Architecture

- **Transport**: Streamable HTTP (modern MCP HTTP transport)
- **Deployment**: Public HTTP server
- **Access**: Any MCP client can connect via URL
- **Purpose**: Public TBNB faucet service for BSC testnet

## Requirements

- Python 3.10+
- A wallet with testnet BNB for the faucet
- BSC testnet RPC access
- Server hosting (local or cloud)

## Installation

Install dependencies:

```bash
pip install -r requirements.txt
```

## Configuration

Set environment variables:

- `FAUCET_WALLET_PRIVATE_KEY`: Private key of the faucet wallet (required)
- `BSC_TESTNET_RPC_URL`: BSC testnet RPC endpoint (optional, has default)
- `SERVER_HOST`: Server bind address (optional, defaults to `0.0.0.0`)
- `SERVER_PORT`: Server port (optional, defaults to `8000`)

Example:

```bash
export FAUCET_WALLET_PRIVATE_KEY="0x..."
export BSC_TESTNET_RPC_URL="https://data-seed-prebsc-1-s1.binance.org:8545/"
export SERVER_HOST="0.0.0.0"
export SERVER_PORT="8000"
```

## Running the Server

Start the HTTP server:

```bash
python tbnb_faucet_server.py
```

The server will start on `http://0.0.0.0:8000` (or your configured host/port).

The MCP endpoint will be available at: `http://localhost:8000/mcp`

## Available Tools

### disburse_tbnb

The primary service - disburses TBNB tokens to any BSC testnet address.

**Parameters:**
- `recipient_address` (string, required): BSC testnet address to receive tokens
- `amount` (float, optional): Amount of TBNB to send (default: 0.1, max: 1.0)

**Returns:**
- Transaction hash
- Recipient address
- Amount sent
- Block number
- Transaction status
- Explorer URL

## Connecting MCP Clients

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "tbnb-faucet-public": {
      "url": "http://your-server-ip:8000/mcp"
    }
  }
}
```

### MCP Inspector

Test the server:

```bash
npx -y @modelcontextprotocol/inspector
# Connect to: http://localhost:8000/mcp
```

### Python MCP Client

```python
from mcp import ClientSession
from mcp.client.sse import sse_client

async with sse_client("http://your-server:8000/mcp") as (read, write):
    async with ClientSession(read, write) as session:
        await session.initialize()
        result = await session.call_tool("disburse_tbnb", {
            "recipient_address": "0x...",
            "amount": 0.1
        })
```

## Deployment

### Local Development

```bash
python tbnb_faucet_server.py
```

Access at: `http://localhost:8000/mcp`

### Production Deployment

For production, use a process manager like systemd, PM2, or Docker:

**Using systemd:**

```ini
[Unit]
Description=TBNB Faucet MCP Server
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/example2
Environment="FAUCET_WALLET_PRIVATE_KEY=0x..."
Environment="BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/"
ExecStart=/usr/bin/python3 tbnb_faucet_server.py
Restart=always

[Install]
WantedBy=multi-user.target
```

**Using Docker:**

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY tbnb_faucet_server.py .

ENV SERVER_HOST=0.0.0.0
ENV SERVER_PORT=8000

EXPOSE 8000

CMD ["python", "tbnb_faucet_server.py"]
```

**Behind a Reverse Proxy (nginx):**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /mcp {
        proxy_pass http://127.0.0.1:8000/mcp;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Network Details

- **Network**: Binance Smart Chain Testnet
- **Chain ID**: 97
- **Default RPC**: https://data-seed-prebsc-1-s1.binance.org:8545/
- **Block Explorer**: https://testnet.bscscan.com

## Security Considerations

⚠️ **Important for Public Servers:**

1. **Rate Limiting**: Implement rate limiting to prevent abuse
   - Consider using middleware like `slowapi` or `flask-limiter`
   - Limit requests per IP address
   - Limit requests per recipient address

2. **Authentication**: Consider adding API keys or authentication
   - Use environment variables for API keys
   - Validate requests before processing

3. **Monitoring**: Monitor faucet balance and transaction volume
   - Set up alerts for low balance
   - Log all transactions
   - Monitor for suspicious activity

4. **Private Key Security**: 
   - Never commit private keys to version control
   - Use secure secret management (AWS Secrets Manager, HashiCorp Vault, etc.)
   - Restrict file permissions on config files

5. **Network Security**:
   - Use HTTPS in production (via reverse proxy)
   - Implement CORS policies if needed
   - Firewall rules to restrict access if desired

## Example Rate Limiting

Add to your server (using a middleware or decorator):

```python
from functools import wraps
from collections import defaultdict
from datetime import datetime, timedelta

# Simple in-memory rate limiter (use Redis for production)
request_counts = defaultdict(list)

def rate_limit(max_requests=10, window_minutes=60):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Get client IP (would need request context in real implementation)
            # For now, using recipient address as identifier
            recipient = kwargs.get('recipient_address', 'unknown')
            now = datetime.now()
            
            # Clean old entries
            request_counts[recipient] = [
                ts for ts in request_counts[recipient]
                if now - ts < timedelta(minutes=window_minutes)
            ]
            
            if len(request_counts[recipient]) >= max_requests:
                return {
                    "success": False,
                    "error": "Rate limit exceeded. Please try again later."
                }
            
            request_counts[recipient].append(now)
            return func(*args, **kwargs)
        return wrapper
    return decorator
```

## Troubleshooting

**Server won't start:**
- Check if port is already in use
- Verify all environment variables are set
- Check Python version (3.10+ required)

**Connection refused:**
- Verify server is running
- Check firewall settings
- Ensure SERVER_HOST is set correctly (0.0.0.0 for all interfaces)

**Transaction failures:**
- Check faucet wallet balance
- Verify RPC endpoint is accessible
- Check network connectivity

**MCP client can't connect:**
- Verify the URL format: `http://host:port/mcp`
- Check CORS settings if accessing from browser
- Ensure server is accessible from client network

## Testing

Run unit tests:

```bash
pip install -r requirements.txt
pytest test_tbnb_faucet_server.py -v
```

Run tests with coverage:

```bash
pytest test_tbnb_faucet_server.py --cov=tbnb_faucet_server --cov-report=html
```

## License

MIT License - feel free to use and modify as needed.
