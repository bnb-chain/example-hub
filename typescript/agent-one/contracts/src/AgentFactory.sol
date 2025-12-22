// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AgentOne.sol";

contract AgentFactory {
    event AgentDeployed(
        address indexed agent,
        address indexed owner,
        string name
    );

    address[] public agents;
    address public immutable ROUTER;

    constructor(address _router) {
        ROUTER = _router;
    }

    function createAgent(
        address mpcSigner,
        string memory name,
        string memory symbol
    ) external returns (address) {
        AgentOne newAgent = new AgentOne(mpcSigner, ROUTER);
        newAgent.initialize(name, symbol);
        agents.push(address(newAgent));

        emit AgentDeployed(address(newAgent), msg.sender, name);
        return address(newAgent);
    }

    function getAgents() external view returns (address[] memory) {
        return agents;
    }
}
