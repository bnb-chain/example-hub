"""
Tests for governance rules and logic.
"""

import pytest
from governance import GovernanceRules


def test_calculate_quorum():
    """Test quorum calculation."""
    # 20% quorum of 100 voters = 20
    quorum = GovernanceRules.calculate_quorum(100)
    assert quorum == 20
    
    # 20% quorum of 50 voters = 10
    quorum = GovernanceRules.calculate_quorum(50)
    assert quorum == 10
    
    # Edge case: 0 voters
    quorum = GovernanceRules.calculate_quorum(0)
    assert quorum == 0


def test_check_quorum_met():
    """Test quorum requirement checking."""
    total_eligible = 100
    
    # Quorum met: 20+ votes (20% of 100)
    assert GovernanceRules.check_quorum_met(20, total_eligible) is True
    assert GovernanceRules.check_quorum_met(30, total_eligible) is True
    
    # Quorum not met: < 20 votes
    assert GovernanceRules.check_quorum_met(19, total_eligible) is False
    assert GovernanceRules.check_quorum_met(10, total_eligible) is False
    assert GovernanceRules.check_quorum_met(0, total_eligible) is False


def test_calculate_approval_rate():
    """Test approval rate calculation."""
    # 50% approval
    rate = GovernanceRules.calculate_approval_rate(50, 50)
    assert rate == 50.0
    
    # 100% approval
    rate = GovernanceRules.calculate_approval_rate(100, 0)
    assert rate == 100.0
    
    # 0% approval
    rate = GovernanceRules.calculate_approval_rate(0, 100)
    assert rate == 0.0
    
    # 75% approval
    rate = GovernanceRules.calculate_approval_rate(75, 25)
    assert rate == 75.0
    
    # No votes
    rate = GovernanceRules.calculate_approval_rate(0, 0)
    assert rate == 0.0


def test_check_approval_met():
    """Test approval threshold checking (50%)."""
    # Approval met: >= 50%
    assert GovernanceRules.check_approval_met(50, 50) is True
    assert GovernanceRules.check_approval_met(60, 40) is True
    assert GovernanceRules.check_approval_met(100, 0) is True
    
    # Approval not met: < 50%
    assert GovernanceRules.check_approval_met(49, 51) is False
    assert GovernanceRules.check_approval_met(40, 60) is False
    assert GovernanceRules.check_approval_met(0, 100) is False


def test_determine_outcome_passed():
    """Test outcome determination for passed proposal."""
    total_eligible = 100
    
    # Passed: Quorum met (20+) and approval met (50%+)
    outcome = GovernanceRules.determine_outcome(30, 10, total_eligible)
    
    assert outcome["status"] == "passed"
    assert outcome["quorum_met"] is True
    assert outcome["approval_met"] is True
    assert outcome["total_votes"] == 40
    assert outcome["approval_rate"] == 75.0


def test_determine_outcome_rejected_no_quorum():
    """Test outcome determination when quorum not met."""
    total_eligible = 100
    
    # Rejected: Quorum not met (< 20)
    outcome = GovernanceRules.determine_outcome(10, 5, total_eligible)
    
    assert outcome["status"] == "rejected"
    assert outcome["reason"] == "Quorum not met"
    assert outcome["quorum_met"] is False
    assert outcome["total_votes"] == 15


def test_determine_outcome_rejected_no_approval():
    """Test outcome determination when approval not met."""
    total_eligible = 100
    
    # Rejected: Quorum met but approval not met
    outcome = GovernanceRules.determine_outcome(10, 20, total_eligible)
    
    assert outcome["status"] == "rejected"
    assert outcome["reason"] == "Approval threshold not met"
    assert outcome["quorum_met"] is True
    assert outcome["approval_met"] is False
    assert outcome["approval_rate"] == pytest.approx(33.33, rel=0.1)


def test_determine_outcome_edge_case_exact_threshold():
    """Test outcome with exact threshold values."""
    total_eligible = 100
    
    # Exactly 50% approval, exactly 20 votes (quorum)
    outcome = GovernanceRules.determine_outcome(10, 10, total_eligible)
    
    assert outcome["status"] == "passed"
    assert outcome["quorum_met"] is True
    assert outcome["approval_met"] is True
    assert outcome["approval_rate"] == 50.0


def test_is_eligible_voter_valid():
    """Test voter eligibility checking with valid addresses."""
    # Valid Ethereum address
    assert GovernanceRules.is_eligible_voter(
        "0x1234567890123456789012345678901234567890"
    ) is True
    
    assert GovernanceRules.is_eligible_voter(
        "0xabcdefABCDEF0123456789012345678901234567"
    ) is True


def test_is_eligible_voter_invalid():
    """Test voter eligibility checking with invalid addresses."""
    # Too short
    assert GovernanceRules.is_eligible_voter("0x123") is False
    
    # Missing 0x prefix
    assert GovernanceRules.is_eligible_voter(
        "1234567890123456789012345678901234567890"
    ) is False
    
    # Empty string
    assert GovernanceRules.is_eligible_voter("") is False
    
    # None
    assert GovernanceRules.is_eligible_voter(None) is False


def test_get_voting_power():
    """Test voting power calculation."""
    # Valid address has 1 vote
    power = GovernanceRules.get_voting_power(
        "0x1234567890123456789012345678901234567890"
    )
    assert power == 1
    
    # Invalid address has 0 votes
    power = GovernanceRules.get_voting_power("0x123")
    assert power == 0
    
    power = GovernanceRules.get_voting_power("")
    assert power == 0


def test_outcome_includes_all_fields():
    """Test that outcome includes all required fields."""
    total_eligible = 100
    outcome = GovernanceRules.determine_outcome(30, 10, total_eligible)
    
    required_fields = [
        "status", "reason", "quorum_met", "approval_met",
        "approval_rate", "total_votes", "votes_for", "votes_against",
        "required_quorum", "required_approval"
    ]
    
    for field in required_fields:
        assert field in outcome


def test_determine_outcome_no_votes():
    """Test outcome determination with no votes."""
    total_eligible = 100
    outcome = GovernanceRules.determine_outcome(0, 0, total_eligible)
    
    assert outcome["status"] == "rejected"
    assert outcome["quorum_met"] is False
    assert outcome["total_votes"] == 0
    assert outcome["approval_rate"] == 0.0


def test_determine_outcome_all_for():
    """Test outcome with all votes for."""
    total_eligible = 100
    outcome = GovernanceRules.determine_outcome(50, 0, total_eligible)
    
    assert outcome["status"] == "passed"
    assert outcome["approval_rate"] == 100.0
    assert outcome["quorum_met"] is True
    assert outcome["approval_met"] is True


def test_determine_outcome_all_against():
    """Test outcome with all votes against."""
    total_eligible = 100
    outcome = GovernanceRules.determine_outcome(0, 50, total_eligible)
    
    assert outcome["status"] == "rejected"
    assert outcome["approval_rate"] == 0.0
    assert outcome["quorum_met"] is True
    assert outcome["approval_met"] is False


def test_quorum_and_approval_independence():
    """Test that quorum and approval are checked independently."""
    total_eligible = 100
    
    # High approval but low quorum
    outcome = GovernanceRules.determine_outcome(10, 2, total_eligible)
    assert outcome["approval_met"] is True
    assert outcome["quorum_met"] is False
    assert outcome["status"] == "rejected"
    
    # High quorum but low approval
    outcome = GovernanceRules.determine_outcome(10, 30, total_eligible)
    assert outcome["approval_met"] is False
    assert outcome["quorum_met"] is True
    assert outcome["status"] == "rejected"
