// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./interfaces/IERC20.sol";
import "./ChainlinkPriceOracle.sol";

contract LendingPool {
    ChainlinkPriceOracle public oracle;

    // User -> Token -> Amount
    mapping(address => mapping(address => uint256)) public deposits;
    mapping(address => mapping(address => uint256)) public borrowings;

    // Collateral Factor: 75% (0.75 * 1e18)
    uint256 public constant COLLATERAL_FACTOR = 75e16;

    address public owner;

    // Security: Reentrancy guard
    bool private _locked;

    // Security: Pause mechanism
    bool public paused;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier nonReentrant() {
        require(!_locked, "ReentrancyGuard: reentrant call");
        _locked = true;
        _;
        _locked = false;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    event Deposit(address indexed user, address indexed token, uint256 amount);
    event Withdraw(address indexed user, address indexed token, uint256 amount);
    event Borrow(address indexed user, address indexed token, uint256 amount);
    event Repay(address indexed user, address indexed token, uint256 amount);
    event Paused(address account);
    event Unpaused(address account);

    constructor(address _oracle) {
        oracle = ChainlinkPriceOracle(_oracle);
        owner = msg.sender;
    }

    // ============ Admin Functions ============

    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }

    // ============ Core Functions ============

    function deposit(
        address token,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        require(isSupported[token], "Token not supported");
        require(amount > 0, "Amount must be greater than 0");

        _safeTransferFrom(token, msg.sender, address(this), amount);
        deposits[msg.sender][token] += amount;
        emit Deposit(msg.sender, token, amount);
    }

    function withdraw(
        address token,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        require(deposits[msg.sender][token] >= amount, "Insufficient balance");
        require(amount > 0, "Amount must be greater than 0");

        // Optimistically update state before external call
        deposits[msg.sender][token] -= amount;

        require(_checkHealth(msg.sender), "Health factor too low");

        _safeTransfer(token, msg.sender, amount);
        emit Withdraw(msg.sender, token, amount);
    }

    function borrow(
        address token,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        require(isSupported[token], "Token not supported");
        require(amount > 0, "Amount must be greater than 0");

        // Check pool has sufficient liquidity
        require(
            IERC20(token).balanceOf(address(this)) >= amount,
            "Insufficient pool liquidity"
        );

        // Update borrow balance then check health
        borrowings[msg.sender][token] += amount;
        require(_checkHealth(msg.sender), "Insufficient collateral");

        _safeTransfer(token, msg.sender, amount);
        emit Borrow(msg.sender, token, amount);
    }
    // Liquidation Bonus: 1% (101% of value)
    uint256 public constant LIQUIDATION_BONUS = 101;
    event Liquidate(
        address indexed liquidator,
        address indexed borrower,
        address indexed repaymentToken,
        address collateralToken,
        uint256 repaymentAmount,
        uint256 seizedCollateral
    );

    function repay(
        address token,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");

        _safeTransferFrom(token, msg.sender, address(this), amount);

        if (borrowings[msg.sender][token] >= amount) {
            borrowings[msg.sender][token] -= amount;
        } else {
            borrowings[msg.sender][token] = 0;
        }
        emit Repay(msg.sender, token, amount);
    }

    function liquidate(
        address borrower,
        address repaymentToken,
        address collateralToken,
        uint256 repaymentAmount
    ) external nonReentrant whenNotPaused {
        require(repaymentAmount > 0, "Amount must be greater than 0");
        require(!_checkHealth(borrower), "Borrower is healthy");

        // Liquidator repays debt
        _safeTransferFrom(
            repaymentToken,
            msg.sender,
            address(this),
            repaymentAmount
        );

        // Update borrower's debt
        require(
            borrowings[borrower][repaymentToken] >= repaymentAmount,
            "Repayment exceeds debt"
        );
        borrowings[borrower][repaymentToken] -= repaymentAmount;

        // Calculate collateral to seize
        uint256 repaymentAmountUSD = (repaymentAmount *
            oracle.getPrice(repaymentToken)) / 1e18;
        uint256 collateralPriceUSD = oracle.getPrice(collateralToken);

        // (repaymentUSD * 101) / 100 / collateralPrice
        uint256 seizeAmount = (repaymentAmountUSD * LIQUIDATION_BONUS * 1e18) /
            (100 * collateralPriceUSD);

        require(
            deposits[borrower][collateralToken] >= seizeAmount,
            "Insufficient collateral to seize"
        );

        // Seize collateral
        deposits[borrower][collateralToken] -= seizeAmount;
        _safeTransfer(collateralToken, msg.sender, seizeAmount);

        emit Liquidate(
            msg.sender,
            borrower,
            repaymentToken,
            collateralToken,
            repaymentAmount,
            seizeAmount
        );
    }

    // ============ Internal Functions ============

    function _checkHealth(address user) internal view returns (bool) {
        (uint256 totalCollateral, uint256 totalBorrowed) = getAccountInfo(user);
        if (totalBorrowed == 0) return true;
        return totalBorrowed <= (totalCollateral * COLLATERAL_FACTOR) / 1e18;
    }

    /// @dev Safe transfer that handles non-standard ERC20 tokens
    function _safeTransfer(address token, address to, uint256 amount) private {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transfer.selector, to, amount)
        );
        require(
            success && (data.length == 0 || abi.decode(data, (bool))),
            "Transfer failed"
        );
    }

    /// @dev Safe transferFrom that handles non-standard ERC20 tokens
    function _safeTransferFrom(
        address token,
        address from,
        address to,
        uint256 amount
    ) private {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(
                IERC20.transferFrom.selector,
                from,
                to,
                amount
            )
        );
        require(
            success && (data.length == 0 || abi.decode(data, (bool))),
            "TransferFrom failed"
        );
    }

    // ============ View Functions ============

    address[] public supportedTokens;
    mapping(address => bool) public isSupported;

    function addSupportedToken(address token) external onlyOwner {
        if (!isSupported[token]) {
            supportedTokens.push(token);
            isSupported[token] = true;
        }
    }

    function getAccountInfo(
        address user
    )
        public
        view
        returns (uint256 totalCollateralValue, uint256 totalBorrowedValue)
    {
        for (uint i = 0; i < supportedTokens.length; i++) {
            address token = supportedTokens[i];
            uint256 price = oracle.getPrice(token);

            if (price > 0) {
                totalCollateralValue += (deposits[user][token] * price) / 1e18;
                totalBorrowedValue += (borrowings[user][token] * price) / 1e18;
            }
        }
    }

    function getSupportedTokensCount() external view returns (uint256) {
        return supportedTokens.length;
    }
}
