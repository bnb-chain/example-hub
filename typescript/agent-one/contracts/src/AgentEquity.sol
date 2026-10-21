// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Minimal ERC20 Implementation
contract AgentEquity {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 amount
    );

    address public immutable agent;

    modifier onlyAgent() {
        require(msg.sender == agent, "Only Agent");
        _;
    }

    constructor(address _agent, string memory _name, string memory _symbol) {
        agent = _agent;
        name = _name;
        symbol = _symbol;
    }

    function mint(address to, uint256 amount) external onlyAgent {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    function burn(address from, uint256 amount) external onlyAgent {
        balanceOf[from] -= amount;
        totalSupply -= amount;
        emit Transfer(from, address(0), amount);
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        return transferFrom(msg.sender, to, amount);
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public returns (bool) {
        if (
            allowance[from][msg.sender] != type(uint256).max &&
            from != msg.sender
        ) {
            allowance[from][msg.sender] -= amount;
        }
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}
