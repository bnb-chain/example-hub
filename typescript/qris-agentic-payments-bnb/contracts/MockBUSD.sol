// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockBUSD
/// @notice Minimal BUSD-like ERC20 (18 decimals, matching the real BNB Chain
///         BUSD at 0xe9e7CEA3DedcA5984780Bafc599bE2b0Fa6fC12) used by the demo
///         and tests so no faucet is required. Replace with the real BSC BUSD
///         address in production. Per BNB Chain ecosystem rules, settlement is
///         done in a native BSC stablecoin, not a third-party token.
contract MockBUSD is ERC20 {
    constructor(uint256 initialSupply) ERC20("Mock BUSD", "BUSD") {
        _mint(msg.sender, initialSupply);
    }

    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
