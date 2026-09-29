#!/usr/bin/env python3
"""
Unit tests for TBNB Faucet MCP Server (Example 1)
"""

import os
import sys
import pytest
from unittest.mock import Mock, patch, MagicMock

# Set test environment variables before importing server
os.environ["PRIVATE_KEY"] = "0x" + "1" * 64  # Dummy private key for testing
os.environ["BSC_TESTNET_RPC"] = "https://test-rpc.example.com"

# Mock Web3 before importing server - connection check runs at import time
mock_w3 = MagicMock()
mock_w3.is_connected.return_value = True

def _is_address(addr):
    """Return False for invalid addresses, True for valid-looking ones."""
    if not addr or not isinstance(addr, str):
        return False
    addr = addr.strip()
    return addr.startswith("0x") and len(addr) == 42 and all(c in "0123456789abcdefABCDEFx" for c in addr[2:])

mock_w3.is_address.side_effect = _is_address
mock_w3.to_checksum_address.side_effect = lambda x: x if isinstance(x, str) else str(x)

mock_account = MagicMock()
# Valid 42-char Ethereum addresses (0x + 40 hex)
VALID_ADDR = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"
OTHER_ADDR = "0x1234567890123456789012345678901234567890"  # Different from faucet
mock_account.address = VALID_ADDR
mock_w3.eth.account.from_key.return_value = mock_account

# Web3(...) must return our mock; Web3.HTTPProvider is used as constructor arg
MockWeb3 = MagicMock(return_value=mock_w3)
MockWeb3.HTTPProvider = MagicMock()

# Patch before import - server connects to BSC at import time
_web3_patcher = patch("web3.Web3", MockWeb3)
_web3_patcher.start()

import server  # noqa: E402


class TestRequestTbnb:
    """Tests for request_tbnb tool"""
    
    def test_missing_private_key(self):
        """Test request_tbnb when private key is not configured"""
        with patch.object(server, "PRIVATE_KEY", ""):
            result = server.request_tbnb(VALID_ADDR, 0.1)
            assert result["success"] is False
            assert "not configured" in result["error"].lower()
    
    def test_invalid_address(self):
        """Test request_tbnb with invalid address"""
        result = server.request_tbnb("invalid_address", 0.1)
        assert result["success"] is False
        assert "invalid" in result["error"].lower()
    
    def test_self_transfer_prevention(self):
        """Test that sending to faucet address itself is prevented"""
        if server.faucet_address:
            result = server.request_tbnb(server.faucet_address, 0.1)
            assert result["success"] is False
            assert "faucet address itself" in result["error"].lower()
    
    def test_amount_validation_zero(self):
        """Test amount validation for zero or negative"""
        result = server.request_tbnb(OTHER_ADDR, 0)
        assert result["success"] is False
        assert "between 0 and 1.0" in result["error"].lower()
    
    def test_amount_validation_too_large(self):
        """Test amount validation for amounts over 1.0"""
        result = server.request_tbnb(OTHER_ADDR, 2.0)
        assert result["success"] is False
        assert "between 0 and 1.0" in result["error"].lower()
    
    @patch("server.w3")
    def test_successful_transaction(self, mock_w3):
        """Test successful TBNB request"""
        # Mock Web3 responses (recipient must differ from faucet)
        mock_w3.is_address.return_value = True
        mock_w3.to_checksum_address.return_value = OTHER_ADDR
        mock_w3.eth.get_transaction_count.return_value = 0
        mock_w3.eth.gas_price = 1000000000
        mock_w3.to_wei.return_value = 100000000000000000  # 0.1 ETH in Wei
        
        # Mock transaction signing
        mock_signed = Mock()
        mock_signed.rawTransaction = b"raw_tx_data"
        mock_w3.eth.account.sign_transaction.return_value = mock_signed
        
        # Mock transaction hash
        mock_tx_hash = Mock()
        mock_tx_hash.hex.return_value = "0x1234567890abcdef"
        mock_w3.eth.send_raw_transaction.return_value = mock_tx_hash
        
        # Mock receipt
        mock_receipt = Mock()
        mock_receipt.blockNumber = 12345
        mock_receipt.status = 1
        mock_w3.eth.wait_for_transaction_receipt.return_value = mock_receipt
        
        result = server.request_tbnb(OTHER_ADDR, 0.1)
        
        assert result["success"] is True
        assert result["transaction_hash"] == "0x1234567890abcdef"
        assert result["recipient"] == OTHER_ADDR
        assert result["amount"] == 0.1
        assert result["block_number"] == 12345
        assert result["status"] == "confirmed"
    
    @patch("server.w3")
    def test_transaction_failure(self, mock_w3):
        """Test handling of transaction failures"""
        mock_w3.is_address.return_value = True
        mock_w3.to_checksum_address.return_value = OTHER_ADDR
        mock_w3.eth.get_transaction_count.side_effect = Exception("Network error")
        
        result = server.request_tbnb(OTHER_ADDR, 0.1)
        
        assert result["success"] is False
        assert "error" in result


class TestGetFaucetBalance:
    """Tests for get_faucet_balance tool"""
    
    def test_no_faucet_address(self):
        """Test when faucet address is not configured"""
        with patch.object(server, 'faucet_address', None):
            result = server.get_faucet_balance()
            assert result["success"] is False
            assert "not configured" in result["error"].lower()
    
    @patch('server.w3')
    def test_successful_balance_check(self, mock_w3):
        """Test successful balance retrieval"""
        test_address = VALID_ADDR
        test_balance_wei = 1000000000000000000  # 1 ETH in Wei
        
        with patch.object(server, "faucet_address", test_address):
            mock_w3.eth.get_balance.return_value = test_balance_wei
            mock_w3.from_wei.return_value = 1.0
            
            result = server.get_faucet_balance()
            
            assert result["success"] is True
            assert result["address"] == test_address
            assert result["balance_wei"] == str(test_balance_wei)
            assert result["balance_tbnb"] == 1.0
            assert result["network"] == "BSC Testnet"
    
    @patch('server.w3')
    def test_balance_check_error(self, mock_w3):
        """Test error handling in balance check"""
        with patch.object(server, "faucet_address", VALID_ADDR):
            mock_w3.eth.get_balance.side_effect = Exception("RPC error")
            
            result = server.get_faucet_balance()
            
            assert result["success"] is False
            assert "error" in result


class TestCheckAddressBalance:
    """Tests for check_address_balance tool"""
    
    def test_invalid_address(self):
        """Test with invalid address"""
        result = server.check_address_balance("not-an-address")
        assert result["success"] is False
        assert "invalid" in result["error"].lower()
    
    @patch('server.w3')
    def test_successful_balance_check(self, mock_w3):
        """Test successful address balance check"""
        test_address = VALID_ADDR
        test_balance_wei = 500000000000000000  # 0.5 ETH in Wei
        
        mock_w3.is_address.return_value = True
        mock_w3.to_checksum_address.return_value = test_address
        mock_w3.eth.get_balance.return_value = test_balance_wei
        mock_w3.from_wei.return_value = 0.5
        
        result = server.check_address_balance(test_address)
        
        assert result["success"] is True
        assert result["address"] == test_address
        assert result["balance_wei"] == str(test_balance_wei)
        assert result["balance_tbnb"] == 0.5
        assert result["network"] == "BSC Testnet"
    
    @patch('server.w3')
    def test_balance_check_error(self, mock_w3):
        """Test error handling"""
        mock_w3.is_address.return_value = True
        mock_w3.to_checksum_address.return_value = VALID_ADDR
        mock_w3.eth.get_balance.side_effect = Exception("Network error")
        
        result = server.check_address_balance(VALID_ADDR)
        
        assert result["success"] is False
        assert "error" in result


class TestMCPIntegration:
    """Tests for MCP server integration"""
    
    def test_mcp_server_initialized(self):
        """Test that MCP server is properly initialized"""
        assert server.mcp is not None
        assert hasattr(server.mcp, 'run')
    
    def test_tools_registered(self):
        """Test that tools are registered with MCP"""
        # FastMCP tools are registered via decorators
        # We can verify the tools exist by checking the module
        assert hasattr(server, 'request_tbnb')
        assert hasattr(server, 'get_faucet_balance')
        assert hasattr(server, 'check_address_balance')


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
