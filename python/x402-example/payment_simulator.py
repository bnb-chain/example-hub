#!/usr/bin/env python3
"""
Crypto Payment Simulator - Showcasing Fermi 450ms Block Time
Demonstrates fast transaction finality on BNB Chain with sub-second block times
"""

import os
import time
import json
from datetime import datetime
from typing import Any, Dict, List
from flask import Flask, render_template, request, jsonify
from web3 import Web3
from mcp.server.fastmcp import FastMCP

app = Flask(__name__)

# Initialize MCP server
mcp = FastMCP("Crypto Payment Simulator - Fermi Block Time")

# Configuration
BSC_TESTNET_RPC = os.getenv("BSC_TESTNET_RPC", "https://data-seed-prebsc-1-s1.binance.org:8545/")
PRIVATE_KEY = os.getenv("PRIVATE_KEY", "")
FERMI_BLOCK_TIME = 0.45  # 450ms block time

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(BSC_TESTNET_RPC))

if not w3.is_connected():
    raise ConnectionError("Failed to connect to BSC Testnet")

# Get sender account
sender_account = None
sender_address = None
if PRIVATE_KEY:
    sender_account = w3.eth.account.from_key(PRIVATE_KEY)
    sender_address = sender_account.address

# Transaction history
transaction_history: List[Dict[str, Any]] = []


@mcp.tool()
def send_payment(recipient_address: str, amount: float, note: str = "") -> Dict[str, Any]:
    """
    Send a payment and measure finality time with Fermi's 450ms block time.
    
    Args:
        recipient_address: The BSC testnet address to receive the payment
        amount: Amount of BNB to send (in BNB)
        note: Optional payment note/description
    
    Returns:
        Transaction details with timing metrics
    """
    if not PRIVATE_KEY:
        return {
            "success": False,
            "error": "Private key not configured"
        }
    
    try:
        # Validate address
        if not w3.is_address(recipient_address):
            return {
                "success": False,
                "error": f"Invalid address: {recipient_address}"
            }
        
        recipient_address = w3.to_checksum_address(recipient_address)
        
        # Validate amount
        if amount <= 0:
            return {
                "success": False,
                "error": "Amount must be greater than 0"
            }
        
        # Record start time
        start_time = time.time()
        tx_submitted_time = None
        tx_confirmed_time = None
        
        # Get current block number
        initial_block = w3.eth.block_number
        
        # Get current nonce
        nonce = w3.eth.get_transaction_count(sender_address)
        
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
            'chainId': 97  # BSC Testnet
        }
        
        # Sign transaction
        signed_txn = w3.eth.account.sign_transaction(transaction, PRIVATE_KEY)
        
        # Submit transaction
        tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        tx_submitted_time = time.time()
        submission_delay = tx_submitted_time - start_time
        
        # Wait for confirmation (with Fermi, should be very fast)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=10)
        tx_confirmed_time = time.time()
        
        # Calculate timing metrics
        total_time = tx_confirmed_time - start_time
        confirmation_time = tx_confirmed_time - tx_submitted_time
        blocks_to_confirm = receipt.blockNumber - initial_block
        
        # Calculate theoretical vs actual
        theoretical_time = blocks_to_confirm * FERMI_BLOCK_TIME
        efficiency = (theoretical_time / confirmation_time * 100) if confirmation_time > 0 else 0
        
        result = {
            "success": True,
            "transaction_hash": tx_hash.hex(),
            "recipient": recipient_address,
            "amount": amount,
            "amount_wei": str(amount_wei),
            "block_number": receipt.blockNumber,
            "status": "confirmed" if receipt.status == 1 else "failed",
            "timing": {
                "total_time_seconds": round(total_time, 3),
                "submission_delay_seconds": round(submission_delay, 3),
                "confirmation_time_seconds": round(confirmation_time, 3),
                "blocks_to_confirm": blocks_to_confirm,
                "theoretical_time_450ms_blocks": round(theoretical_time, 3),
                "efficiency_percent": round(efficiency, 2)
            },
            "note": note,
            "timestamp": datetime.now().isoformat()
        }
        
        # Store in history
        transaction_history.append(result)
        
        return result
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def get_payment_history(limit: int = 10) -> Dict[str, Any]:
    """
    Get recent payment transaction history.
    
    Args:
        limit: Maximum number of transactions to return
    
    Returns:
        List of recent transactions
    """
    recent = transaction_history[-limit:] if len(transaction_history) > limit else transaction_history
    return {
        "success": True,
        "count": len(recent),
        "transactions": list(reversed(recent))
    }


@mcp.tool()
def get_balance(address: str = None) -> Dict[str, Any]:
    """
    Get balance of an address. If no address provided, returns sender balance.
    
    Args:
        address: Address to check (optional, defaults to sender)
    
    Returns:
        Balance information
    """
    try:
        if address:
            if not w3.is_address(address):
                return {
                    "success": False,
                    "error": f"Invalid address: {address}"
                }
            address = w3.to_checksum_address(address)
        else:
            if not sender_address:
                return {
                    "success": False,
                    "error": "No sender address configured"
                }
            address = sender_address
        
        balance_wei = w3.eth.get_balance(address)
        balance_bnb = w3.from_wei(balance_wei, 'ether')
        
        return {
            "success": True,
            "address": address,
            "balance_wei": str(balance_wei),
            "balance_bnb": float(balance_bnb),
            "network": "BSC Testnet (Fermi - 450ms blocks)"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def get_network_stats() -> Dict[str, Any]:
    """
    Get current network statistics including block time information.
    
    Returns:
        Network statistics
    """
    try:
        current_block = w3.eth.block_number
        latest_block = w3.eth.get_block('latest')
        previous_block = w3.eth.get_block(current_block - 1) if current_block > 0 else latest_block
        
        # Calculate actual block time
        if previous_block and latest_block:
            time_diff = latest_block.timestamp - previous_block.timestamp
        else:
            time_diff = FERMI_BLOCK_TIME
        
        return {
            "success": True,
            "network": "BSC Testnet",
            "chain_id": 97,
            "current_block": current_block,
            "fermi_block_time_seconds": FERMI_BLOCK_TIME,
            "actual_block_time_seconds": time_diff,
            "theoretical_finality_seconds": FERMI_BLOCK_TIME * 2.5,  # ~1.125s for fast finality
            "rpc_endpoint": BSC_TESTNET_RPC
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


# Flask routes for frontend
@app.route('/')
def index():
    """Render the payment simulator frontend"""
    return render_template('index.html')


@app.route('/api/send_payment', methods=['POST'])
def api_send_payment():
    """API endpoint for sending payments"""
    data = request.json
    result = send_payment(
        data.get('recipient_address', ''),
        data.get('amount', 0),
        data.get('note', '')
    )
    return jsonify(result)


@app.route('/api/history', methods=['GET'])
def api_history():
    """API endpoint for transaction history"""
    limit = request.args.get('limit', 10, type=int)
    result = get_payment_history(limit)
    return jsonify(result)


@app.route('/api/balance', methods=['GET'])
def api_balance():
    """API endpoint for balance check"""
    address = request.args.get('address', None)
    result = get_balance(address)
    return jsonify(result)


@app.route('/api/network_stats', methods=['GET'])
def api_network_stats():
    """API endpoint for network statistics"""
    result = get_network_stats()
    return jsonify(result)


if __name__ == "__main__":
    # Create templates directory if it doesn't exist
    os.makedirs('templates', exist_ok=True)
    
    # Run Flask app
    app.run(host='0.0.0.0', port=5000, debug=True)
