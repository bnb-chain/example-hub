"""
swapper.py - BNB Smart Chain Testnet Token Swapper

This module contains two core functions:
1. perform_swap:       Swaps tBNB (native testnet BNB) to any BEP-20 token.
2. perform_token_to_token_swap: Swaps any BEP-20 token to another BEP-20 token.

It uses Web3.py to construct, sign, and send transactions to a PancakeSwap-compatible
router contract. Wallet credentials are securely loaded via mnemonic or private key
using the wallet_utils module.

The router path includes WBNB when needed, because:
- PancakeSwap liquidity pools are mostly paired with WBNB.
- Direct pairs between arbitrary tokens are often not available.
- Router contracts require WBNB when wrapping/unwrapping native BNB (tBNB).

Author: Lucas Liao
"""

import os
import time
import json
import logging
from web3 import Web3
from dotenv import load_dotenv
from wallet_utils import get_wallet  # Secure wallet access via mnemonic or key

# Load environment variables
load_dotenv()

# Configure logger
logging.basicConfig(level=logging.INFO)

# Connect to BNB Smart Chain Testnet
RPC_URL = os.getenv("RPC_URL")
web3 = Web3(Web3.HTTPProvider(RPC_URL))

# WBNB testnet address (used for swap paths)
WBNB = Web3.to_checksum_address("0xae13d989dac2f0debff460ac112a837c89baa7cd")


def perform_swap(token_out, amount_bnb, slippage_percent, router_address):
    """
    Swaps native tBNB to a specified BEP-20 token using swapExactETHForTokens.

    Args:
        token_out (str): Token to buy (BEP-20 address)
        amount_bnb (float): Amount of tBNB to send
        slippage_percent (float): Not implemented yet (amountOutMin = 0)
        router_address (str): PancakeSwap-compatible router
    """
    wallet = get_wallet()

    router = web3.eth.contract(
        address=Web3.to_checksum_address(router_address),
        abi=json.loads(
            """[
              {
                "name": "swapExactETHForTokens",
                "type": "function",
                "stateMutability": "payable",
                "inputs": [
                  {"name": "amountOutMin", "type": "uint256"},
                  {"name": "path", "type": "address[]"},
                  {"name": "to", "type": "address"},
                  {"name": "deadline", "type": "uint256"}
                ],
                "outputs": [{"name": "amounts", "type": "uint256[]"}]
              }
            ]"""
        ),
    )

    logging.info(
        f"Swapping {amount_bnb} tBNB → {token_out} via router {router_address}"
    )

    amount_in_wei = web3.to_wei(amount_bnb, "ether")
    deadline = int(time.time()) + 600  # 10 minutes from now

    # BNB must be converted to WBNB for routing inside smart contracts
    path = [WBNB, Web3.to_checksum_address(token_out)]

    txn = router.functions.swapExactETHForTokens(
        0,  # TODO: implement slippage-based minOut
        path,
        wallet.address,
        deadline,
    ).build_transaction(
        {
            "from": wallet.address,
            "value": amount_in_wei,
            "gas": 250000,
            "gasPrice": web3.to_wei("5", "gwei"),
            "nonce": web3.eth.get_transaction_count(wallet.address),
        }
    )

    signed_txn = web3.eth.account.sign_transaction(txn, private_key=wallet.key)
    tx_hash = web3.eth.send_raw_transaction(
        getattr(signed_txn, "rawTransaction", getattr(signed_txn, "raw_transaction"))
    )

    tx_hex = web3.to_hex(tx_hash)
    logging.info(f"✅ Swap submitted: https://testnet.bscscan.com/tx/{tx_hex}")
    return tx_hex


def perform_token_to_token_swap(
    token_in, token_out, amount_in, slippage_percent, router_address
):
    """
    Swaps token_in → token_out using swapExactTokensForTokens.

    Notes:
    - Will insert WBNB into the path automatically if neither token is WBNB.
    - Requires token_in to be approved for router first.

    Args:
        token_in (str): Input token (BEP-20)
        token_out (str): Output token (BEP-20)
        amount_in (float): Amount of token_in to swap
        slippage_percent (float): Not yet implemented (minOut = 0)
        router_address (str): PancakeSwap-compatible router
    """
    wallet = get_wallet()

    token_in = Web3.to_checksum_address(token_in)
    token_out = Web3.to_checksum_address(token_out)
    router_address = Web3.to_checksum_address(router_address)

    # Router contract setup
    router = web3.eth.contract(
        address=router_address,
        abi=json.loads(
            """[
              {
                "name": "swapExactTokensForTokens",
                "type": "function",
                "inputs": [
                  {"name": "amountIn", "type": "uint256"},
                  {"name": "amountOutMin", "type": "uint256"},
                  {"name": "path", "type": "address[]"},
                  {"name": "to", "type": "address"},
                  {"name": "deadline", "type": "uint256"}
                ],
                "outputs": [{"name": "amounts", "type": "uint256[]"}],
                "stateMutability": "nonpayable",
                "type": "function"
              }
            ]"""
        ),
    )

    # ERC20 ABI for approval
    erc20_abi = json.loads(
        """[
          {
            "constant": false,
            "inputs": [
              {"name": "spender", "type": "address"},
              {"name": "amount", "type": "uint256"}
            ],
            "name": "approve",
            "outputs": [{"name": "", "type": "bool"}],
            "type": "function"
          }
        ]"""
    )

    token_contract = web3.eth.contract(address=token_in, abi=erc20_abi)
    amount_in_wei = web3.to_wei(amount_in, "ether")
    deadline = int(time.time()) + 600

    # Route via WBNB if direct pair doesn't exist (common case)
    if token_in != WBNB and token_out != WBNB:
        path = [token_in, WBNB, token_out]
    else:
        path = [token_in, token_out]

    # Step 1: Approve router to spend tokens
    nonce = web3.eth.get_transaction_count(wallet.address)
    approval_txn = token_contract.functions.approve(
        router_address, amount_in_wei
    ).build_transaction(
        {
            "from": wallet.address,
            "gas": 100000,
            "gasPrice": web3.to_wei("5", "gwei"),
            "nonce": nonce,
        }
    )

    signed_approval = web3.eth.account.sign_transaction(
        approval_txn, private_key=wallet.key
    )
    raw_approval = getattr(
        signed_approval, "rawTransaction", getattr(signed_approval, "raw_transaction")
    )
    web3.eth.send_raw_transaction(raw_approval)
    logging.info("✅ Approved router to spend token_in")

    # Step 2: Execute token swap
    swap_txn = router.functions.swapExactTokensForTokens(
        amount_in_wei,
        0,  # TODO: add slippage-based minOut
        path,
        wallet.address,
        deadline,
    ).build_transaction(
        {
            "from": wallet.address,
            "gas": 300000,
            "gasPrice": web3.to_wei("5", "gwei"),
            "nonce": nonce + 1,
        }
    )

    signed_swap = web3.eth.account.sign_transaction(swap_txn, private_key=wallet.key)
    raw_swap = getattr(
        signed_swap, "rawTransaction", getattr(signed_swap, "raw_transaction")
    )

    tx_hash = web3.eth.send_raw_transaction(raw_swap)
    tx_hex = web3.to_hex(tx_hash)
    logging.info(f"✅ Token swap submitted: https://testnet.bscscan.com/tx/{tx_hex}")
    return tx_hex
