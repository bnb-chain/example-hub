// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SocialVault
 * @dev A family treasury wallet secured by an owner (MPC account) with spending limits for members.
 */
contract SocialVault {
    // Events
    event Deposited(address indexed sender, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);
    event MemberAdded(address indexed member, uint256 dailyLimit);
    event MemberRemoved(address indexed member);
    event RecoveryInitiated(address indexed guardian, address newOwner);
    event OwnerRotated(address indexed oldOwner, address indexed newOwner);

    // Roles
    address public owner;
    
    struct Member {
        bool isActive;
        uint256 dailyLimit;
        uint256 spentToday;
        uint256 lastSpendDay;
    }

    mapping(address => Member) public members;
    
    // Recovery
    address[] public guardians;
    mapping(address => bool) public isGuardian;
    mapping(address => address) public guardianVotes; // guardian -> newOwner
    uint256 public recoveryThreshold;

    constructor(address _owner, address[] memory _guardians, uint256 _threshold) {
        require(_owner != address(0), "Invalid owner");
        owner = _owner;
        
        for (uint i = 0; i < _guardians.length; i++) {
            require(!isGuardian[_guardians[i]], "Duplicate guardian");
            isGuardian[_guardians[i]] = true;
            guardians.push(_guardians[i]);
        }
        
        if (_guardians.length > 0) {
            require(_threshold > 0 && _threshold <= _guardians.length, "Invalid threshold");
            recoveryThreshold = _threshold;
        }
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyMemberOrOwner() {
        require(msg.sender == owner || members[msg.sender].isActive, "Not authorized");
        _;
    }

    receive() external payable {
        emit Deposited(msg.sender, msg.value);
    }

    // --- Owner Actions ---

    function addMember(address _member, uint256 _dailyLimit) external onlyOwner {
        members[_member] = Member({
            isActive: true,
            dailyLimit: _dailyLimit,
            spentToday: 0,
            lastSpendDay: block.timestamp / 1 days
        });
        emit MemberAdded(_member, _dailyLimit);
    }

    function removeMember(address _member) external onlyOwner {
        delete members[_member];
        emit MemberRemoved(_member);
    }

    // --- Spending ---

    function withdraw(address payable _to, uint256 _amount) external onlyMemberOrOwner {
        require(address(this).balance >= _amount, "Insufficient balance");

        if (msg.sender != owner) {
            _checkLimit(msg.sender, _amount);
        }

        (bool sent, ) = _to.call{value: _amount}("");
        require(sent, "Failed to send Ether");
        emit Withdrawn(_to, _amount);
    }

    function _checkLimit(address _member, uint256 _amount) internal {
        Member storage member = members[_member];
        uint256 currentDay = block.timestamp / 1 days;

        if (currentDay > member.lastSpendDay) {
            member.spentToday = 0;
            member.lastSpendDay = currentDay;
        }

        require(member.spentToday + _amount <= member.dailyLimit, "Daily limit exceeded");
        member.spentToday += _amount;
    }

    // --- Recovery ---
    // Simple recovery: 2-of-N guardians vote for a new owner.

    function initiateRecovery(address _newOwner) external {
        require(isGuardian[msg.sender], "Not a guardian");
        require(_newOwner != address(0), "Invalid new owner");

        guardianVotes[msg.sender] = _newOwner;
        emit RecoveryInitiated(msg.sender, _newOwner);

        _executeRecoveryIfReady(_newOwner);
    }

    function _executeRecoveryIfReady(address _newOwner) internal {
        uint256 votes = 0;
        for (uint i = 0; i < guardians.length; i++) {
            if (guardianVotes[guardians[i]] == _newOwner) {
                votes++;
            }
        }

        if (votes >= recoveryThreshold) {
            address oldOwner = owner;
            owner = _newOwner;
            emit OwnerRotated(oldOwner, _newOwner);
            // Reset votes
            for (uint i = 0; i < guardians.length; i++) {
                delete guardianVotes[guardians[i]];
            }
        }
    }
}
