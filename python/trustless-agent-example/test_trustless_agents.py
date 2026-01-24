#!/usr/bin/env python3
"""
Unit tests for EIP-8004 Trustless Agents
"""

import os
import sys
import pytest
from unittest.mock import Mock, patch, MagicMock

# Set test environment variables
os.environ["PRIVATE_KEY"] = "0x" + "1" * 64
os.environ["BSC_TESTNET_RPC"] = "https://test-rpc.example.com"

# Mock Web3
mock_w3 = MagicMock()
mock_w3.is_connected.return_value = True

MockWeb3 = MagicMock(return_value=mock_w3)
MockWeb3.HTTPProvider = MagicMock()

_web3_patcher = patch("web3.Web3", MockWeb3)
_web3_patcher.start()

import trustless_agents  # noqa: E402


class TestRegisterAgentIdentity:
    """Tests for register_agent_identity tool"""
    
    def test_missing_agent_address(self):
        """Test when agent address is not configured"""
        with patch.object(trustless_agents, "agent_address", None):
            result = trustless_agents.register_agent_identity(
                "Test Agent",
                "payment",
                ["payment", "api"]
            )
            assert result["success"] is False
            assert "not configured" in result["error"].lower()
    
    def test_successful_registration(self):
        """Test successful agent registration"""
        trustless_agents.identity_registry.clear()
        
        with patch.object(trustless_agents, "agent_address", "0x1234567890123456789012345678901234567890"):
            result = trustless_agents.register_agent_identity(
                "Test Agent",
                "payment",
                ["payment", "api"],
                "https://example.com/metadata",
                "Test description"
            )
            
            assert result["success"] is True
            assert "agent_id" in result
            assert result["identity"]["agent_name"] == "Test Agent"
            assert result["identity"]["agent_type"] == "payment"
            assert result["identity"]["capabilities"] == ["payment", "api"]
            assert result["identity"]["status"] == "active"


class TestDiscoverAgents:
    """Tests for discover_agents tool"""
    
    def test_discover_all_agents(self):
        """Test discovering all agents"""
        trustless_agents.identity_registry.clear()
        
        with patch.object(trustless_agents, "agent_address", "0x123"):
            # Register multiple agents
            trustless_agents.register_agent_identity("Agent1", "payment", ["payment"])
            trustless_agents.register_agent_identity("Agent2", "data", ["data"])
            
            result = trustless_agents.discover_agents()
            
            assert result["success"] is True
            assert result["count"] == 2
    
    def test_discover_by_type(self):
        """Test discovering agents by type"""
        trustless_agents.identity_registry.clear()
        
        with patch.object(trustless_agents, "agent_address", "0x123"):
            trustless_agents.register_agent_identity("PaymentAgent", "payment", ["payment"])
            trustless_agents.register_agent_identity("DataAgent", "data", ["data"])
            
            result = trustless_agents.discover_agents(agent_type="payment")
            
            assert result["success"] is True
            assert result["count"] == 1
            assert result["agents"][0]["agent_type"] == "payment"
    
    def test_discover_by_capability(self):
        """Test discovering agents by capability"""
        trustless_agents.identity_registry.clear()
        
        with patch.object(trustless_agents, "agent_address", "0x123"):
            trustless_agents.register_agent_identity("Agent1", "payment", ["payment", "api"])
            trustless_agents.register_agent_identity("Agent2", "data", ["data"])
            
            result = trustless_agents.discover_agents(capability="api")
            
            assert result["success"] is True
            assert result["count"] == 1
            assert "api" in result["agents"][0]["capabilities"]


class TestSubmitReputationFeedback:
    """Tests for submit_reputation_feedback tool"""
    
    def test_agent_not_found(self):
        """Test feedback for non-existent agent"""
        trustless_agents.identity_registry.clear()
        trustless_agents.reputation_registry.clear()
        
        result = trustless_agents.submit_reputation_feedback(
            "invalid_id",
            5.0,
            "general",
            "Great agent!"
        )
        
        assert result["success"] is False
        assert "not found" in result["error"].lower()
    
    def test_invalid_rating(self):
        """Test feedback with invalid rating"""
        trustless_agents.identity_registry.clear()
        trustless_agents.reputation_registry.clear()
        
        with patch.object(trustless_agents, "agent_address", "0x123"):
            create_result = trustless_agents.register_agent_identity("Test", "payment", ["payment"])
            agent_id = create_result["agent_id"]
            
            result = trustless_agents.submit_reputation_feedback(
                agent_id,
                10.0,  # Invalid rating > 5.0
                "general"
            )
            
            assert result["success"] is False
            assert "between" in result["error"].lower()
    
    def test_successful_feedback(self):
        """Test successful feedback submission"""
        trustless_agents.identity_registry.clear()
        trustless_agents.reputation_registry.clear()
        
        with patch.object(trustless_agents, "agent_address", "0x123"):
            create_result = trustless_agents.register_agent_identity("Test", "payment", ["payment"])
            agent_id = create_result["agent_id"]
            
            result = trustless_agents.submit_reputation_feedback(
                agent_id,
                4.5,
                "performance",
                "Excellent performance!"
            )
            
            assert result["success"] is True
            assert result["feedback"]["rating"] == 4.5
            assert result["feedback"]["feedback_type"] == "performance"


class TestRequestValidation:
    """Tests for request_validation tool"""
    
    def test_agent_not_found(self):
        """Test validation for non-existent agent"""
        trustless_agents.identity_registry.clear()
        trustless_agents.validation_registry.clear()
        
        result = trustless_agents.request_validation(
            "invalid_id",
            "stake",
            {"amount": 1000}
        )
        
        assert result["success"] is False
        assert "not found" in result["error"].lower()
    
    def test_successful_validation_request(self):
        """Test successful validation request"""
        trustless_agents.identity_registry.clear()
        trustless_agents.validation_registry.clear()
        
        with patch.object(trustless_agents, "agent_address", "0x123"):
            create_result = trustless_agents.register_agent_identity("Test", "payment", ["payment"])
            agent_id = create_result["agent_id"]
            
            result = trustless_agents.request_validation(
                agent_id,
                "stake",
                {"amount": 1000, "token": "BNB"}
            )
            
            assert result["success"] is True
            assert result["validation"]["validation_type"] == "stake"
            assert result["validation"]["status"] == "pending"


class TestRecordAgentInteraction:
    """Tests for record_agent_interaction tool"""
    
    def test_agent_not_found(self):
        """Test interaction with non-existent agent"""
        trustless_agents.identity_registry.clear()
        trustless_agents.interaction_log.clear()
        
        result = trustless_agents.record_agent_interaction(
            "invalid_id",
            "another_invalid_id",
            "payment"
        )
        
        assert result["success"] is False
        assert "not found" in result["error"].lower()
    
    def test_successful_interaction(self):
        """Test successful interaction recording"""
        trustless_agents.identity_registry.clear()
        trustless_agents.interaction_log.clear()
        
        with patch.object(trustless_agents, "agent_address", "0x123"):
            create_result1 = trustless_agents.register_agent_identity("Agent1", "payment", ["payment"])
            create_result2 = trustless_agents.register_agent_identity("Agent2", "data", ["data"])
            
            agent_id1 = create_result1["agent_id"]
            agent_id2 = create_result2["agent_id"]
            
            result = trustless_agents.record_agent_interaction(
                agent_id1,
                agent_id2,
                "payment",
                "success",
                {"amount": 100}
            )
            
            assert result["success"] is True
            assert result["interaction"]["interaction_type"] == "payment"
            assert result["interaction"]["result"] == "success"


class TestGetAgentProfile:
    """Tests for get_agent_profile tool"""
    
    def test_agent_not_found(self):
        """Test getting profile of non-existent agent"""
        trustless_agents.identity_registry.clear()
        
        result = trustless_agents.get_agent_profile("invalid_id")
        
        assert result["success"] is False
        assert "not found" in result["error"].lower()
    
    def test_successful_profile_retrieval(self):
        """Test successful profile retrieval"""
        trustless_agents.identity_registry.clear()
        trustless_agents.reputation_registry.clear()
        trustless_agents.interaction_log.clear()
        
        with patch.object(trustless_agents, "agent_address", "0x123"):
            create_result = trustless_agents.register_agent_identity("Test", "payment", ["payment"])
            agent_id = create_result["agent_id"]
            
            # Add some feedback
            trustless_agents.submit_reputation_feedback(agent_id, 4.5, "general")
            
            result = trustless_agents.get_agent_profile(agent_id)
            
            assert result["success"] is True
            assert result["agent_id"] == agent_id
            assert "identity" in result
            assert "reputation" in result
            assert "validations" in result
            assert "interactions" in result
            assert result["reputation"]["score"] == 4.5


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
