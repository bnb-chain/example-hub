#!/usr/bin/env python3
"""
Unit tests for x402 Payment Protocol
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
mock_w3.eth.chain_id = 97

def _is_address(addr):
    if not addr or not isinstance(addr, str):
        return False
    addr = addr.strip()
    return addr.startswith("0x") and len(addr) == 42

mock_w3.is_address.side_effect = _is_address
mock_w3.to_checksum_address.side_effect = lambda x: x if isinstance(x, str) else str(x)

mock_account = MagicMock()
VALID_ADDR = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"
OTHER_ADDR = "0x1234567890123456789012345678901234567890"
mock_account.address = VALID_ADDR
mock_account.key = b"test_key"
mock_w3.eth.account.from_key.return_value = mock_account

# Mock EIP-712 signing
mock_signature = MagicMock()
mock_signature.signature.hex.return_value = "0x" + "a" * 128
mock_w3.eth.account.sign_typed_data.return_value = mock_signature
mock_w3.eth.account.recover_typed_data.return_value = OTHER_ADDR

MockWeb3 = MagicMock(return_value=mock_w3)
MockWeb3.HTTPProvider = MagicMock()

_web3_patcher = patch("web3.Web3", MockWeb3)
_web3_patcher.start()

import x402_payment  # noqa: E402


class TestCreatePaymentRequest:
    """Tests for create_payment_request tool"""
    
    def test_missing_merchant_address(self):
        """Test when merchant address is not configured"""
        with patch.object(x402_payment, "merchant_address", None):
            result = x402_payment.create_payment_request("API Access", 10.0)
            assert result["success"] is False
            assert "not configured" in result["error"].lower()
    
    @patch("x402_payment.w3")
    def test_successful_payment_request(self, mock_w3):
        """Test successful payment request creation"""
        with patch.object(x402_payment, "merchant_address", VALID_ADDR):
            with patch.object(x402_payment, "merchant_account", mock_account):
                result = x402_payment.create_payment_request(
                    "API Access",
                    10.0,
                    "USDC",
                    "Test payment"
                )
                
                assert result["success"] is True
                assert "payment_id" in result
                assert result["http_status"] == 402
                assert result["payment_request"]["resource"] == "API Access"
                assert result["payment_request"]["amount"] == 10.0
                assert result["payment_request"]["currency"] == "USDC"
                assert "signature" in result["payment_request"]


class TestVerifyPaymentSignature:
    """Tests for verify_payment_signature tool"""
    
    def test_payment_request_not_found(self):
        """Test verification with non-existent payment ID"""
        x402_payment.payment_requests.clear()
        result = x402_payment.verify_payment_signature(
            "invalid_id",
            VALID_ADDR,
            "0x" + "a" * 128
        )
        assert result["success"] is False
        assert "not found" in result["error"].lower()
    
    @patch("x402_payment.w3")
    def test_invalid_payer_address(self, mock_w3):
        """Test verification with invalid address"""
        # Create a payment request first
        with patch.object(x402_payment, "merchant_address", VALID_ADDR):
            with patch.object(x402_payment, "merchant_account", mock_account):
                create_result = x402_payment.create_payment_request("Test", 1.0)
                payment_id = create_result["payment_id"]
                
                result = x402_payment.verify_payment_signature(
                    payment_id,
                    "invalid_address",
                    "0x" + "a" * 128
                )
                assert result["success"] is False


class TestExecutePayment:
    """Tests for execute_payment tool"""
    
    def test_missing_private_key(self):
        """Test execution when private key is not configured"""
        with patch.object(x402_payment, "PRIVATE_KEY", ""):
            result = x402_payment.execute_payment("test_id", VALID_ADDR)
            assert result["success"] is False
            assert "not configured" in result["error"].lower()
    
    def test_payment_not_verified(self):
        """Test execution of unverified payment"""
        x402_payment.payment_requests.clear()
        with patch.object(x402_payment, "merchant_address", VALID_ADDR):
            with patch.object(x402_payment, "merchant_account", mock_account):
                create_result = x402_payment.create_payment_request("Test", 1.0)
                payment_id = create_result["payment_id"]
                
                result = x402_payment.execute_payment(payment_id, VALID_ADDR)
                assert result["success"] is False
                assert "not verified" in result["error"].lower()


class TestGetPaymentStatus:
    """Tests for get_payment_status tool"""
    
    def test_payment_not_found(self):
        """Test getting status of non-existent payment"""
        x402_payment.payment_requests.clear()
        result = x402_payment.get_payment_status("invalid_id")
        assert result["success"] is False
        assert "not found" in result["error"].lower()
    
    def test_successful_status_check(self):
        """Test successful status retrieval"""
        x402_payment.payment_requests.clear()
        with patch.object(x402_payment, "merchant_address", VALID_ADDR):
            with patch.object(x402_payment, "merchant_account", mock_account):
                create_result = x402_payment.create_payment_request("Test", 1.0)
                payment_id = create_result["payment_id"]
                
                result = x402_payment.get_payment_status(payment_id)
                assert result["success"] is True
                assert "payment_request" in result


class TestListPaymentRequests:
    """Tests for list_payment_requests tool"""
    
    def test_list_all_payments(self):
        """Test listing all payments"""
        x402_payment.payment_requests.clear()
        with patch.object(x402_payment, "merchant_address", VALID_ADDR):
            with patch.object(x402_payment, "merchant_account", mock_account):
                x402_payment.create_payment_request("Test1", 1.0)
                x402_payment.create_payment_request("Test2", 2.0)
                
                result = x402_payment.list_payment_requests()
                assert result["success"] is True
                assert result["count"] == 2
    
    def test_list_filtered_payments(self):
        """Test listing payments filtered by status"""
        x402_payment.payment_requests.clear()
        with patch.object(x402_payment, "merchant_address", VALID_ADDR):
            with patch.object(x402_payment, "merchant_account", mock_account):
                x402_payment.create_payment_request("Test1", 1.0)
                
                result = x402_payment.list_payment_requests(status="pending")
                assert result["success"] is True
                assert result["count"] == 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
