//SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

import "./IPriceOracle.sol";

interface IETHRegistrarController {

    struct TokenParams{
        string token;
        address tokenAddress;
    }
    struct RegisterParams {
        string name;
        address owner;
        uint256 duration;
        bytes32 secret;
        address resolver;
        bytes[] data;
        bool reverseRecord;
        uint16 ownerControlledFuses;
    }
    function rentPrice(
        string memory,
        uint256,
        bool
    ) external view returns (IPriceOracle.Price memory);

    function rentPriceToken(
        string memory name,
        uint256 duration,
        string memory token,
        bool lifetime
    ) external view returns (IPriceOracle.Price memory price);

    function available(string memory) external returns (bool);

    function makeCommitment(
        string memory,
        address,
        uint256,
        bytes32,
        address,
        bytes[] calldata,
        bool,
        uint16,
        bool
    ) external pure returns (bytes32);

    function commit(bytes32) external;

    function register(
        string memory,
        address,
        uint256,
        bytes32,
        address,
        bytes[] calldata,
        bool,
        uint16,
        bool,
        string memory
    ) external payable;

    function registerWithToken(
        RegisterParams memory registerParams,
        TokenParams memory tokenParams,
        bool lifetime,
        string memory referree
    ) external;

    function renew(string calldata, uint256, bool) external payable;

    function renewTokens(
        string calldata name,
        uint256 duration,
        string memory token,
        address tokenAddress,
        bool lifetime
    ) external;
}
