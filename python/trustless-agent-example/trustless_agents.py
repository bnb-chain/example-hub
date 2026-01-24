#!/usr/bin/env python3
"""
EIP-8004 Trustless Agents Implementation
Enables AI agents to discover, choose, and interact with each other
Implements Identity, Reputation, and Validation registries
"""

import os
import json
import time
from datetime import datetime
from typing import Any, Dict, List, Optional
from flask import Flask, render_template, request, jsonify
from web3 import Web3
from mcp.server.fastmcp import FastMCP

app = Flask(__name__)

# Initialize MCP server
mcp = FastMCP("EIP-8004 Trustless Agents Server")

# Configuration
BSC_TESTNET_RPC = os.getenv("BSC_TESTNET_RPC", "https://data-seed-prebsc-1-s1.binance.org:8545/")
PRIVATE_KEY = os.getenv("PRIVATE_KEY", "")

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(BSC_TESTNET_RPC))

if not w3.is_connected():
    raise ConnectionError("Failed to connect to BSC Testnet")

# Get agent account
agent_account = None
agent_address = None
if PRIVATE_KEY:
    agent_account = w3.eth.account.from_key(PRIVATE_KEY)
    agent_address = agent_account.address

# In-memory registries (in production, these would be on-chain)
identity_registry: Dict[str, Dict[str, Any]] = {}
reputation_registry: Dict[str, List[Dict[str, Any]]] = {}
validation_registry: Dict[str, List[Dict[str, Any]]] = {}

# Agent interactions log
interaction_log: List[Dict[str, Any]] = []
_agent_counter = 0  # Counter for unique agent IDs


@mcp.tool()
def register_agent_identity(
    agent_name: str,
    agent_type: str,
    capabilities: List[str],
    metadata_uri: str = "",
    description: str = ""
) -> Dict[str, Any]:
    """
    Register an agent identity in the Identity Registry (ERC-721 based).
    
    Args:
        agent_name: Name of the agent
        agent_type: Type of agent (e.g., "payment", "data", "computation")
        capabilities: List of agent capabilities
        metadata_uri: URI to agent metadata (optional)
        description: Agent description (optional)
    
    Returns:
        Agent identity registration details
    """
    if not agent_address:
        return {
            "success": False,
            "error": "Agent address not configured"
        }
    
    try:
        # Generate unique agent ID (in production, this would be an ERC-721 token ID)
        global _agent_counter
        _agent_counter += 1
        timestamp_ms = int(time.time() * 1000)
        agent_id = f"agent_{timestamp_ms}_{_agent_counter}"
        
        # Create identity record
        identity = {
            "agent_id": agent_id,
            "agent_address": agent_address,
            "agent_name": agent_name,
            "agent_type": agent_type,
            "capabilities": capabilities,
            "metadata_uri": metadata_uri,
            "description": description,
            "registered_at": datetime.now().isoformat(),
            "status": "active"
        }
        
        # Store in registry
        identity_registry[agent_id] = identity
        
        return {
            "success": True,
            "agent_id": agent_id,
            "identity": identity,
            "message": "Agent identity registered successfully"
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def discover_agents(
    agent_type: Optional[str] = None,
    capability: Optional[str] = None,
    min_reputation: float = 0.0
) -> Dict[str, Any]:
    """
    Discover agents matching criteria.
    
    Args:
        agent_type: Filter by agent type (optional)
        capability: Filter by specific capability (optional)
        min_reputation: Minimum reputation score (default: 0.0)
    
    Returns:
        List of matching agents with reputation scores
    """
    try:
        matching_agents = []
        
        for agent_id, identity in identity_registry.items():
            if identity["status"] != "active":
                continue
            
            # Filter by type
            if agent_type and identity["agent_type"] != agent_type:
                continue
            
            # Filter by capability
            if capability and capability not in identity["capabilities"]:
                continue
            
            # Calculate reputation score
            reputation_score = calculate_reputation(agent_id)
            
            # Filter by minimum reputation
            if reputation_score < min_reputation:
                continue
            
            agent_info = identity.copy()
            agent_info["reputation_score"] = reputation_score
            matching_agents.append(agent_info)
        
        return {
            "success": True,
            "count": len(matching_agents),
            "agents": matching_agents
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def submit_reputation_feedback(
    agent_id: str,
    rating: float,
    feedback_type: str = "general",
    comment: str = ""
) -> Dict[str, Any]:
    """
    Submit reputation feedback for an agent (Reputation Registry).
    
    Args:
        agent_id: The agent ID to rate
        rating: Rating score (0.0 to 5.0)
        feedback_type: Type of feedback (e.g., "performance", "reliability", "cost")
        comment: Optional feedback comment
    
    Returns:
        Feedback submission result
    """
    if not agent_address:
        return {
            "success": False,
            "error": "Agent address not configured"
        }
    
    try:
        if agent_id not in identity_registry:
            return {
                "success": False,
                "error": "Agent not found"
            }
        
        # Validate rating
        if rating < 0.0 or rating > 5.0:
            return {
                "success": False,
                "error": "Rating must be between 0.0 and 5.0"
            }
        
        # Create feedback record
        feedback = {
            "agent_id": agent_id,
            "rater_address": agent_address,
            "rating": rating,
            "feedback_type": feedback_type,
            "comment": comment,
            "timestamp": datetime.now().isoformat()
        }
        
        # Store in reputation registry
        if agent_id not in reputation_registry:
            reputation_registry[agent_id] = []
        reputation_registry[agent_id].append(feedback)
        
        return {
            "success": True,
            "feedback": feedback,
            "message": "Reputation feedback submitted"
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def request_validation(
    agent_id: str,
    validation_type: str,
    validation_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Request validation for an agent (Validation Registry).
    
    Args:
        agent_id: The agent ID to validate
        validation_type: Type of validation (e.g., "stake", "zk_proof", "tee")
        validation_data: Validation-specific data
    
    Returns:
        Validation request result
    """
    if not agent_address:
        return {
            "success": False,
            "error": "Agent address not configured"
        }
    
    try:
        if agent_id not in identity_registry:
            return {
                "success": False,
                "error": "Agent not found"
            }
        
        # Create validation request
        validation = {
            "agent_id": agent_id,
            "requester_address": agent_address,
            "validation_type": validation_type,
            "validation_data": validation_data,
            "status": "pending",
            "requested_at": datetime.now().isoformat()
        }
        
        # Store in validation registry
        if agent_id not in validation_registry:
            validation_registry[agent_id] = []
        validation_registry[agent_id].append(validation)
        
        return {
            "success": True,
            "validation": validation,
            "message": "Validation request submitted"
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def record_agent_interaction(
    from_agent_id: str,
    to_agent_id: str,
    interaction_type: str,
    result: str = "success",
    metadata: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Record an interaction between agents.
    
    Args:
        from_agent_id: Source agent ID
        to_agent_id: Target agent ID
        interaction_type: Type of interaction
        result: Interaction result (success, failure, timeout)
        metadata: Additional interaction metadata
    
    Returns:
        Interaction record
    """
    try:
        if from_agent_id not in identity_registry or to_agent_id not in identity_registry:
            return {
                "success": False,
                "error": "One or both agents not found"
            }
        
        interaction = {
            "from_agent_id": from_agent_id,
            "to_agent_id": to_agent_id,
            "interaction_type": interaction_type,
            "result": result,
            "metadata": metadata or {},
            "timestamp": datetime.now().isoformat()
        }
        
        interaction_log.append(interaction)
        
        return {
            "success": True,
            "interaction": interaction,
            "message": "Interaction recorded"
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@mcp.tool()
def get_agent_profile(agent_id: str) -> Dict[str, Any]:
    """
    Get complete agent profile including identity, reputation, and validations.
    
    Args:
        agent_id: The agent ID
    
    Returns:
        Complete agent profile
    """
    try:
        if agent_id not in identity_registry:
            return {
                "success": False,
                "error": "Agent not found"
            }
        
        identity = identity_registry[agent_id]
        reputation_score = calculate_reputation(agent_id)
        reputation_feedback = reputation_registry.get(agent_id, [])
        validations = validation_registry.get(agent_id, [])
        
        # Count interactions
        interactions_as_source = len([i for i in interaction_log if i["from_agent_id"] == agent_id])
        interactions_as_target = len([i for i in interaction_log if i["to_agent_id"] == agent_id])
        
        return {
            "success": True,
            "agent_id": agent_id,
            "identity": identity,
            "reputation": {
                "score": reputation_score,
                "feedback_count": len(reputation_feedback),
                "recent_feedback": reputation_feedback[-5:] if reputation_feedback else []
            },
            "validations": {
                "count": len(validations),
                "recent": validations[-5:] if validations else []
            },
            "interactions": {
                "as_source": interactions_as_source,
                "as_target": interactions_as_target
            }
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


def calculate_reputation(agent_id: str) -> float:
    """Calculate reputation score for an agent"""
    if agent_id not in reputation_registry or not reputation_registry[agent_id]:
        return 0.0
    
    feedbacks = reputation_registry[agent_id]
    if not feedbacks:
        return 0.0
    
    # Simple average rating
    total_rating = sum(f["rating"] for f in feedbacks)
    return total_rating / len(feedbacks)


# Flask routes for frontend
@app.route('/')
def index():
    """Render the trustless agents frontend"""
    return render_template('index.html')


@app.route('/api/register', methods=['POST'])
def api_register():
    """API endpoint for agent registration"""
    data = request.json
    result = register_agent_identity(
        data.get('agent_name', ''),
        data.get('agent_type', ''),
        data.get('capabilities', []),
        data.get('metadata_uri', ''),
        data.get('description', '')
    )
    return jsonify(result)


@app.route('/api/discover', methods=['GET'])
def api_discover():
    """API endpoint for agent discovery"""
    agent_type = request.args.get('agent_type', None)
    capability = request.args.get('capability', None)
    min_reputation = float(request.args.get('min_reputation', 0.0))
    
    result = discover_agents(agent_type, capability, min_reputation)
    return jsonify(result)


@app.route('/api/feedback', methods=['POST'])
def api_feedback():
    """API endpoint for reputation feedback"""
    data = request.json
    result = submit_reputation_feedback(
        data.get('agent_id', ''),
        float(data.get('rating', 0.0)),
        data.get('feedback_type', 'general'),
        data.get('comment', '')
    )
    return jsonify(result)


@app.route('/api/agent/<agent_id>', methods=['GET'])
def api_get_agent(agent_id):
    """API endpoint for agent profile"""
    result = get_agent_profile(agent_id)
    return jsonify(result)


@app.route('/api/interaction', methods=['POST'])
def api_interaction():
    """API endpoint for recording interactions"""
    data = request.json
    result = record_agent_interaction(
        data.get('from_agent_id', ''),
        data.get('to_agent_id', ''),
        data.get('interaction_type', ''),
        data.get('result', 'success'),
        data.get('metadata', {})
    )
    return jsonify(result)


if __name__ == "__main__":
    # Create templates directory if it doesn't exist
    os.makedirs('templates', exist_ok=True)
    
    # Run Flask app
    app.run(host='0.0.0.0', port=5002, debug=True)
