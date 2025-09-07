// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MassPayouts
 * @dev Smart contract for distributing tokens to multiple recipients in a single transaction
 * @author BNB Chain Developer Philus Roffa
 */
contract MassPayouts is ReentrancyGuard, Ownable {

    // Events
    event MassPayoutExecuted(
        address indexed sender,
        address indexed token,
        uint256 totalAmount,
        uint256 recipientCount,
        uint256 timestamp
    );
    
    event PayoutCompleted(
        address indexed recipient,
        address indexed token,
        uint256 amount,
        bool success
    );

    event FeeUpdated(uint256 oldFee, uint256 newFee);
    
    // State variables
    uint256 public serviceFee = 0.001 ether; // Fee in BNB
    address public feeCollector;
    
    // Structs
    struct PayoutData {
        address recipient;
        uint256 amount;
    }

    // Mappings
    mapping(address => uint256) public totalPayoutsSent;
    mapping(address => uint256) public totalPayoutsReceived;
    
    // Modifiers
    modifier validPayoutData(PayoutData[] calldata payouts) {
        require(payouts.length > 0, "No recipients provided");
        require(payouts.length <= 500, "Too many recipients (max 500)");
        _;
    }

    constructor(address _feeCollector) {
        require(_feeCollector != address(0), "Invalid fee collector");
        feeCollector = _feeCollector;
    }

    /**
     * @dev Execute mass payout in BNB
     * @param payouts Array of recipient addresses and amounts
     */
    function massPayoutBNB(PayoutData[] calldata payouts) 
        external 
        payable 
        nonReentrant 
        validPayoutData(payouts) 
    {
        uint256 totalAmount = 0;
        
        // Calculate total amount needed
        for (uint256 i = 0; i < payouts.length; i++) {
            require(payouts[i].recipient != address(0), "Invalid recipient address");
            require(payouts[i].amount > 0, "Invalid amount");
            totalAmount += payouts[i].amount;
        }
        
        // Check if sender has enough BNB (including service fee)
        require(msg.value >= totalAmount + serviceFee, "Insufficient BNB sent");
        
        // Collect service fee
        if (serviceFee > 0) {
            payable(feeCollector).transfer(serviceFee);
        }
        
        // Execute payouts
        uint256 successCount = 0;
        for (uint256 i = 0; i < payouts.length; i++) {
            (bool success, ) = payouts[i].recipient.call{value: payouts[i].amount}("");
            
            if (success) {
                successCount++;
                totalPayoutsReceived[payouts[i].recipient] += payouts[i].amount;
            }
            
            emit PayoutCompleted(
                payouts[i].recipient,
                address(0), // BNB
                payouts[i].amount,
                success
            );
        }
        
        // Update sender stats
        totalPayoutsSent[msg.sender] += totalAmount;
        
        // Refund excess BNB
        uint256 excess = msg.value - totalAmount - serviceFee;
        if (excess > 0) {
            payable(msg.sender).transfer(excess);
        }
        
        emit MassPayoutExecuted(
            msg.sender,
            address(0), // BNB
            totalAmount,
            payouts.length,
            block.timestamp
        );
    }

    /**
     * @dev Execute mass payout in ERC20 tokens
     * @param token ERC20 token contract address
     * @param payouts Array of recipient addresses and amounts
     */
    function massPayoutToken(address token, PayoutData[] calldata payouts) 
        external 
        payable 
        nonReentrant 
        validPayoutData(payouts) 
    {
        require(token != address(0), "Invalid token address");
        
        // Collect service fee in BNB
        require(msg.value >= serviceFee, "Insufficient BNB for service fee");
        if (serviceFee > 0) {
            payable(feeCollector).transfer(serviceFee);
        }
        
        IERC20 tokenContract = IERC20(token);
        uint256 totalAmount = 0;
        
        // Calculate total amount needed
        for (uint256 i = 0; i < payouts.length; i++) {
            require(payouts[i].recipient != address(0), "Invalid recipient address");
            require(payouts[i].amount > 0, "Invalid amount");
            totalAmount += payouts[i].amount;
        }
        
        // Check if sender has enough tokens
        require(
            tokenContract.balanceOf(msg.sender) >= totalAmount,
            "Insufficient token balance"
        );
        
        // Check if contract has enough allowance
        require(
            tokenContract.allowance(msg.sender, address(this)) >= totalAmount,
            "Insufficient token allowance"
        );
        
        // Execute payouts - using direct transfer without try-catch
        uint256 successCount = 0;
        for (uint256 i = 0; i < payouts.length; i++) {
            bool success = _safeTokenTransfer(
                tokenContract,
                msg.sender,
                payouts[i].recipient,
                payouts[i].amount
            );
            
            if (success) {
                successCount++;
                totalPayoutsReceived[payouts[i].recipient] += payouts[i].amount;
            }
            
            emit PayoutCompleted(
                payouts[i].recipient,
                token,
                payouts[i].amount,
                success
            );
        }
        
        // Update sender stats
        totalPayoutsSent[msg.sender] += totalAmount;
        
        // Refund excess BNB
        uint256 excess = msg.value - serviceFee;
        if (excess > 0) {
            payable(msg.sender).transfer(excess);
        }
        
        emit MassPayoutExecuted(
            msg.sender,
            token,
            totalAmount,
            payouts.length,
            block.timestamp
        );
    }

    /**
     * @dev Safe token transfer function that doesn't revert on failure
     * @param token Token contract
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount to transfer
     * @return success Whether the transfer was successful
     */
    function _safeTokenTransfer(
        IERC20 token,
        address from,
        address to,
        uint256 amount
    ) private returns (bool success) {
        // Use low-level call to avoid reverting the entire transaction
        bytes memory data = abi.encodeWithSelector(
            token.transferFrom.selector,
            from,
            to,
            amount
        );
        
        bytes memory returndata;
        (success, returndata) = address(token).call(data);
        
        // Check if the call was successful and returned the expected data
        success = success && (returndata.length == 0 || abi.decode(returndata, (bool)));
    }

    /**
     * @dev Get total amount needed for BNB payout (including service fee)
     * @param payouts Array of payout data
     * @return Total BNB amount needed
     */
    function calculateBNBTotal(PayoutData[] calldata payouts) 
        external 
        view 
        returns (uint256) 
    {
        uint256 total = serviceFee;
        for (uint256 i = 0; i < payouts.length; i++) {
            total += payouts[i].amount;
        }
        return total;
    }

    /**
     * @dev Get total token amount needed for token payout
     * @param payouts Array of payout data
     * @return Total token amount needed
     */
    function calculateTokenTotal(PayoutData[] calldata payouts) 
        external 
        pure 
        returns (uint256) 
    {
        uint256 total = 0;
        for (uint256 i = 0; i < payouts.length; i++) {
            total += payouts[i].amount;
        }
        return total;
    }

    /**
     * @dev Update service fee (only owner)
     * @param newFee New service fee in wei
     */
    function updateServiceFee(uint256 newFee) external onlyOwner {
        emit FeeUpdated(serviceFee, newFee);
        serviceFee = newFee;
    }

    /**
     * @dev Update fee collector address (only owner)
     * @param newFeeCollector New fee collector address
     */
    function updateFeeCollector(address newFeeCollector) external onlyOwner {
        require(newFeeCollector != address(0), "Invalid fee collector");
        feeCollector = newFeeCollector;
    }

    /**
     * @dev Emergency withdrawal function (only owner)
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    /**
     * @dev Get contract stats
     * @return contractBalance Current contract BNB balance
     * @return currentServiceFee Current service fee
     * @return currentFeeCollector Current fee collector address
     */
    function getContractStats() 
        external 
        view 
        returns (
            uint256 contractBalance,
            uint256 currentServiceFee,
            address currentFeeCollector
        ) 
    {
        return (address(this).balance, serviceFee, feeCollector);
    }

    // Receive function to accept BNB
    receive() external payable {}
}