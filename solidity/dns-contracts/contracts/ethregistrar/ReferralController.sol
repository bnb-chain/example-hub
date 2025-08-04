//SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;
import {IPriceOracle} from "./IETHRegistrarController.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
using SafeERC20 for IERC20;
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract ReferralController is Ownable {
    // Mapping from referral code to referrer address
    uint16 private constant TIER1 = 2;
    uint16 private constant TIER2 = 15;
    uint16 private constant TIER3 = 20;
    uint256 private constant PCT1 = 15;
    uint256 private constant PCT2 = 20;
    uint256 private constant PCT3 = 25;
    mapping(address => bool) public controllers;
    mapping(bytes32 => uint256) public commitments;
    mapping(bytes32 => address) public referrees;
    mapping(bytes32 => uint256) public expirydates;
    mapping(address => bytes32[]) public referrals;
    mapping(bytes32 => string) public referredBy;
    mapping(address => uint256) public nativeEarnings;
    mapping(address => mapping(address => uint256)) public tokenEarnings;

    bytes32[] public referralCodes;
    uint256 public untrackedEarnings;
    uint256 public snapshotUntrackedEarnings;
    mapping(address => uint256) public snapshotNativeEarnings;
    mapping(address => mapping(address => uint256))
        public snapshotTokenEarnings;
    uint256 public trackedNativeEarnings;
    mapping(address => uint256) public trackedTokenEarnings;

    event ReferralCodeAdded(string indexed code, address indexed referrer);
    event WithdrawalDispersed(address indexed);
    modifier onlyControllerOrOwner() {
        require(
            controllers[msg.sender] || msg.sender == owner(),
            "Not a controller or owner"
        );
        _;
    }

    function addController(address controller) external onlyOwner {
        require(controller != address(0), "Invalid controller address");
        controllers[controller] = true;
    }

    function settlementRegister(
        string memory referree,
        string memory name,
        address owner,
        uint256 amount,
        address receiver
    ) external payable onlyControllerOrOwner {
        // If the referree is already registered, we can use it

        require(
            receiver != address(0) && receiver != owner,
            "Invalid receiver address"
        );
        if (expirydates[keccak256(bytes(referree))] > block.timestamp) {
            bool contains;
            for (uint256 i = 0; i < referrals[receiver].length; i++) {
                if (referrals[receiver][i] == keccak256(bytes(name))) {
                    contains = true;
                    break;
                }
            }
            if (contains == false) {
                referrals[receiver].push(keccak256(bytes(name)));
                referredBy[keccak256(bytes(name))] = referree;
                _applyNativeReward(receiver, amount, false);
            } else {
                _applyNativeReward(receiver, amount, false);
            }
        } else {
            payable(Ownable.owner()).transfer(amount);
        }
    }

    function settlementRegisterWithCard(
        string memory referree,
        string memory name,
        address owner,
        uint256 amount,
        address receiver
    ) external onlyControllerOrOwner {
        // If the referree is already registered, we can use it
        require(
            receiver != address(0) && receiver != owner,
            "Invalid receiver address"
        );
        if (expirydates[keccak256(bytes(referree))] > block.timestamp) {
            bool contains;
            for (uint256 i = 0; i < referrals[receiver].length; i++) {
                if (referrals[receiver][i] == keccak256(bytes(name))) {
                    contains = true;
                }
            }
            if (contains == false) {
                referrals[receiver].push(keccak256(bytes(name)));
                referredBy[keccak256(bytes(name))] = referree;
                _applyNativeReward(receiver, amount, true);
            } else {
                _applyNativeReward(receiver, amount, true);
            }
        }
    }

    /// @notice Only your controller or admin should be able to call this!
    function setReferree(
        bytes32 code,
        address who,
        uint256 duration
    ) external onlyControllerOrOwner {
        require(code != bytes32(0), "Invalid referral code");
        require(who != address(0), "Invalid referree address");
        require(
            referrees[code] == address(0),
            "Referral code already registered"
        );
        address prevReferree = referrees[code];
        if (prevReferree != address(0)) {
            referrals[prevReferree] = new bytes32[](0);
        }
        referrees[code] = who;
        referralCodes.push(code);
        expirydates[code] = duration;
    }

    function settlementCard(
        uint256 amount,
        address receiver,
        string memory referree
    ) external onlyControllerOrOwner {
        // If the referree is already registered, we can use it
        if (expirydates[keccak256(bytes(referree))] > block.timestamp) {
            require(receiver != address(0), "Invalid receiver address");
            _applyNativeReward(receiver, amount, true);
        }
    }

    function settlement(
        uint256 amount,
        address receiver,
        string memory referree
    ) external payable onlyControllerOrOwner {
        // If the referree is already registered, we can use it
        if (expirydates[keccak256(bytes(referree))] > block.timestamp) {
            require(receiver != address(0), "Invalid receiver address");
            _applyNativeReward(receiver, amount, false);
        } else {
            payable(Ownable.owner()).transfer(amount);
        }
    }

    function settlementWithToken(
        uint256 amount,
        address receiver,
        address tokenAddress,
        string memory referree
    ) external onlyControllerOrOwner {
        // If the referree is already registered, we can use it
        if (expirydates[keccak256(bytes(referree))] > block.timestamp) {
            require(receiver != address(0), "Invalid receiver address");
            _applyTokenReward(receiver, tokenAddress, amount);
        } else {
            IERC20(tokenAddress).safeTransfer(Ownable.owner(), amount);
        }
    }

    function settlementRegisterWithToken(
        string memory referree,
        string memory name,
        address owner,
        uint256 amount,
        address tokenAddress
    ) external onlyControllerOrOwner {
        // If the referree is already registered, we can use it
        // Implement token settlement logic here if needed
        if (expirydates[keccak256(bytes(referree))] > block.timestamp) {
            address receiver = referrees[keccak256(bytes(referree))];
            if (receiver != address(0) && receiver != owner) {
                bool contains;
                for (uint256 i = 0; i < referrals[receiver].length; i++) {
                    if (referrals[receiver][i] == keccak256(bytes(name))) {
                        contains = true;
                    }
                }
                if (contains == false) {
                    referrals[receiver].push(keccak256(bytes(name)));
                    referredBy[keccak256(bytes(name))] = referree;
                    _applyTokenReward(receiver, tokenAddress, amount);
                } else {
                    _applyTokenReward(receiver, tokenAddress, amount);
                }
            }
        } else {
            // If the referree is not registered, we can transfer the amount to the owner
            IERC20(tokenAddress).safeTransfer(Ownable.owner(), amount);
        }
    }

    function withdrawAllNativeEarnings(uint256 batch, uint256 start) external onlyOwner {
        for (uint256 i = start; i < batch; ) {
            bytes32 code = referralCodes[batch];
            if (block.timestamp < expirydates[code]) {
                address referrer = referrees[code];
                uint256 earnings = snapshotNativeEarnings[referrer];
                if (earnings > 0) {
                    (bool ok, ) = payable(referrer).call{value: earnings}("");
                    require(ok, "Payment failed");
                    nativeEarnings[referrer] = 0;
                    snapshotNativeEarnings[referrer] = 0;
                }
            }
            unchecked {
                ++i;
            }
        }
        // Transfer any remaining balance to the owner
        uint256 remainingBalance = address(this).balance;
        if (remainingBalance > 0) {
            payable(owner()).transfer(remainingBalance);
        }
        // Emit an event for the withdrawal
        emit WithdrawalDispersed(msg.sender);
    }

    function withdrawAllTokenEarnings(
        address[] memory tokenAddresses,
        uint256 batch,
        uint256 start
    ) external onlyOwner {
        uint256 tokenLength = tokenAddresses.length;
        for (uint256 j = 0; j < tokenLength; ) {
            address tokenAddress = tokenAddresses[j];
            for (uint256 i = start; i < batch;) {
                bytes32 code = referralCodes[i];
                if (block.timestamp < expirydates[code]) {
                    address referrer = referrees[code];
                    uint256 earnings = snapshotTokenEarnings[referrer][
                        tokenAddress
                    ];
                    require(earnings > 0, "No earnings to withdraw");
                    if (earnings > 0) {
                        IERC20(tokenAddress).safeTransfer(referrer, earnings);
                        snapshotTokenEarnings[referrer][tokenAddress] = 0;
                        tokenEarnings[referrer][tokenAddress] = 0;
                    }
                }
                unchecked {
                    ++i;
                }
            }
            unchecked {
                ++j;
            }
        }
    }

    function totalReferrals(address referrer) external view returns (uint256) {
        return referrals[referrer].length;
    }

    function totalNativeEarnings(
        address referrer
    ) external view returns (uint256) {
        return nativeEarnings[referrer];
    }

    function totalTokenEarnings(
        address referrer,
        address tokenAddress
    ) external view returns (uint256) {
        return tokenEarnings[referrer][tokenAddress];
    }

    function getCodes() external view returns (uint256) {
        return referralCodes.length;
    }

    function updateReferralCode(
        bytes32 code,
        uint256 newExpiry
    ) external onlyControllerOrOwner {
        require(expirydates[code] > 0, "Referral code does not exist");
        expirydates[code] = newExpiry;
    }

    function _rewardPct(uint256 numReferrals) public pure returns (uint256) {
        if (numReferrals >= TIER3) return PCT3;
        if (numReferrals >= TIER2) return PCT2;
        if (numReferrals >= TIER1) return PCT1;
        return 0; // No reward for less than TIER1 referrals
    }

    function _applyNativeReward(
        address receiver,
        uint256 amount,
        bool isFiat
    ) private {
        nativeEarnings[receiver] +=
            (amount * _rewardPct(referrals[receiver].length)) /
            100;
        if (isFiat) {
            untrackedEarnings +=
                (amount * _rewardPct(referrals[receiver].length)) /
                100;
        }
    }

    function _applyTokenReward(
        address receiver,
        address token,
        uint256 amount
    ) private {
        tokenEarnings[receiver][token] +=
            (amount * _rewardPct(referrals[receiver].length)) /
            100;
    }

    function balance() public view returns (uint256) {
        return address(this).balance;
    }

    function tokenBalance(address tokenAddress) public view returns (uint256) {
        return IERC20(tokenAddress).balanceOf(address(this));
    }

    function getUntracked() public view returns (uint256) {
        return untrackedEarnings;
    }

    function createSnapshot(
        address[] memory tokenAddresses
    ) external onlyOwner {
        snapshotUntrackedEarnings = untrackedEarnings;
        for (uint256 i = 0; i < referralCodes.length; i++) {
            bytes32 code = referralCodes[i];
            address referrer = referrees[code];
            snapshotNativeEarnings[referrer] = nativeEarnings[referrer];
        }
        for (uint256 j = 0; j < tokenAddresses.length; j++) {
            address tokenAddress = tokenAddresses[j];
            for (uint256 i = 0; i < referralCodes.length; i++) {
                bytes32 code = referralCodes[i];
                address referrer = referrees[code];
                snapshotTokenEarnings[referrer][tokenAddress] = tokenEarnings[
                    referrer
                ][tokenAddress];
            }
        }
    }

    function getSnapshotEarnings() public view returns (uint256) {
        return (snapshotUntrackedEarnings);
    }
}
