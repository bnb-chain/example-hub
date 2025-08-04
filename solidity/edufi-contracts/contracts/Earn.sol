 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
/*
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";

using SafeERC20 for IERC20;

contract Level3Earn is ERC2771Context, Ownable {
    struct Task {
        uint256 id;
        string title;
        string content; // Content of the task
        string section; // Section of the task
        address token; // Address of the token used for rewards
        uint256 points;
        uint256 timestamp; // Timestamp of the post creation
    }

    struct Campaign {
        uint256 id;
        string title;
        string description; // Description of the campaign
        address token; // Address of the token used for rewards
        uint256 totalPoints; // Total points available for the campaign
        uint256 startTime; // Start time of the campaign
        uint256 endTime; // End time of the campaign
    }

    uint256 public taskCounter; // Counter for task IDs
    uint256 public campaignCounter; // Counter for campaign IDs
    address public backend;
    uint256 public weeklyCounter;

    mapping(uint256 => Task) public tasks;
    mapping(address => uint256[]) public userPosts; // Maps user address to their post IDs
    mapping(address => mapping(address => uint256)) public userEarnings; // Maps user address to total earnings

    event TaskCreated(
        uint256 indexed postId,
        string title,
        address indexed creator
    );
    event EarningsClaimed(address user, uint256 amount);
    event TaskUpdated(uint256 indexed postId, string title, string content);
    event TaskDeleted(uint256 indexed postId);
    event EarningsDistributed(
        uint256 indexed postId,
        address indexed user,
        uint256 amount
    );

      constructor(ERC2771Forwarder forwarder)
        ERC2771Context(address(forwarder)) 
        Ownable(msg.sender)
    {
        weeklyCounter = 0;
    }
 

    struct Entry {
        address user;
        uint256[] weeklyScores; // Array of scores for each week
    }

    // Dynamic array of all entries, always sorted highest→lowest
    Entry[] private entries;
    Entry[] private snapshot;
    // Quick lookup of an address’s score and whether they exist
    mapping(address => uint256) private scores;
    mapping(address => bool) private exists;

    // Mapping from address → index in the `entries` array
    mapping(address => uint256) private indexOf;

    /// @notice Emitted whenever a user's score is set or updated.
    event ScoreUpdated(address indexed user, uint256 newScore);

    function createTask() external {
      Task storage task = tasks[taskCounter];
    }

    /// @notice Add or update the caller’s score and re-order the leaderboard.
    function updateScore(uint256 newScore) external {
        if (!exists[msg.sender]) {
            // New entrant
            entries.push(Entry(msg.sender, newScore));
            uint256 idx = entries.length - 1;
            exists[msg.sender] = true;
            indexOf[msg.sender] = idx;
            scores[msg.sender] = newScore;
            _bubbleUp(idx);
        } else {
            // Update existing
            uint256 idx = indexOf[_msgSender()];
            entries[idx].score[weeklyCounter] = newScore;
            scores[msg.sender] = newScore;
            // Fix position: could be higher or lower
            _bubbleUp(idx);
            _bubbleDown(idx);
        }
        emit ScoreUpdated(msg.sender, newScore);
    }

    function updateSnapshot() external {
        weeklyCounter += 1;
        for(uint256 i = 0; i < 8; i++) {
            snapshot.push(entries[i]);
        }
    }

    function getSnapshot() external view returns (Entry[] memory){
        return snapshot;
    }

    /// @dev Swap upward until this entry is no longer greater than its predecessor.
    function _bubbleUp(uint256 idx) internal {
        while (idx > 0 && entries[idx].score[weeklyCounter] > entries[idx - 1].score[weeklyCounter]) {
            _swap(idx, idx - 1);
            idx--;
        }
    }

    /// @dev Swap downward until this entry is no longer less than its successor.
    function _bubbleDown(uint256 idx) internal {
        uint256 len = entries.length;
        while (idx + 1 < len && entries[idx].score[weeklyCounter] < entries[idx + 1].score[weeklyCounter]) {
            _swap(idx, idx + 1);
            idx++;
        }
    }

    /// @dev Swap two entries in the array and update their stored indices.
    function _swap(uint256 i, uint256 j) internal {
        Entry memory temp = entries[i];
        entries[i] = entries[j];
        entries[j] = temp;
        indexOf[entries[i].user] = i;
        indexOf[entries[j].user] = j;
    }

    /// @notice Get the top `n` entries (or fewer if there aren’t that many).
    function top(uint256 n) external view returns (Entry[] memory) {
        uint256 len = entries.length;
        if (n > len) {
            n = len;
        }
        Entry[] memory list = new Entry[](n);
        for (uint256 i = 0; i < n; i++) {
            list[i] = entries[i];
        }
        return list;
    }

    /// @notice Look up a specific user’s score.
    function getScore(address user) external view returns (uint256) {
        return scores[user];
    }

    /// @notice Get a user’s current rank (1‐based). Reverts if the user has no entry.
    function getRank(address user) external view returns (uint256) {
        require(exists[user], "No entry for user");
        // index 0 → rank 1
        return indexOf[user] + 1;
    }

    /// @notice How many entries are currently on the leaderboard.
    function totalEntries() external view returns (uint256) {
        return entries.length;
    }

    /// @inheritdoc ERC2771Context
    function _msgSender()
        internal
        view
        override(ERC2771Context, Context)
        returns (address)
    {
        return ERC2771Context._msgSender();
    }

    /// @inheritdoc ERC2771Context
    function _msgData()
        internal
        view
        override(ERC2771Context, Context)
        returns (bytes calldata)
    {
        return ERC2771Context._msgData();
    }

    /// @inheritdoc ERC2771Context
    function _contextSuffixLength()
        internal
        view
        override(ERC2771Context, Context)
        returns (uint256)
    {
        return ERC2771Context._contextSuffixLength();
    }

    function payOut() external {
        uint256 length = snapshot.length;
        for(uint256 i = 0; i < length; i++){
            payable(snapshot[i].a);
        }
    }

    function nativeBalance() external view returns(uint256){
        return address(this).balance;
    }

    function tokenBalance(address token) external view returns(uint256){
       return IERC20(token).balanceOf(address(this));
    }
}
 */