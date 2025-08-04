//SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

import "./ExponentialPremiumPriceOracle.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract TokenPriceOracle is ExponentialPremiumPriceOracle {
    AggregatorV3Interface internal cakeOracle;
    AggregatorV3Interface internal usd1Oracle;
    using StringUtils for *;
    constructor(
        AggregatorV3Interface _usdOracle,
        AggregatorV3Interface _cakeOracle,
        AggregatorV3Interface _usd1Oracle,
        uint256[] memory _rentPrices,
        uint256 _startPremium,
        uint256 totalDays
    )ExponentialPremiumPriceOracle(_usdOracle, _rentPrices, _startPremium, totalDays) {
       usd1Oracle = _usd1Oracle;
       cakeOracle = _cakeOracle;
    }


    function priceToken(
        string calldata name,
        uint256 expires,
        uint256 duration,
        string memory token,
        bool lifetime
    ) external view returns (IPriceOracle.Price memory) {
        uint256 len = name.strlen();
        uint256 basePrice;

        if (len >= 5 && lifetime) {
            basePrice = price5Letter * 31536000 * 4;
        } else if (len == 4 && lifetime) {
            basePrice = price4Letter * 31536000 * 4;
        } else if (len == 3 && lifetime) {
            basePrice = price3Letter * 31536000 * 6;
        } else if (len == 2 && lifetime) {
            basePrice = price2Letter * 31536000 * 10;
        } else if (len == 1 && lifetime) {
            basePrice = price1Letter * 31536000;
        } else if (len >= 5 && lifetime == false) { 
            basePrice = price5Letter * duration;
        } else if (len == 4 && lifetime == false) {
            basePrice = price4Letter * duration;
        } else if (len == 3 && lifetime == false) {
            basePrice = price3Letter * duration;
        } else if (len == 2 && lifetime == false) {
            basePrice = price2Letter * duration;
        } else {
            basePrice = price1Letter * duration;
        }
        if(keccak256(bytes(token)) == keccak256(bytes("cake"))){
                 return
            IPriceOracle.Price({
                base: attoUSDToCake(basePrice),
                premium: attoUSDToCake(_premium(name, expires, duration))
            });
        } else {
             return
            IPriceOracle.Price({
                base: attoUSDToUSD1(basePrice),
                premium: attoUSDToCake(_premium(name, expires, duration))
            });
        }
       
    }
     function attoUSDToCake(uint256 amount) internal view returns (uint256) {
        (, int256 cakePrice,,,) = cakeOracle.latestRoundData();
        return (amount * 1e8) / uint256(cakePrice);
    }
    function attoUSDToUSD1(uint256 amount) internal view returns (uint256) {
        (, int256 usd1Price,,,) = usd1Oracle.latestRoundData();
        return (amount * 1e8) / uint256(usd1Price);
    }
     function attoCakeToUSD(uint256 amount) internal view returns (uint256) {
        (, int256 cakePrice,,,) = cakeOracle.latestRoundData();
        return (amount * uint256(cakePrice)) / 1e8;
    }
    function attoUSD1ToUSD(uint256 amount) internal view returns (uint256) {
        (, int256 usd1Price,,,) = usd1Oracle.latestRoundData();
        return (amount * uint256(usd1Price)) / 1e8;
    }

}
