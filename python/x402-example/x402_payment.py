#!/usr/bin/env python3
"""
x402 Payment Protocol Implementation
HTTP 402 Payment Required - Internet-Native Payments on BNB Chain
Implements sign-to-pay functionality using EIP-712 and EIP-7702
"""

import os
import json
import time
from datetime import datetime
from typing import Any, Dict, List, Optional
from flask import Flask, render_template, request, jsonify, Response
from web3 import Web3
from mcp.server.fastmcp import FastMCP

app = Flask(__name__)

# Initialize MCP server
mcp = FastMCP("x402 Payment Protocol Server")

# Configuration
BSC_TESTNET_RPC = os.getenv("BSC_TESTNET_RPC", "https://data-seed-prebsc-1-s1.binance.org:8545/")
PRIVATE_KEY = os.getenv("PRIVATE_KEY", "")
PAYMENT_TOKEN = os.getenv("PAYMENT_TOKEN", "USDC")  # Default to USDC for x402
PAYMENT_TOKEN_ADDRESS = os.getenv("PAYMENT_TOKEN_ADDRESS", "")  # USDC contract address on BSC testnet

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(BSC_TESTNET_RPC))

if not w3.is_connected():
    raise ConnectionError("Failed to connect to BSC Testnet")

# Get merchant account
merchant_account = None
merchant_address = None
if PRIVATE_KEY:
    merchant_account = w3.eth.account.from_key(PRIVATE_KEY)
    merchant_address = merchant_account.address

# Payment requests storage
payment_requests: Dict[str, Dict[str, Any]] = {}
payment_history: List[Dict[str, Any]] = []
_payment_counter = 0  # Counter for unique payment IDs

# EIP-712 Domain for x402 payments
EIP712_DOMAIN = {
    "name": "x402 Payment Protocol",
    "version": "1",
    "chainId": 97,  # BSC Testnet
    "verifyingContract": "0x0000000000000000000000000000000000000000"  # Placeholder
}

# EIP-712 Payment Message Type
PAYMENT_MESSAGE_TYPE = {
    "PaymentRequest": [
        {"name": "resource", "type": "string"},
        {"name": "amount", "type": "uint256"},
        {"name": "currency", "type": "string"},
        {"name": "nonce", "type": "uint256"},
        {"name": "timestamp", "type": "uint256"},
        {"name": "merchant", "type": "address"}
    ]
}


@mcp.tool()
def create_payment_request(
    resource: str,
    amount: float,
    currency: str = "USDC",
    description: str = ""
) -> Dict[str, Any]:
    """
    Create a payment request following x402 protocol (HTTP 402 Payment Required).
    
    Args:
        resource: The resource or service being paid for
        amount: Amount to charge
        currency: Currency type (default: USDC)
        description: Optional description of the payment
    
    Returns:
        Payment request with EIP-712 signature data
    """
    if not merchant_address:
        return {
            "success": False,
            "error": "Merchant address not configured"
        }
    
    try:
        # Generate unique payment request ID
        global _payment_counter
        _payment_counter += 1
        timestamp_ms = int(time.time() * 1000)
        nonce = timestamp_ms + _payment_counter  # Ensure unique nonce
        payment_id = f"x402_{timestamp_ms}_{_payment_counter}"
        
        # Convert amount to wei (assuming 18 decimals for USDC-like tokens)
        amount_wei = int(amount * 10**18)
        
        # Create EIP-712 message
        message = {
            "resource": resource,
            "amount": amount_wei,
            "currency": currency,
            "nonce": nonce,
            "timestamp": int(time.time()),
            "merchant": merchant_address
        }
        
        # Create structured data for EIP-712 signing
        domain = EIP712_DOMAIN.copy()
        domain["chainId"] = w3.eth.chain_id
        
        # Sign the message
        signed_message = w3.eth.account.sign_typed_data(
            merchant_account.key,
            domain,
            {"PaymentRequest": PAYMENT_MESSAGE_TYPE["PaymentRequest"]},
            message
        )
        
        # Store payment request
        payment_request = {
            "payment_id": payment_id,
            "resource": resource,
            "amount": amount,
            "amount_wei": amount_wei,
            "currency": currency,
            "description": description,
            "merchant": merchant_address,
            "nonce": nonce,
            "timestamp": message["timestamp"],
            "signature": signed_message.signature.hex(),
            "status": "pending",
            "created_at": datetime.now().isoformat()
        }
        
        payment_requests[payment_id] = payment_request
        
        return {
            "success": True,
            "payment_id": payment_id,
            "payment_request": payment_request,
            "http_status": 402,
            "message": "Payment Required"
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def verify_payment_signature(
    payment_id: str,
    payer_address: str,
    payer_signature: str
) -> Dict[str, Any]:
    """
    Verify a payment signature from the payer.
    
    Args:
        payment_id: The payment request ID
        payer_address: Address of the payer
        payer_signature: EIP-712 signature from payer
    
    Returns:
        Verification result
    """
    try:
        if payment_id not in payment_requests:
            return {
                "success": False,
                "error": "Payment request not found"
            }
        
        payment_request = payment_requests[payment_id]
        
        # Verify payer address
        if not w3.is_address(payer_address):
            return {
                "success": False,
                "error": "Invalid payer address"
            }
        
        payer_address = w3.to_checksum_address(payer_address)
        
        # Recover signer from signature
        message = {
            "resource": payment_request["resource"],
            "amount": payment_request["amount_wei"],
            "currency": payment_request["currency"],
            "nonce": payment_request["nonce"],
            "timestamp": payment_request["timestamp"],
            "merchant": payment_request["merchant"]
        }
        
        domain = EIP712_DOMAIN.copy()
        domain["chainId"] = w3.eth.chain_id
        
        try:
            recovered_address = w3.eth.account.recover_typed_data(
                domain,
                {"PaymentRequest": PAYMENT_MESSAGE_TYPE["PaymentRequest"]},
                message,
                payer_signature
            )
        except Exception as e:
            return {
                "success": False,
                "error": f"Signature verification failed: {str(e)}"
            }
        
        if recovered_address.lower() != payer_address.lower():
            return {
                "success": False,
                "error": "Signature does not match payer address"
            }
        
        # Update payment request status
        payment_request["payer"] = payer_address
        payment_request["payer_signature"] = payer_signature
        payment_request["status"] = "verified"
        payment_request["verified_at"] = datetime.now().isoformat()
        
        return {
            "success": True,
            "payment_id": payment_id,
            "verified": True,
            "payer": payer_address,
            "message": "Payment signature verified. Ready for execution."
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def execute_payment(
    payment_id: str,
    payer_address: str
) -> Dict[str, Any]:
    """
    Execute the payment transaction on-chain.
    
    Args:
        payment_id: The payment request ID
        payer_address: Address of the payer
    
    Returns:
        Transaction details
    """
    if not PRIVATE_KEY:
        return {
            "success": False,
            "error": "Private key not configured"
        }
    
    try:
        if payment_id not in payment_requests:
            return {
                "success": False,
                "error": "Payment request not found"
            }
        
        payment_request = payment_requests[payment_id]
        
        if payment_request["status"] != "verified":
            return {
                "success": False,
                "error": "Payment request not verified"
            }
        
        # For demo purposes, we'll simulate a token transfer
        # In production, this would interact with actual token contracts
        
        # Get current nonce
        nonce = w3.eth.get_transaction_count(merchant_address)
        
        # Build transaction (simplified - in production would be token transfer)
        # For demo, we'll do a simple ETH transfer
        amount_wei = payment_request["amount_wei"]
        
        transaction = {
            'to': merchant_address,  # In production, this would be the merchant
            'value': amount_wei,
            'gas': 21000,
            'gasPrice': w3.eth.gas_price,
            'nonce': nonce,
            'chainId': 97
        }
        
        # Sign and send transaction
        signed_txn = w3.eth.account.sign_transaction(transaction, PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        
        # Wait for confirmation
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=10)
        
        # Update payment request
        payment_request["status"] = "completed"
        payment_request["tx_hash"] = tx_hash.hex()
        payment_request["block_number"] = receipt.blockNumber
        payment_request["completed_at"] = datetime.now().isoformat()
        
        # Add to history
        payment_history.append(payment_request.copy())
        
        return {
            "success": True,
            "payment_id": payment_id,
            "transaction_hash": tx_hash.hex(),
            "block_number": receipt.blockNumber,
            "status": "completed",
            "amount": payment_request["amount"],
            "currency": payment_request["currency"]
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def get_payment_status(payment_id: str) -> Dict[str, Any]:
    """
    Get the status of a payment request.
    
    Args:
        payment_id: The payment request ID
    
    Returns:
        Payment request status
    """
    if payment_id not in payment_requests:
        return {
            "success": False,
            "error": "Payment request not found"
        }
    
    return {
        "success": True,
        "payment_request": payment_requests[payment_id]
    }


@mcp.tool()
def list_payment_requests(status: Optional[str] = None) -> Dict[str, Any]:
    """
    List all payment requests, optionally filtered by status.
    
    Args:
        status: Filter by status (pending, verified, completed)
    
    Returns:
        List of payment requests
    """
    requests = list(payment_requests.values())
    
    if status:
        requests = [r for r in requests if r["status"] == status]
    
    return {
        "success": True,
        "count": len(requests),
        "payment_requests": requests
    }


# Flask routes for frontend
@app.route('/')
def index():
    """Render the x402 payment frontend"""
    return render_template('index.html')


@app.route('/api/payment_request', methods=['POST'])
def api_create_payment_request():
    """API endpoint for creating payment requests"""
    data = request.json
    result = create_payment_request(
        data.get('resource', ''),
        data.get('amount', 0),
        data.get('currency', 'USDC'),
        data.get('description', '')
    )
    return jsonify(result), 402 if result.get('http_status') == 402 else 200


@app.route('/api/payment/<payment_id>', methods=['GET'])
def api_get_payment(payment_id):
    """API endpoint for getting payment status"""
    result = get_payment_status(payment_id)
    return jsonify(result)


@app.route('/api/payment/<payment_id>/verify', methods=['POST'])
def api_verify_payment(payment_id):
    """API endpoint for verifying payment signature"""
    data = request.json
    result = verify_payment_signature(
        payment_id,
        data.get('payer_address', ''),
        data.get('payer_signature', '')
    )
    return jsonify(result)


@app.route('/api/payment/<payment_id>/execute', methods=['POST'])
def api_execute_payment(payment_id):
    """API endpoint for executing payment"""
    data = request.json
    result = execute_payment(
        payment_id,
        data.get('payer_address', '')
    )
    return jsonify(result)


@app.route('/api/payments', methods=['GET'])
def api_list_payments():
    """API endpoint for listing payments"""
    status = request.args.get('status', None)
    result = list_payment_requests(status)
    return jsonify(result)


if __name__ == "__main__":
    # Create templates directory if it doesn't exist
    os.makedirs('templates', exist_ok=True)
    
    # Run Flask app
    app.run(host='0.0.0.0', port=5001, debug=True)
