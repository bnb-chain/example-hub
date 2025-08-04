//SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

import "./IPriceOracle.sol";
import "../utils/StringUtils.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";



// StablePriceOracle sets a price in USD, based on an oracle.
contract StablePriceOracle is IPriceOracle {
    using StringUtils for *;
    AggregatorV3Interface internal usdOracle;

    // Rent in base price units by length
    uint256 public immutable price1Letter;
    uint256 public immutable price2Letter;
    uint256 public immutable price3Letter;
    uint256 public immutable price4Letter;
    uint256 public immutable price5Letter;

    // Oracle address

    event RentPriceChanged(uint256[] prices);

    constructor(AggregatorV3Interface _usdOracle, uint256[] memory _rentPrices) {
        usdOracle = _usdOracle;
        price1Letter = _rentPrices[0];
        price2Letter = _rentPrices[1];
        price3Letter = _rentPrices[2];
        price4Letter = _rentPrices[3];
        price5Letter = _rentPrices[4];
    }

    function price(
        string calldata name,
        uint256 expires,
        uint256 duration,
        bool lifetime
    ) external view override returns (IPriceOracle.Price memory) {
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
      return
            IPriceOracle.Price({
                base: attoUSDToWei(basePrice),
                premium: attoUSDToWei(_premium(name, expires, duration))
            });
    }

    /**
     * @dev Returns the pricing premium in wei.
     */
    function premium(
        string calldata name,
        uint256 expires,
        uint256 duration
    ) external view returns (uint256) {
        return attoUSDToWei(_premium(name, expires, duration));
    }

    /**
     * @dev Returns the pricing premium in internal base units.
     */
    function _premium(
        string memory name,
        uint256 expires,
        uint256 duration
    ) internal view virtual returns (uint256) {
        return 0;
    }

     function attoUSDToWei(uint256 amount) internal view returns (uint256) {
        (, int256 ethPrice,,,) = usdOracle.latestRoundData();
        return (amount * 1e8) / uint256(ethPrice);
    }

    function weiToAttoUSD(uint256 amount) internal view returns (uint256) {
        (, int256 ethPrice,,,) = usdOracle.latestRoundData();
        return (amount * uint256(ethPrice)) / 1e8;
    }

    function supportsInterface(
        bytes4 interfaceID
    ) public view virtual returns (bool) {
        return
            interfaceID == type(IERC165).interfaceId ||
            interfaceID == type(IPriceOracle).interfaceId;
    }
}
