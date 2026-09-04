"""MCP server that verifies builders and initiates real tBNB payouts following MCP protocol."""

from __future__ import annotations

import asyncio
import json
import os
import uuid
from decimal import Decimal
from typing import Any

import httpx
from dotenv import load_dotenv
from eth_account import Account
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from web3 import Web3

load_dotenv()

VERIFICATION_URL = os.getenv(
    "VERIFICATION_SERVICE_URL", "http://localhost:8080/verify"
)
BSC_RPC_URL = os.getenv("BSC_RPC_URL")
TREASURY_SECRET = os.getenv("TREASURY_PRIVATE_KEY")
DEFAULT_PAYOUT_AMOUNT = Decimal(os.getenv("DEFAULT_PAYOUT_AMOUNT", "0.3"))
PAYOUT_GAS_LIMIT = int(os.getenv("PAYOUT_GAS_LIMIT", "21000"))

if not BSC_RPC_URL or not TREASURY_SECRET:
    raise RuntimeError(
        "BSC_RPC_URL and TREASURY_PRIVATE_KEY must be configured in the environment."
    )

Account.enable_unaudited_hdwallet_features()

app = FastAPI(title="tBNB MCP Server", version="1.0.0")

# MCP Protocol Constants
MCP_VERSION = "2024-11-05"


def _derive_account(secret: str) -> Account:
    """Interpret env secret as either mnemonic or raw private key."""
    normalized = secret.replace(",", " ").strip()
    if len(normalized.split()) >= 12 and all(normalized.split()):
        return Account.from_mnemonic(normalized)
    return Account.from_key(secret.strip())


treasury_account = _derive_account(TREASURY_SECRET)
treasury_private_key = treasury_account.key

w3 = Web3(Web3.HTTPProvider(BSC_RPC_URL))
if not w3.is_connected():
    raise RuntimeError("Unable to connect to BSC RPC endpoint.")

CHAIN_ID = w3.eth.chain_id


# MCP Protocol Models
class JSONRPCRequest(BaseModel):
    jsonrpc: str = "2.0"
    id: str | int | None = None
    method: str
    params: dict[str, Any] | None = None


class JSONRPCResponse(BaseModel):
    jsonrpc: str = "2.0"
    id: str | int | None
    result: Any | None = None
    error: dict[str, Any] | None = None


class MCPTool(BaseModel):
    name: str
    description: str
    inputSchema: dict[str, Any]


class MCPToolCallRequest(BaseModel):
    name: str
    arguments: dict[str, Any] | None = None


# Business Logic Models
class DisbursementRequest(BaseModel):
    builder_id: str = Field(..., description="Verified identity in Discord/Telegram")
    wallet_address: str = Field(..., description="Checksum wallet address")
    github_username: str = Field(..., description="GitHub username for verification")
    channel: str = Field(default="web", description="Support channel (discord, telegram, web)")


class DisbursementResponse(BaseModel):
    request_id: str
    status: str
    message: str
    tx_hash: str | None = None
    verification: dict[str, Any]


# Business Logic Functions
async def verify_wallet(payload: DisbursementRequest) -> dict[str, Any]:
    """Verify wallet with verification service."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            VERIFICATION_URL,
            json={
                "wallet_address": payload.wallet_address,
                "github_username": payload.github_username,
                "requester_id": payload.builder_id,
                "channel": payload.channel,
            },
        )
        resp.raise_for_status()
        return resp.json()


async def record_payout(github_user_id: int) -> None:
    """Record successful payout in verification service."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            f"{VERIFICATION_URL.rstrip('/verify')}/record-payout",
            json={"github_user_id": github_user_id},
        )
        resp.raise_for_status()


def _send_tbnb(wallet_address: str, amount: Decimal) -> str:
    """Send tBNB to the requested wallet and return the transaction hash."""
    checksum_address = Web3.to_checksum_address(wallet_address)
    value_wei = w3.to_wei(amount, "ether")
    if value_wei <= 0:
        raise ValueError("DEFAULT_PAYOUT_AMOUNT must be positive.")

    nonce = w3.eth.get_transaction_count(treasury_account.address)
    gas_price = w3.eth.gas_price

    tx = {
        "to": checksum_address,
        "value": value_wei,
        "nonce": nonce,
        "gas": PAYOUT_GAS_LIMIT,
        "gasPrice": gas_price,
        "chainId": CHAIN_ID,
    }

    signed = treasury_account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

    if receipt.status != 1:
        raise RuntimeError("On-chain transfer failed.")

    return w3.to_hex(tx_hash)


async def initiate_payout(wallet_address: str) -> str:
    """Initiate tBNB payout asynchronously."""
    return await asyncio.to_thread(
        _send_tbnb, wallet_address, DEFAULT_PAYOUT_AMOUNT
    )


async def process_tbnb_request(arguments: dict[str, Any]) -> dict[str, Any]:
    """Process tBNB request with verification and payout."""
    # Extract arguments
    builder_id = arguments.get("builder_id", f"user-{uuid.uuid4().hex[:8]}")
    wallet_address = arguments.get("wallet_address")
    github_username = arguments.get("github_username")
    channel = arguments.get("channel", "web")

    if not wallet_address or not github_username:
        raise ValueError("wallet_address and github_username are required")

    # Create request payload
    payload = DisbursementRequest(
        builder_id=builder_id,
        wallet_address=wallet_address,
        github_username=github_username,
        channel=channel,
    )

    # Verify wallet
    verification = await verify_wallet(payload)

    if not verification.get("verified"):
        reason = verification.get("reason", "Unknown verification failure")
        raise ValueError(f"Verification failed: {reason}")

    # Process payout
    request_id = str(uuid.uuid4())
    try:
        tx_hash = await initiate_payout(payload.wallet_address)

        # Record successful payout for rate limiting
        github_user_id = verification.get("github_user_id")
        if github_user_id:
            try:
                await record_payout(github_user_id)
            except Exception as exc:
                # Log but don't fail the request - payout already succeeded
                print(f"Warning: Failed to record payout: {exc}")

        return {
            "request_id": request_id,
            "status": "approved",
            "message": "Disbursement submitted to BSC testnet",
            "tx_hash": tx_hash,
            "verification": verification,
        }
    except Exception as exc:
        raise RuntimeError(f"Payout failed: {str(exc)}") from exc


# MCP Tool Definitions
def get_available_tools() -> list[MCPTool]:
    """Get list of available MCP tools."""
    return [
        MCPTool(
            name="issue_tbnb",
            description="Request tBNB payout for a verified GitHub user. Verifies the user via GitHub API, checks account age, repository count, and rate limits, then sends tBNB to the specified wallet address on BSC testnet.",
            inputSchema={
                "type": "object",
                "properties": {
                    "github_username": {
                        "type": "string",
                        "description": "GitHub username for verification. Must have at least 1 public repository and account age >= 30 days.",
                    },
                    "wallet_address": {
                        "type": "string",
                        "description": "BSC (Binance Smart Chain) wallet address to receive tBNB. Must be a valid Ethereum-compatible address.",
                    },
                    "builder_id": {
                        "type": "string",
                        "description": "Optional builder identifier (e.g., Discord/Telegram user ID). Defaults to auto-generated ID.",
                    },
                    "channel": {
                        "type": "string",
                        "description": "Support channel where request originated. Options: 'discord', 'telegram', 'web'. Defaults to 'web'.",
                        "enum": ["discord", "telegram", "web"],
                        "default": "web",
                    },
                },
                "required": ["github_username", "wallet_address"],
            },
        )
    ]


# Health Check (Non-MCP endpoint for monitoring)
@app.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok", "mcp_version": MCP_VERSION}


# MCP Protocol Endpoints
@app.post("/mcp/v1/tools")
async def mcp_list_tools(request: Request) -> JSONResponse:
    """
    MCP endpoint to list available tools.
    Follows JSON-RPC 2.0 format for MCP protocol.
    """
    try:
        # Try to parse as JSON-RPC request
        body = await request.json()
        jsonrpc_req = JSONRPCRequest(**body)
        
        if jsonrpc_req.method != "tools/list":
            return JSONResponse(
                status_code=200,
                content={
                    "jsonrpc": "2.0",
                    "id": jsonrpc_req.id,
                    "error": {
                        "code": -32601,
                        "message": "Method not found",
                        "data": f"Unknown method: {jsonrpc_req.method}",
                    },
                },
            )

        tools = get_available_tools()
        return JSONResponse(
            status_code=200,
            content={
                "jsonrpc": "2.0",
                "id": jsonrpc_req.id,
                "result": {
                    "tools": [tool.model_dump() for tool in tools],
                },
            },
        )
    except Exception as e:
        # If not JSON-RPC, return tools directly (for simpler HTTP clients)
        tools = get_available_tools()
        return JSONResponse(
            status_code=200,
            content={
                "tools": [tool.model_dump() for tool in tools],
            },
        )


@app.post("/mcp/v1/tools/call")
async def mcp_call_tool(request: Request) -> JSONResponse:
    """
    MCP endpoint to call a tool.
    Follows JSON-RPC 2.0 format for MCP protocol.
    """
    try:
        body = await request.json()
        
        # Try to parse as JSON-RPC request
        try:
            jsonrpc_req = JSONRPCRequest(**body)
            if jsonrpc_req.method != "tools/call":
                return JSONResponse(
                    status_code=200,
                    content={
                        "jsonrpc": "2.0",
                        "id": jsonrpc_req.id,
                        "error": {
                            "code": -32601,
                            "message": "Method not found",
                            "data": f"Unknown method: {jsonrpc_req.method}",
                        },
                    },
                )
            
            # Extract tool call from params
            if not jsonrpc_req.params:
                return JSONResponse(
                    status_code=200,
                    content={
                        "jsonrpc": "2.0",
                        "id": jsonrpc_req.id,
                        "error": {
                            "code": -32602,
                            "message": "Invalid params",
                            "data": "Missing params",
                        },
                    },
                )
            
            tool_name = jsonrpc_req.params.get("name")
            arguments = jsonrpc_req.params.get("arguments", {})
            request_id = jsonrpc_req.id
            
        except Exception:
            # Fallback: direct tool call format (non-JSON-RPC)
            tool_name = body.get("name")
            arguments = body.get("arguments", {})
            request_id = body.get("id", str(uuid.uuid4()))

        if not tool_name:
            return JSONResponse(
                status_code=200,
                content={
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "error": {
                        "code": -32602,
                        "message": "Invalid params",
                        "data": "Missing tool name",
                    },
                },
            )

        # Execute tool
        if tool_name == "issue_tbnb":
            try:
                result = await process_tbnb_request(arguments)
                return JSONResponse(
                    status_code=200,
                    content={
                        "jsonrpc": "2.0",
                        "id": request_id,
                        "result": {
                            "content": [
                                {
                                    "type": "text",
                                    "text": json.dumps(result, indent=2),
                                }
                            ],
                            "isError": False,
                        },
                    },
                )
            except ValueError as e:
                # Validation/verification error
                return JSONResponse(
                    status_code=200,
                    content={
                        "jsonrpc": "2.0",
                        "id": request_id,
                        "result": {
                            "content": [
                                {
                                    "type": "text",
                                    "text": json.dumps({"error": str(e)}, indent=2),
                                }
                            ],
                            "isError": True,
                        },
                    },
                )
            except Exception as e:
                # Execution error
                return JSONResponse(
                    status_code=200,
                    content={
                        "jsonrpc": "2.0",
                        "id": request_id,
                        "error": {
                            "code": -32000,
                            "message": "Server error",
                            "data": str(e),
                        },
                    },
                )
        else:
            return JSONResponse(
                status_code=200,
                content={
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "error": {
                        "code": -32601,
                        "message": "Method not found",
                        "data": f"Unknown tool: {tool_name}",
                    },
                },
            )

    except Exception as e:
        return JSONResponse(
            status_code=200,
            content={
                "jsonrpc": "2.0",
                "id": None,
                "error": {
                    "code": -32700,
                    "message": "Parse error",
                    "data": str(e),
                },
            },
        )


# Legacy REST endpoint (for backward compatibility)
@app.post("/requests", response_model=DisbursementResponse)
async def request_tbnb(payload: DisbursementRequest) -> DisbursementResponse:
    """Legacy REST endpoint for backward compatibility."""
    verification = await verify_wallet(payload)

    if not verification.get("verified"):
        reason = verification.get("reason", "Unknown verification failure")
        raise HTTPException(
            status_code=403,
            detail=f"Verification failed: {reason}",
        )

    request_id = str(uuid.uuid4())
    try:
        tx_hash = await initiate_payout(payload.wallet_address)

        # Record successful payout for rate limiting
        github_user_id = verification.get("github_user_id")
        if github_user_id:
            try:
                await record_payout(github_user_id)
            except Exception as exc:
                print(f"Warning: Failed to record payout: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return DisbursementResponse(
        request_id=request_id,
        status="approved",
        message="Disbursement submitted to BSC testnet",
        tx_hash=tx_hash,
        verification=verification,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8090)

