"""Tests for QR code generation."""

import pytest
import os
from pathlib import Path
from qr_generator import generate_ticket_qr, parse_qr_data


def test_generate_qr_code():
    """Test generating QR code."""
    qr_path = generate_ticket_qr(token_id=1, event_id=1)
    
    assert "static/qr_codes/ticket_1.png" in qr_path
    
    # Check file exists
    full_path = Path(qr_path)
    assert full_path.exists()
    
    # Cleanup
    if full_path.exists():
        full_path.unlink()


def test_generate_multiple_qr_codes():
    """Test generating multiple QR codes."""
    qr_path_1 = generate_ticket_qr(1, 1)
    qr_path_2 = generate_ticket_qr(2, 1)
    
    assert qr_path_1 != qr_path_2
    assert Path(qr_path_1).exists()
    assert Path(qr_path_2).exists()
    
    # Cleanup
    Path(qr_path_1).unlink()
    Path(qr_path_2).unlink()


def test_parse_qr_data_valid():
    """Test parsing valid QR data."""
    qr_data = "TICKET:123:EVENT:456"
    
    result = parse_qr_data(qr_data)
    
    assert result is not None
    assert result["token_id"] == 123
    assert result["event_id"] == 456


def test_parse_qr_data_invalid_format():
    """Test parsing invalid QR data format."""
    invalid_data = [
        "INVALID:123",
        "123:456",
        "TICKET:abc:EVENT:def",
        "",
        "TICKET:123"
    ]
    
    for data in invalid_data:
        result = parse_qr_data(data)
        assert result is None


def test_parse_qr_data_wrong_prefix():
    """Test parsing QR data with wrong prefix."""
    qr_data = "WRONG:123:EVENT:456"
    
    result = parse_qr_data(qr_data)
    assert result is None


def test_qr_code_roundtrip():
    """Test generating and parsing QR code data."""
    token_id = 42
    event_id = 99
    
    # Generate QR
    qr_path = generate_ticket_qr(token_id, event_id)
    
    # Construct expected data
    qr_data = f"TICKET:{token_id}:EVENT:{event_id}"
    
    # Parse
    parsed = parse_qr_data(qr_data)
    
    assert parsed["token_id"] == token_id
    assert parsed["event_id"] == event_id
    
    # Cleanup
    if Path(qr_path).exists():
        Path(qr_path).unlink()
