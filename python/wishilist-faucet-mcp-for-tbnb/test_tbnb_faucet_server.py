#!/usr/bin/env python3
"""
Unit tests for BNB Testnet Faucet Server-Side MCP (Example 2)
"""

import os
import sys
import pytest
from unittest.mock import Mock, patch, MagicMock

# Set test environment variables before importing server
os.environ["FAUCET_WALLET_PRIVATE_KEY"] = "0x" + "1" * 64  # Dummy private key
os.environ["BSC_TESTNET_RPC_URL"] = "https://test-rpc.example.com"
os.environ["SERVER_HOST"] = "127.0.0.1"
os.environ["SERVER_PORT"] = "8000"

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

# Mock middleware_onion (needed for inject call at import time)
mock_w3.middleware_onion = MagicMock()
mock_w3.middleware_onion.inject = MagicMock()

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

# Patch middleware at the server module level (handles both v6 and v7)
_mock_poa = MagicMock()
_middleware_patcher = patch("tbnb_faucet_server.poa_middleware", _mock_poa)
_middleware_patcher.start()

import tbnb_faucet_server as server  # noqa: E402


class TestIsValidAddress:
    """Tests for is_valid_address function"""
    
    @patch('tbnb_faucet_server.w3')
    def test_valid_address(self, mock_w3):
        """Test with valid address"""
        mock_w3.is_address.return_value = True
        result = server.is_valid_address(VALID_ADDR)
        assert result is True
    
    @patch('tbnb_faucet_server.w3')
    def test_invalid_address(self, mock_w3):
        """Test with invalid address"""
        mock_w3.is_address.return_value = False
        result = server.is_valid_address("invalid")
        assert result is False


class TestDisburseTbnb:
    """Tests for disburse_tbnb tool"""
    
    def test_no_private_key(self):
        """Test when private key is not configured"""
        with patch.object(server, "PRIVATE_KEY", ""):
            result = server.disburse_tbnb(VALID_ADDR, 0.1)
            assert result["success"] is False
            assert "not configured" in result["error"].lower()
    
    def test_no_faucet_address(self):
        """Test when faucet address is not initialized"""
        with patch.object(server, 'faucet_address', None):
            result = server.disburse_tbnb(VALID_ADDR, 0.1)
            assert result["success"] is False
            assert "not initialized" in result["error"].lower()
    
    def test_empty_recipient_address(self):
        """Test with empty recipient address"""
        result = server.disburse_tbnb("", 0.1)
        assert result["success"] is False
        assert "required" in result["error"].lower()
    
    def test_invalid_address_format(self):
        """Test with invalid address format"""
        with patch.object(server, 'is_valid_address', return_value=False):
            result = server.disburse_tbnb("invalid_address", 0.1)
            assert result["success"] is False
            assert "invalid" in result["error"].lower()
    
    def test_self_transfer_prevention(self):
        """Test that sending to faucet address itself is prevented"""
        with patch.object(server, 'faucet_address', VALID_ADDR):
            with patch.object(server, 'is_valid_address', return_value=True):
                with patch('tbnb_faucet_server.w3') as mock_w3:
                    mock_w3.to_checksum_address.return_value = VALID_ADDR
                    result = server.disburse_tbnb(VALID_ADDR, 0.1)
                    assert result["success"] is False
                    assert "faucet address itself" in result["error"].lower()
    
    def test_amount_zero(self):
        """Test amount validation for zero"""
        with patch.object(server, 'faucet_address', VALID_ADDR):
            with patch.object(server, 'is_valid_address', return_value=True):
                with patch('tbnb_faucet_server.w3') as mock_w3:
                    mock_w3.to_checksum_address.return_value = OTHER_ADDR
                    result = server.disburse_tbnb(OTHER_ADDR, 0)
                    assert result["success"] is False
                    assert "greater than 0" in result["error"].lower()
    
    def test_amount_too_large(self):
        """Test amount validation for amounts over 1.0"""
        with patch.object(server, 'faucet_address', VALID_ADDR):
            with patch.object(server, 'is_valid_address', return_value=True):
                with patch('tbnb_faucet_server.w3') as mock_w3:
                    mock_w3.to_checksum_address.return_value = OTHER_ADDR
                    result = server.disburse_tbnb(OTHER_ADDR, 2.0)
                    assert result["success"] is False
                    assert "Maximum amount" in result["error"] or "1.0" in result["error"]
    
    @patch('tbnb_faucet_server.w3')
    def test_successful_disbursement(self, mock_w3):
        """Test successful TBNB disbursement"""
        with patch.object(server, 'faucet_address', VALID_ADDR):
            with patch.object(server, 'is_valid_address', return_value=True):
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
                mock_tx_hash.hex.return_value = "0xabcdef1234567890"
                mock_w3.eth.send_raw_transaction.return_value = mock_tx_hash
                
                # Mock receipt
                mock_receipt = Mock()
                mock_receipt.blockNumber = 54321
                mock_receipt.status = 1
                mock_w3.eth.wait_for_transaction_receipt.return_value = mock_receipt
                
                result = server.disburse_tbnb(OTHER_ADDR, 0.1)
                
                assert result["success"] is True
                assert result["transaction_hash"] == "0xabcdef1234567890"
                assert result["recipient"] == OTHER_ADDR
                assert result["amount_tbnb"] == 0.1
                assert result["block_number"] == 54321
                assert result["status"] == "confirmed"
                assert "explorer_url" in result
                assert "testnet.bscscan.com" in result["explorer_url"]
    
    @patch('tbnb_faucet_server.w3')
    def test_transaction_failure(self, mock_w3):
        """Test handling of transaction failures"""
        with patch.object(server, 'faucet_address', VALID_ADDR):
            with patch.object(server, 'is_valid_address', return_value=True):
                mock_w3.to_checksum_address.return_value = OTHER_ADDR
                mock_w3.eth.get_transaction_count.side_effect = Exception("Network error")
                
                result = server.disburse_tbnb(OTHER_ADDR, 0.1)
                
                assert result["success"] is False
                assert "Transaction failed" in result["error"]


class TestServerConfiguration:
    """Tests for server configuration"""
    
    def test_server_host_configuration(self):
        """Test SERVER_HOST environment variable"""
        assert hasattr(server, 'SERVER_HOST')
        assert server.SERVER_HOST is not None
    
    def test_server_port_configuration(self):
        """Test SERVER_PORT environment variable"""
        assert hasattr(server, 'SERVER_PORT')
        assert isinstance(server.SERVER_PORT, int)
        assert server.SERVER_PORT > 0
    
    def test_mcp_server_initialized(self):
        """Test that MCP server is properly initialized"""
        assert server.mcp is not None
        assert hasattr(server.mcp, 'run')
    
    def test_tool_registered(self):
        """Test that disburse_tbnb tool is registered"""
        assert hasattr(server, 'disburse_tbnb')


class TestWeb3Connection:
    """Tests for Web3 connection setup"""
    
    def test_web3_initialized(self):
        """Test that Web3 is initialized"""
        assert hasattr(server, 'w3')
        assert server.w3 is not None
    
    @patch('tbnb_faucet_server.w3')
    def test_connection_check(self, mock_w3):
        """Test Web3 connection status"""
        mock_w3.is_connected.return_value = True
        # The connection check happens at import time
        # We can verify the w3 object exists
        assert server.w3 is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
