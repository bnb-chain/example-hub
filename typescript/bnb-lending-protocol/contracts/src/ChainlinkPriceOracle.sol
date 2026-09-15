// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./interfaces/AggregatorV3Interface.sol";

contract ChainlinkPriceOracle {
    mapping(address => address) public priceFeeds; // token => Chainlink feed address
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    function setPriceFeed(address token, address feed) external onlyOwner {
        priceFeeds[token] = feed;
    }

    function getPrice(address token) external view returns (uint256) {
        address feed = priceFeeds[token];
        require(feed != address(0), "Price feed not set");

        AggregatorV3Interface priceFeed = AggregatorV3Interface(feed);
        (, int256 price, , , ) = priceFeed.latestRoundData();

        require(price > 0, "Invalid price");

        // Chainlink prices have varying decimals, normalize to 18 decimals
        uint8 decimals = priceFeed.decimals();

        if (decimals < 18) {
            return uint256(price) * (10 ** (18 - decimals));
        } else if (decimals > 18) {
            return uint256(price) / (10 ** (decimals - 18));
        } else {
            return uint256(price);
        }
    }
}
