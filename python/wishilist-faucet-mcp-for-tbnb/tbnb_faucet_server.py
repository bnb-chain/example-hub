#!/usr/bin/env python3
"""
BNB Testnet Faucet - Server-Side MCP Implementation
HTTP-based MCP server for distributing testnet BNB tokens
Deployed as a public service accessible via HTTP/SSE
"""

import os
import sys
from typing import Any

from mcp.server.fastmcp import FastMCP
from web3 import Web3

# web3 v7: geth_poa_middleware → ExtraDataToPOAMiddleware
try:
    from web3.middleware import ExtraDataToPOAMiddleware as poa_middleware
except ImportError:
    from web3.middleware import geth_poa_middleware as poa_middleware

# Server configuration (must be before FastMCP init; host/port are constructor args)
SERVER_HOST = os.environ.get("SERVER_HOST", "0.0.0.0")
SERVER_PORT = int(os.environ.get("SERVER_PORT", "8000"))

# Initialize FastMCP server for HTTP transport
mcp = FastMCP(
    "TBNB Faucet Server - Public API",
    host=SERVER_HOST,
    port=SERVER_PORT,
    streamable_http_path="/mcp",
)

# Blockchain configuration
RPC_ENDPOINT = os.environ.get("BSC_TESTNET_RPC_URL", "https://data-seed-prebsc-1-s1.binance.org:8545/")
PRIVATE_KEY = os.environ.get("FAUCET_WALLET_PRIVATE_KEY", "")

# Initialize Web3 connection
w3 = Web3(Web3.HTTPProvider(RPC_ENDPOINT))
w3.middleware_onion.inject(poa_middleware, layer=0)

if not w3.is_connected():
    raise RuntimeError("Failed to connect to BSC Testnet RPC endpoint")

# Initialize faucet wallet
faucet_address = None
if PRIVATE_KEY:
    account = w3.eth.account.from_key(PRIVATE_KEY)
    faucet_address = account.address
else:
    print("WARNING: FAUCET_WALLET_PRIVATE_KEY not set. Server will not be able to disburse tokens.", file=sys.stderr)


def is_valid_address(address: str) -> bool:
    """Check if address is a valid BSC address"""
    return w3.is_address(address)


@mcp.tool()
def disburse_tbnb(recipient_address: str, amount: float = 0.1) -> dict[str, Any]:
    """
    Disburse testnet BNB tokens to a recipient address on BSC testnet.
    This is the primary service provided by this public MCP server.
    
    Args:
        recipient_address: BSC testnet address to receive TBNB tokens
        amount: Amount of TBNB to send (default: 0.1, max: 1.0)
    
    Returns:
        Transaction details including hash, status, and block number
    """
    if not PRIVATE_KEY:
        return {
            "success": False,
            "error": "Faucet service is not configured"
        }
    
    if not faucet_address:
        return {
            "success": False,
            "error": "Faucet wallet not initialized"
        }
    
    # Validate recipient address
    if not recipient_address or not recipient_address.strip():
        return {
            "success": False,
            "error": "Recipient address is required"
        }
    
    recipient_address = recipient_address.strip()
    
    if not is_valid_address(recipient_address):
        return {
            "success": False,
            "error": f"Invalid BSC address format: {recipient_address}"
        }
    
    recipient_address = w3.to_checksum_address(recipient_address)
    
    # Prevent self-transfer
    if recipient_address.lower() == faucet_address.lower():
        return {
            "success": False,
            "error": "Cannot send tokens to the faucet address itself"
        }
    
    # Validate amount
    if amount <= 0:
        return {
            "success": False,
            "error": "Amount must be greater than 0"
        }
    
    if amount > 1.0:
        return {
            "success": False,
            "error": "Maximum amount per request is 1.0 TBNB"
        }
    
    try:
        # Get current nonce
        nonce = w3.eth.get_transaction_count(faucet_address)
        
        # Get current gas price
        gas_price = w3.eth.gas_price
        
        # Convert amount to Wei
        amount_wei = w3.to_wei(amount, 'ether')
        
        # Build transaction
        transaction = {
            'to': recipient_address,
            'value': amount_wei,
            'gas': 21000,
            'gasPrice': gas_price,
            'nonce': nonce,
            'chainId': 97  # BSC Testnet
        }
        
        # Sign transaction
        signed_txn = w3.eth.account.sign_transaction(transaction, PRIVATE_KEY)
        
        # Send transaction
        tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        
        # Wait for transaction receipt
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=180)
        
        return {
            "success": True,
            "transaction_hash": tx_hash.hex(),
            "recipient": recipient_address,
            "amount_tbnb": amount,
            "block_number": receipt.blockNumber,
            "status": "confirmed" if receipt.status == 1 else "failed",
            "explorer_url": f"https://testnet.bscscan.com/tx/{tx_hash.hex()}"
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Transaction failed: {str(e)}"
        }


if __name__ == "__main__":
    # Run as HTTP server for public access (host/port set in FastMCP constructor)
    mcp.run(transport="streamable-http")
