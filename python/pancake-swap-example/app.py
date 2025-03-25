"""
===============================================================================
  app.py - BNB Smart Chain Testnet DEX API Server
===============================================================================

Author: Lucas Liao
Description:
    This Flask application provides a lightweight backend for performing
    token swaps on the BNB Smart Chain Testnet using PancakeSwap-compatible
    routers. It exposes a frontend (index.html) for MetaMask-based swaps,
    and two API endpoints for programmatic token swap operations.

    - Supports swapping tBNB → token
    - Supports swapping BEP-20 → BEP-20 (with auto WBNB routing)
    - Provides live Swagger documentation at /apidocs

Endpoints:
    1. GET  /              - Renders the frontend (MetaMask-enabled swap UI)
    2. POST /swap          - Performs a swap from tBNB to another token
    3. POST /token-swap    - Swaps one BEP-20 token for another

Swagger Docs:
    Accessible at http://localhost:5000/apidocs

Environment:
    Requires a `.env` file with:
        - MNEMONIC or PRIVATE_KEY
        - RPC_URL pointing to BNB Testnet

Dependencies:
    Flask, flasgger, web3, eth-account, python-dotenv, mnemonic

===============================================================================
"""

from flask import Flask, jsonify, request, render_template
from flasgger import Swagger
from swapper import perform_swap, perform_token_to_token_swap

# Initialize Flask app
app = Flask(__name__)

# Initialize Swagger UI (accessible at /apidocs)
swagger = Swagger(app)


@app.route("/")
def index():
    # Render the frontend (MetaMask-based index.html)
    return render_template("index.html")


@app.route("/swap", methods=["POST"])
def swap():
    """
    Swap tBNB for selected token using a PancakeSwap-compatible router on BNB Testnet
    ---
    summary: Swap tBNB for a token
    consumes:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            token_out:
              type: string
              description: Address of the token to buy
              example: "0xFa60D973F7642B748046464e165A65B7323b0DEE"
            amount_bnb:
              type: number
              description: Amount of tBNB to swap
              example: 0.01
            slippage:
              type: number
              description: Slippage percentage
              example: 1
            router_address:
              type: string
              description: PancakeSwap-compatible router contract
              example: "0x9ac64cc6e4415144c455bd8e4837fea55603e5c3"
    responses:
      200:
        description: Swap success
        schema:
          type: object
          properties:
            status:
              type: string
            tx_hash:
              type: string
            bscscan_url:
              type: string
      400:
        description: Missing input
      500:
        description: Swap error
    """
    data = request.json
    token_out = data.get("token_out")
    amount_bnb = float(data.get("amount_bnb", 0.01))
    slippage = float(data.get("slippage", 1))
    router_address = data.get("router_address")

    if not router_address:
        return (
            jsonify({"status": "error", "message": "router_address is required"}),
            400,
        )

    try:
        # Call backend swapper logic
        tx_hash = perform_swap(token_out, amount_bnb, slippage, router_address)
        bscscan_url = f"https://testnet.bscscan.com/tx/{tx_hash}"
        return jsonify(
            {"status": "success", "tx_hash": tx_hash, "bscscan_url": bscscan_url}
        )
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/token-swap", methods=["POST"])
def token_swap():
    """
    Swap one BEP-20 token for another using a custom router on BNB Testnet
    ---
    summary: Swap BEP20 → BEP20 tokens
    consumes:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            token_in:
              type: string
              description: Address of input BEP-20 token
              example: "0x..."
            token_out:
              type: string
              description: Address of output BEP-20 token
              example: "0x..."
            amount_in:
              type: number
              description: Amount of input token to swap
              example: 1.5
            slippage:
              type: number
              description: Slippage percentage
              example: 1
            router_address:
              type: string
              description: Router contract address
              example: "0x9ac64cc6e4415144c455bd8e4837fea55603e5c3"
    responses:
      200:
        description: Token-to-token swap success
        schema:
          type: object
          properties:
            status:
              type: string
            tx_hash:
              type: string
            bscscan_url:
              type: string
      400:
        description: Missing input
      500:
        description: Swap error
    """
    data = request.json
    token_in = data.get("token_in")
    token_out = data.get("token_out")
    amount_in = float(data.get("amount_in", 0))
    slippage = float(data.get("slippage", 1))
    router_address = data.get("router_address")

    if not all([token_in, token_out, amount_in, router_address]):
        return jsonify({"status": "error", "message": "Missing required fields"}), 400

    try:
        # Call backend swapper logic
        tx_hash = perform_token_to_token_swap(
            token_in, token_out, amount_in, slippage, router_address
        )
        bscscan_url = f"https://testnet.bscscan.com/tx/{tx_hash}"
        return jsonify(
            {"status": "success", "tx_hash": tx_hash, "bscscan_url": bscscan_url}
        )
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# Run Flask app
if __name__ == "__main__":
    app.run(debug=True)
