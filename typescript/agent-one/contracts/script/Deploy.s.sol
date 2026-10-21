// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/AgentFactory.sol";
import "../src/AgentOne.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        // Address of the "AI Worker" (Node.js script)
        address mpcSigner = vm.envAddress("MPC_SIGNER");

        vm.startBroadcast(deployerPrivateKey);

        // PancakeSwap V3 Router on BSC Testnet
        address router = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
        AgentFactory factory = new AgentFactory(router);
        console.log("Factory deployed at:", address(factory));

        // Create a sample agent for the demo
        address agentAddr = factory.createAgent(
            mpcSigner,
            "Alpha Agent",
            "ALPHA"
        );
        console.log("Sample Agent deployed at:", agentAddr);

        // Optional: Hire/Fund the agent initially if needed
        // AgentOne(payable(agentAddr)).hire{value: 0.001 ether}();

        vm.stopBroadcast();
    }
}
