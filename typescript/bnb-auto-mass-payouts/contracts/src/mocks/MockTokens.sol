// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title MockBaseToken
 * @notice Lightweight ERC20 implementation with faucet minting, used purely for testing/demo.
 */
contract MockBaseToken {
    string public name;
    string public symbol;
    uint8 private immutable _decimals;
    uint256 public totalSupply;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_
    ) {
        name = name_;
        symbol = symbol_;
        _decimals = decimals_;
    }

    function decimals() public view virtual returns (uint8) {
        return _decimals;
    }

    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    function allowance(address owner, address spender) public view returns (uint256) {
        return _allowances[owner][spender];
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        uint256 currentAllowance = _allowances[from][msg.sender];
        require(currentAllowance >= amount, "MockToken: insufficient allowance");
        unchecked {
            _approve(from, msg.sender, currentAllowance - amount);
        }
        _transfer(from, to, amount);
        return true;
    }

    /**
     * @notice Open faucet anyone can call for demo purposes.
     */
    function faucet(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @notice Convenience faucet that mints exactly 1,000 tokens (adjusted for decimals) to the caller.
     */
    function demoFaucet() external returns (uint256 mintedAmount) {
        mintedAmount = 1_000 * (10 ** uint256(_decimals));
        _mint(msg.sender, mintedAmount);
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(to != address(0), "MockToken: transfer to zero");
        uint256 fromBalance = _balances[from];
        require(fromBalance >= amount, "MockToken: insufficient balance");
        unchecked {
            _balances[from] = fromBalance - amount;
        }
        _balances[to] += amount;
        emit Transfer(from, to, amount);
    }

    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "MockToken: approve from zero");
        require(spender != address(0), "MockToken: approve to zero");
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _mint(address to, uint256 amount) internal {
        require(to != address(0), "MockToken: mint to zero");
        totalSupply += amount;
        _balances[to] += amount;
        emit Transfer(address(0), to, amount);
    }
}

contract MockUSDT is MockBaseToken {
    constructor() MockBaseToken("Mock USDT", "USDT", 6) {}
}
