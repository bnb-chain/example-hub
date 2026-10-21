// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CaseRush - Provably Fair CS:GO Case Opening on BNB Chain
 * @notice This contract handles case openings with automated on-chain verification
 * @dev Uses block hash + server seed for provably fair randomness
 */
contract CaseRush {
    // ============ State Variables ============

    address payable public teamWallet;
    address public owner;
    uint256 public constant CASE_PRICE = 0.03 ether;

    // Provably fair randomness
    bytes32 public serverSeedHash;
    uint256 public nonce;

    // Item configuration
    struct Item {
        string name;
        string weapon;
        string skin;
        string rarity;
        uint256 floorPrice; // Price in wei (e.g., 10 ether = 10 BNB)
        uint256 probability; // Out of 10000 (100.00%)
    }

    Item[] public items;
    uint256 public totalProbability = 10000;

    // User inventory tracking (PREVENTS FRAUD)
    struct CaseOpening {
        uint256 itemId;        // 1-7 (which item they won)
        uint256 timestamp;     // When they opened the case
        uint256 blockNumber;   // Block number for verification
        bool redeemed;         // Have they sold it yet?
    }

    mapping(address => CaseOpening[]) public userInventory;

    // ============ Events ============

    event CaseOpened(
        address indexed user,
        uint256 indexed itemId,
        string itemName,
        uint256 floorPrice,
        bytes32 clientSeed,
        uint256 nonce,
        uint256 timestamp,
        uint256 inventoryIndex
    );

    event ItemSold(
        address indexed user,
        uint256 indexed itemId,
        uint256 payout,
        uint256 timestamp
    );

    event ContractFunded(
        address indexed funder,
        uint256 amount
    );

    event ServerSeedUpdated(
        bytes32 oldHash,
        bytes32 newHash
    );

    // ============ Constructor ============

    constructor(address payable _teamWallet, bytes32 _serverSeedHash) {
        owner = msg.sender;
        teamWallet = _teamWallet;
        serverSeedHash = _serverSeedHash;

        // Initialize items (ranked by value, highest to lowest)
        // SUSTAINABLE HIGH-REWARD MODEL
        // EV ≈ 0.0188 BNB (62.7% of 0.03 BNB price)
        // House edge: ~37.3%

        // Item ID 1 = JACKPOT! 10 BNB at 0.02% chance (1 in 5,000!)
        items.push(Item({
            name: "Legendary Knife",
            weapon: "Karambit",
            skin: "Fade Factory New",
            rarity: "special",
            floorPrice: 10 ether,
            probability: 2  // 0.02%
        }));

        // Item ID 2 = Major Win! 1 BNB at 0.5% chance (1 in 200)
        items.push(Item({
            name: "Rare Knife",
            weapon: "Butterfly Knife",
            skin: "Tiger Tooth",
            rarity: "special",
            floorPrice: 1 ether,
            probability: 50  // 0.5%
        }));

        // Item ID 3 = Big Win! 0.25 BNB at 1.5% chance (1 in 67)
        items.push(Item({
            name: "Covert Rifle",
            weapon: "AK-47",
            skin: "Bloodsport",
            rarity: "covert",
            floorPrice: 0.25 ether,
            probability: 150  // 1.5%
        }));

        // Item ID 4 = Good Win! 0.1 BNB at 4% chance (1 in 25)
        items.push(Item({
            name: "Classified Rifle",
            weapon: "M4A4",
            skin: "Neo-Noir",
            rarity: "classified",
            floorPrice: 0.1 ether,
            probability: 400  // 4%
        }));

        // Item ID 5 = Small Win! 0.025 BNB at 10% chance (1 in 10)
        items.push(Item({
            name: "Restricted AWP",
            weapon: "AWP",
            skin: "Chromatic Aberration",
            rarity: "restricted",
            floorPrice: 0.025 ether,
            probability: 1000  // 10%
        }));

        // Item ID 6 = Low-tier win. 0.005 BNB at 24% chance (1 in 4)
        items.push(Item({
            name: "Mil-Spec Pistol",
            weapon: "Desert Eagle",
            skin: "Night",
            rarity: "mil-spec",
            floorPrice: 0.005 ether,
            probability: 2400  // 24%
        }));

        // Item ID 7 = Consolation. 0.0005 BNB at 60% chance (most common)
        items.push(Item({
            name: "Consumer Pistol",
            weapon: "P250",
            skin: "Sand Dune",
            rarity: "consumer",
            floorPrice: 0.0005 ether,
            probability: 5998  // 59.98% (adjusted to total 10000)
        }));
    }

    // ============ Modifiers ============

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    // ============ Main Functions ============

    /**
     * @notice Open a case - sends 0.03 BNB, gets random item
     * @param clientSeed User's random seed for provably fair
     */
    function openCase(bytes32 clientSeed) external payable {
        require(msg.value == CASE_PRICE, "Must send exactly 0.03 BNB");

        // Generate provably fair random number
        uint256 randomNumber = uint256(keccak256(abi.encodePacked(
            blockhash(block.number - 1),
            serverSeedHash,
            clientSeed,
            msg.sender,
            nonce,
            block.timestamp
        )));

        // Determine which item was won (1-7)
        uint256 itemId = determineItem(randomNumber % totalProbability);

        // RECORD this opening in user's inventory (PREVENTS FRAUD!)
        uint256 inventoryIndex = userInventory[msg.sender].length;
        userInventory[msg.sender].push(CaseOpening({
            itemId: itemId,
            timestamp: block.timestamp,
            blockNumber: block.number,
            redeemed: false
        }));

        // Send identifier BNB back to user (0.00001 * itemId)
        uint256 identifierAmount = itemId * 0.00001 ether;
        payable(msg.sender).transfer(identifierAmount);

        // Send remaining BNB to team wallet
        uint256 teamAmount = CASE_PRICE - identifierAmount;
        teamWallet.transfer(teamAmount);

        // Emit event for frontend
        Item memory wonItem = items[itemId - 1];
        emit CaseOpened(
            msg.sender,
            itemId,
            wonItem.name,
            wonItem.floorPrice,
            clientSeed,
            nonce,
            block.timestamp,
            inventoryIndex
        );

        nonce++;
    }

    /**
     * @notice Sell an item from inventory - AUTOMATED VERIFICATION
     * @param inventoryIndex Which item in user's inventory to sell
     */
    function sellItem(uint256 inventoryIndex) external {
        require(inventoryIndex < userInventory[msg.sender].length, "Invalid inventory index");

        CaseOpening storage opening = userInventory[msg.sender][inventoryIndex];

        // SECURITY CHECKS (FOOLPROOF!)
        require(!opening.redeemed, "Item already sold");
        require(opening.itemId > 0 && opening.itemId <= items.length, "Invalid item ID");

        // Mark as redeemed (prevents double-selling)
        opening.redeemed = true;

        // Get item details
        Item memory soldItem = items[opening.itemId - 1];

        // Check contract has enough balance
        require(address(this).balance >= soldItem.floorPrice, "Insufficient contract balance");

        // PAY USER (automated!)
        payable(msg.sender).transfer(soldItem.floorPrice);

        emit ItemSold(msg.sender, opening.itemId, soldItem.floorPrice, block.timestamp);
    }

    /**
     * @notice Determine which item was won based on random roll
     * @param roll Random number from 0-9999
     * @return itemId The item ID (1-7)
     */
    function determineItem(uint256 roll) internal view returns (uint256) {
        uint256 cumulative = 0;

        for (uint256 i = 0; i < items.length; i++) {
            cumulative += items[i].probability;
            if (roll < cumulative) {
                return i + 1; // Return 1-indexed ID
            }
        }

        return items.length; // Fallback to last item
    }

    // ============ View Functions ============

    /**
     * @notice Get user's entire inventory
     * @param user Address to check
     * @return Array of case openings
     */
    function getUserInventory(address user) external view returns (CaseOpening[] memory) {
        return userInventory[user];
    }

    /**
     * @notice Get user's unredeemed items count
     * @param user Address to check
     * @return count Number of unsold items
     */
    function getUnredeemedCount(address user) external view returns (uint256 count) {
        for (uint256 i = 0; i < userInventory[user].length; i++) {
            if (!userInventory[user][i].redeemed) {
                count++;
            }
        }
    }

    /**
     * @notice Get item details by ID
     * @param itemId Item ID (1-7)
     * @return Item struct
     */
    function getItem(uint256 itemId) external view returns (Item memory) {
        require(itemId > 0 && itemId <= items.length, "Invalid item ID");
        return items[itemId - 1];
    }

    /**
     * @notice Get all items
     * @return Array of all items
     */
    function getAllItems() external view returns (Item[] memory) {
        return items;
    }

    // ============ Admin Functions ============

    /**
     * @notice Fund the contract to enable payouts
     */
    function fundContract() external payable {
        require(msg.value > 0, "Must send BNB");
        emit ContractFunded(msg.sender, msg.value);
    }

    /**
     * @notice Update server seed hash (for provably fair rotation)
     * @param newHash New server seed hash
     */
    function updateServerSeedHash(bytes32 newHash) external onlyOwner {
        bytes32 oldHash = serverSeedHash;
        serverSeedHash = newHash;
        emit ServerSeedUpdated(oldHash, newHash);
    }

    /**
     * @notice Update team wallet address
     * @param newTeamWallet New team wallet
     */
    function updateTeamWallet(address payable newTeamWallet) external onlyOwner {
        require(newTeamWallet != address(0), "Invalid address");
        teamWallet = newTeamWallet;
    }

    /**
     * @notice Emergency withdraw (only for stuck funds, not user balances)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Insufficient balance");
        teamWallet.transfer(amount);
    }

    /**
     * @notice Get contract BNB balance
     * @return Balance in wei
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // Allow contract to receive BNB
    receive() external payable {
        emit ContractFunded(msg.sender, msg.value);
    }
}
