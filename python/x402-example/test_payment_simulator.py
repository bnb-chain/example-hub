#!/usr/bin/env python3
"""
Unit tests for Crypto Payment Simulator
"""

import os
import sys
import pytest
from unittest.mock import Mock, patch, MagicMock

# Set test environment variables before importing
os.environ["PRIVATE_KEY"] = "0x" + "1" * 64
os.environ["BSC_TESTNET_RPC"] = "https://test-rpc.example.com"

# Mock Web3 before importing
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
mock_w3.to_wei.return_value = 100000000000000000  # 0.1 ETH in Wei
mock_w3.from_wei.return_value = 0.1

mock_account = MagicMock()
VALID_ADDR = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"
OTHER_ADDR = "0x1234567890123456789012345678901234567890"
mock_account.address = VALID_ADDR
mock_w3.eth.account.from_key.return_value = mock_account

MockWeb3 = MagicMock(return_value=mock_w3)
MockWeb3.HTTPProvider = MagicMock()

_web3_patcher = patch("web3.Web3", MockWeb3)
_web3_patcher.start()

import payment_simulator  # noqa: E402


class TestSendPayment:
    """Tests for send_payment tool"""
    
    def test_missing_private_key(self):
        """Test send_payment when private key is not configured"""
        with patch.object(payment_simulator, "PRIVATE_KEY", ""):
            result = payment_simulator.send_payment(VALID_ADDR, 0.1)
            assert result["success"] is False
            assert "not configured" in result["error"].lower()
    
    def test_invalid_address(self):
        """Test send_payment with invalid address"""
        result = payment_simulator.send_payment("invalid_address", 0.1)
        assert result["success"] is False
        assert "invalid" in result["error"].lower()
    
    def test_invalid_amount(self):
        """Test send_payment with invalid amount"""
        result = payment_simulator.send_payment(OTHER_ADDR, 0)
        assert result["success"] is False
        assert "greater than 0" in result["error"].lower()
    
    @patch("payment_simulator.w3")
    def test_successful_payment(self, mock_w3):
        """Test successful payment with timing metrics"""
        mock_w3.is_address.return_value = True
        mock_w3.to_checksum_address.return_value = OTHER_ADDR
        mock_w3.eth.block_number = 1000
        mock_w3.eth.get_transaction_count.return_value = 0
        mock_w3.eth.gas_price = 1000000000
        
        mock_signed = Mock()
        mock_signed.rawTransaction = b"raw_tx_data"
        mock_w3.eth.account.sign_transaction.return_value = mock_signed
        
        mock_tx_hash = Mock()
        mock_tx_hash.hex.return_value = "0x1234567890abcdef"
        mock_w3.eth.send_raw_transaction.return_value = mock_tx_hash
        
        mock_receipt = Mock()
        mock_receipt.blockNumber = 1002
        mock_receipt.status = 1
        mock_w3.eth.wait_for_transaction_receipt.return_value = mock_receipt
        
        result = payment_simulator.send_payment(OTHER_ADDR, 0.1, "Test payment")
        
        assert result["success"] is True
        assert result["transaction_hash"] == "0x1234567890abcdef"
        assert result["recipient"] == OTHER_ADDR
        assert result["amount"] == 0.1
        assert result["note"] == "Test payment"
        assert "timing" in result
        assert "confirmation_time_seconds" in result["timing"]
        assert "blocks_to_confirm" in result["timing"]
        assert result["timing"]["blocks_to_confirm"] == 2


class TestGetPaymentHistory:
    """Tests for get_payment_history tool"""
    
    def test_empty_history(self):
        """Test getting history when no transactions exist"""
        payment_simulator.transaction_history.clear()
        result = payment_simulator.get_payment_history()
        assert result["success"] is True
        assert result["count"] == 0
        assert result["transactions"] == []
    
    def test_history_with_limit(self):
        """Test getting history with limit"""
        # Add some mock transactions
        payment_simulator.transaction_history.clear()
        for i in range(5):
            payment_simulator.transaction_history.append({
                "transaction_hash": f"0x{i}",
                "amount": 0.1 * i
            })
        
        result = payment_simulator.get_payment_history(limit=3)
        assert result["success"] is True
        assert result["count"] == 3


class TestGetBalance:
    """Tests for get_balance tool"""
    
    def test_balance_with_address(self):
        """Test getting balance for specific address"""
        test_address = VALID_ADDR
        test_balance_wei = 1000000000000000000
        
        mock_w3.is_address.return_value = True
        mock_w3.to_checksum_address.return_value = test_address
        mock_w3.eth.get_balance.return_value = test_balance_wei
        mock_w3.from_wei.return_value = 1.0
        
        result = payment_simulator.get_balance(test_address)
        
        assert result["success"] is True
        assert result["address"] == test_address
        assert result["balance_bnb"] == 1.0
    
    def test_balance_no_sender(self):
        """Test getting balance when no sender configured"""
        with patch.object(payment_simulator, "sender_address", None):
            result = payment_simulator.get_balance()
            assert result["success"] is False
            assert "no sender address configured" in result["error"].lower()


class TestGetNetworkStats:
    """Tests for get_network_stats tool"""
    
    @patch("payment_simulator.w3")
    def test_network_stats(self, mock_w3):
        """Test getting network statistics"""
        mock_w3.eth.block_number = 5000
        mock_block = Mock()
        mock_block.timestamp = 1000000
        mock_w3.eth.get_block.return_value = mock_block
        
        result = payment_simulator.get_network_stats()
        
        assert result["success"] is True
        assert result["network"] == "BSC Testnet"
        assert result["chain_id"] == 97
        assert result["current_block"] == 5000
        assert result["fermi_block_time_seconds"] == 0.45


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
