#!/usr/bin/env python3
"""
TBNB Faucet MCP Server
A simple MCP server that disburses testnet BNB tokens to requesting addresses.
"""

import os
import sys
from typing import Any
from web3 import Web3
from mcp.server.fastmcp import FastMCP

# Initialize MCP server
mcp = FastMCP("TBNB Faucet Server")

# BSC Testnet configuration
BSC_TESTNET_RPC = os.getenv("BSC_TESTNET_RPC", "https://data-seed-prebsc-1-s1.binance.org:8545/")
PRIVATE_KEY = os.getenv("PRIVATE_KEY", "")

if not PRIVATE_KEY:
    print("Warning: PRIVATE_KEY environment variable not set. Faucet will not work.", file=sys.stderr)

# Initialize Web3 connection
w3 = Web3(Web3.HTTPProvider(BSC_TESTNET_RPC))

if not w3.is_connected():
    raise ConnectionError("Failed to connect to BSC Testnet")

# Get faucet account
if PRIVATE_KEY:
    faucet_account = w3.eth.account.from_key(PRIVATE_KEY)
    faucet_address = faucet_account.address
else:
    faucet_address = None


@mcp.tool()
def request_tbnb(recipient_address: str, amount: float = 0.1) -> dict[str, Any]:
    """
    Request testnet BNB tokens from the faucet.
    
    Args:
        recipient_address: The BSC testnet address to receive the tokens
        amount: Amount of TBNB to send (default: 0.1)
    
    Returns:
        Transaction hash and status information
    """
    if not PRIVATE_KEY:
        return {
            "success": False,
            "error": "Faucet private key not configured"
        }
    
    try:
        # Validate address
        if not w3.is_address(recipient_address):
            return {
                "success": False,
                "error": f"Invalid address: {recipient_address}"
            }
        
        recipient_address = w3.to_checksum_address(recipient_address)
        
        # Check if recipient is the faucet itself
        if recipient_address.lower() == faucet_address.lower():
            return {
                "success": False,
                "error": "Cannot send tokens to the faucet address itself"
            }
        
        # Validate amount
        if amount <= 0 or amount > 1.0:
            return {
                "success": False,
                "error": "Amount must be between 0 and 1.0 TBNB"
            }
        
        # Get current nonce
        nonce = w3.eth.get_transaction_count(faucet_address)
        
        # Get gas price
        gas_price = w3.eth.gas_price
        
        # Build transaction
        amount_wei = w3.to_wei(amount, 'ether')
        
        transaction = {
            'to': recipient_address,
            'value': amount_wei,
            'gas': 21000,
            'gasPrice': gas_price,
            'nonce': nonce,
            'chainId': 97  # BSC Testnet chain ID
        }
        
        # Sign transaction
        signed_txn = w3.eth.account.sign_transaction(transaction, PRIVATE_KEY)
        
        # Send transaction
        tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        
        # Wait for receipt
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        return {
            "success": True,
            "transaction_hash": tx_hash.hex(),
            "recipient": recipient_address,
            "amount": amount,
            "block_number": receipt.blockNumber,
            "status": "confirmed" if receipt.status == 1 else "failed"
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def get_faucet_balance() -> dict[str, Any]:
    """
    Get the current balance of the faucet wallet.
    
    Returns:
        Balance information in TBNB and Wei
    """
    if not faucet_address:
        return {
            "success": False,
            "error": "Faucet address not configured"
        }
    
    try:
        balance_wei = w3.eth.get_balance(faucet_address)
        balance_tbnb = w3.from_wei(balance_wei, 'ether')
        
        return {
            "success": True,
            "address": faucet_address,
            "balance_wei": str(balance_wei),
            "balance_tbnb": float(balance_tbnb),
            "network": "BSC Testnet"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def check_address_balance(address: str) -> dict[str, Any]:
    """
    Check the TBNB balance of a given address.
    
    Args:
        address: The BSC testnet address to check
    
    Returns:
        Balance information for the address
    """
    try:
        if not w3.is_address(address):
            return {
                "success": False,
                "error": f"Invalid address: {address}"
            }
        
        address = w3.to_checksum_address(address)
        balance_wei = w3.eth.get_balance(address)
        balance_tbnb = w3.from_wei(balance_wei, 'ether')
        
        return {
            "success": True,
            "address": address,
            "balance_wei": str(balance_wei),
            "balance_tbnb": float(balance_tbnb),
            "network": "BSC Testnet"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


if __name__ == "__main__":
    mcp.run()
