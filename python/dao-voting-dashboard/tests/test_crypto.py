"""
Tests for cryptographic utilities.
"""

import pytest
from crypto_utils import VoteSignature, MerkleProof


def test_sign_vote():
    """Test vote signing."""
    private_key = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    message = "Vote for on proposal 1"
    
    address, signature = VoteSignature.sign_vote(private_key, message)
    
    assert address is not None
    assert signature is not None
    assert address.startswith("0x")
    assert len(address) == 42
    assert signature.startswith("0x")


def test_verify_vote_valid():
    """Test verifying a valid vote signature."""
    private_key = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    message = "Vote for on proposal 1"
    
    address, signature = VoteSignature.sign_vote(private_key, message)
    
    # Verify with correct parameters
    is_valid = VoteSignature.verify_vote(message, signature, address)
    assert is_valid is True


def test_verify_vote_wrong_message():
    """Test verifying with wrong message fails."""
    private_key = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    message = "Vote for on proposal 1"
    wrong_message = "Vote against on proposal 1"
    
    address, signature = VoteSignature.sign_vote(private_key, message)
    
    # Verify with wrong message
    is_valid = VoteSignature.verify_vote(wrong_message, signature, address)
    assert is_valid is False


def test_verify_vote_wrong_address():
    """Test verifying with wrong address fails."""
    private_key = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    message = "Vote for on proposal 1"
    wrong_address = "0x0000000000000000000000000000000000000000"
    
    address, signature = VoteSignature.sign_vote(private_key, message)
    
    # Verify with wrong address
    is_valid = VoteSignature.verify_vote(message, signature, wrong_address)
    assert is_valid is False


def test_sign_vote_different_messages():
    """Test that different messages produce different signatures."""
    private_key = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    message1 = "Vote for on proposal 1"
    message2 = "Vote against on proposal 1"
    
    address1, signature1 = VoteSignature.sign_vote(private_key, message1)
    address2, signature2 = VoteSignature.sign_vote(private_key, message2)
    
    # Same address, different signatures
    assert address1 == address2
    assert signature1 != signature2


def test_sign_vote_different_keys():
    """Test that different keys produce different addresses."""
    private_key1 = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    private_key2 = "0xfedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210"
    message = "Vote for on proposal 1"
    
    address1, signature1 = VoteSignature.sign_vote(private_key1, message)
    address2, signature2 = VoteSignature.sign_vote(private_key2, message)
    
    # Different addresses and signatures
    assert address1 != address2
    assert signature1 != signature2


def test_merkle_proof_generation():
    """Test Merkle proof generation (mock)."""
    votes = [
        {"voter": "0xvoter1", "choice": "for"},
        {"voter": "0xvoter2", "choice": "against"},
        {"voter": "0xvoter3", "choice": "for"},
    ]
    
    proof = MerkleProof.generate_proof(votes, 0)
    
    assert proof is not None
    assert isinstance(proof, list)
    assert len(proof) > 0
    assert all(isinstance(h, str) for h in proof)
    assert all(h.startswith("0x") for h in proof)


def test_merkle_root_generation():
    """Test Merkle root generation (mock)."""
    votes = [
        {"voter": "0xvoter1", "choice": "for"},
        {"voter": "0xvoter2", "choice": "against"},
    ]
    
    root = MerkleProof.generate_root(votes)
    
    assert root is not None
    assert isinstance(root, str)
    assert root.startswith("0x")
    assert len(root) == 66  # 0x + 64 hex chars


def test_merkle_root_empty_votes():
    """Test Merkle root with no votes."""
    votes = []
    root = MerkleProof.generate_root(votes)
    
    assert root is not None
    assert isinstance(root, str)


def test_merkle_proof_different_indices():
    """Test that different vote indices produce different proofs."""
    votes = [
        {"voter": "0xvoter1", "choice": "for"},
        {"voter": "0xvoter2", "choice": "against"},
        {"voter": "0xvoter3", "choice": "for"},
    ]
    
    proof1 = MerkleProof.generate_proof(votes, 0)
    proof2 = MerkleProof.generate_proof(votes, 1)
    
    # Proofs should be different for different indices
    assert proof1 != proof2


def test_vote_signature_consistency():
    """Test that signing the same message produces consistent results."""
    private_key = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    message = "Vote for on proposal 1"
    
    address1, signature1 = VoteSignature.sign_vote(private_key, message)
    address2, signature2 = VoteSignature.sign_vote(private_key, message)
    
    # Same key and message should produce same address and signature
    assert address1 == address2
    assert signature1 == signature2


def test_verify_vote_case_insensitive_address():
    """Test that address verification is case-insensitive."""
    private_key = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    message = "Vote for on proposal 1"
    
    address, signature = VoteSignature.sign_vote(private_key, message)
    
    # Verify with different case
    is_valid_lower = VoteSignature.verify_vote(
        message, signature, address.lower()
    )
    is_valid_upper = VoteSignature.verify_vote(
        message, signature, address.upper()
    )
    
    assert is_valid_lower is True
    assert is_valid_upper is True


def test_merkle_root_deterministic():
    """Test that Merkle root generation is deterministic."""
    votes = [
        {"voter": "0xvoter1", "choice": "for"},
        {"voter": "0xvoter2", "choice": "against"},
    ]
    
    root1 = MerkleProof.generate_root(votes)
    root2 = MerkleProof.generate_root(votes)
    
    # Same votes should produce same root
    assert root1 == root2
