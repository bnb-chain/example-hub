// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TokenFactory {
    event TokenDeployed(address indexed owner, address indexed token, string name, string symbol);

    function deployToken(string memory name, string memory symbol, address initialRecipient) external returns (address) {
        ERC20Token newToken = new ERC20Token(name, symbol, initialRecipient);
        emit TokenDeployed(initialRecipient, address(newToken), name, symbol);
        return address(newToken);
    }
}

contract ERC20Token is ERC20 {
    constructor(string memory name, string memory symbol, address to) ERC20(name, symbol) {
        _mint(to, 1_000_000 * 10 ** decimals());
    }
}
