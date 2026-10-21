// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "./ERC2771Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";

/**
 * @title GaslessToken
 * @dev Example ERC20 token with ERC-2771 support for gasless transfers.
 *
 * This demonstrates how any contract can support meta-transactions by
 * inheriting from ERC2771Context and using _msgSender() instead of msg.sender.
 */
contract GaslessToken is ERC2771Context, Ownable {
    string public name = "Gasless Token";
    string public symbol = "GAS";
    uint8 public decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );

    constructor(
        address trustedForwarder
    ) ERC2771Context(trustedForwarder) Ownable(msg.sender) {
        // Mint initial supply to deployer
        _mint(msg.sender, 1_000_000 * 10 ** 18);
    }

    /**
     * @dev Transfer tokens. Uses _msgSender() to support gasless transfers.
     */
    function transfer(address to, uint256 amount) public returns (bool) {
        address sender = _msgSender(); // Gets real sender even if called via forwarder
        require(balanceOf[sender] >= amount, "Insufficient balance");

        balanceOf[sender] -= amount;
        balanceOf[to] += amount;

        emit Transfer(sender, to, amount);
        return true;
    }

    /**
     * @dev Approve spender to transfer tokens on behalf of caller
     */
    function approve(address spender, uint256 amount) public returns (bool) {
        address owner = _msgSender();
        allowance[owner][spender] = amount;

        emit Approval(owner, spender, amount);
        return true;
    }

    /**
     * @dev Transfer tokens from one address to another using allowance
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public returns (bool) {
        address spender = _msgSender();

        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][spender] >= amount, "Insufficient allowance");

        allowance[from][spender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;

        emit Transfer(from, to, amount);
        return true;
    }

    /**
     * @dev Internal mint function
     */
    function _mint(address to, uint256 amount) internal {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    // Overrides to resolve inheritance conflict between ERC2771Context and Ownable (Context)
    function _msgSender()
        internal
        view
        override(ERC2771Context, Context)
        returns (address)
    {
        return ERC2771Context._msgSender();
    }

    function _msgData()
        internal
        view
        override(ERC2771Context, Context)
        returns (bytes calldata)
    {
        return ERC2771Context._msgData();
    }
}
