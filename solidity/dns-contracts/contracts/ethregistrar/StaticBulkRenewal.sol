//SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

import "./ETHRegistrarController.sol";
import "./IBulkRenewal.sol";
import "./IPriceOracle.sol";

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

contract StaticBulkRenewal is IBulkRenewal {
    ETHRegistrarController controller;

    constructor(ETHRegistrarController _controller) {
        controller = _controller;
    }

    function rentPrice(
        string[] calldata names,
        uint256 duration,
        bool lifetime
    ) external view override returns (uint256 total) {
        uint256 length = names.length;
        for (uint256 i = 0; i < length; ) {
            IPriceOracle.Price memory price = controller.rentPrice(
                names[i],
                duration,
                lifetime
            );
            unchecked {
                ++i;
                total += (price.base + price.premium);
            }
        }
    }
     function rentPriceToken(
        string[] calldata names,
        uint256 duration,
        string memory token,
        bool lifetime
    ) external view returns (uint256 total) {
        uint256 length = names.length;
        for (uint256 i = 0; i < length; ) {
            IPriceOracle.Price memory price = controller.rentPriceToken(
                names[i],
                duration,
                token,
                lifetime
            );
            unchecked {
                ++i;
                total += (price.base + price.premium);
            }
        }
    }

    function renewAll(
        string[] calldata names,
        uint256 duration,
        bool lifetime
    ) external payable override {
        uint256 length = names.length;
        uint256 total;
        for (uint256 i = 0; i < length; ) {
            IPriceOracle.Price memory price = controller.rentPrice(
                names[i],
                duration,
                lifetime
            );
            uint256 totalPrice = price.base + price.premium;
            controller.renew{value: totalPrice}(names[i], duration, lifetime);
            unchecked {
                ++i;
                total += totalPrice;
            }
        }
        // Send any excess funds back
        payable(msg.sender).transfer(address(this).balance);
    }
    function renewAllWithToken(
        string[] calldata names,
        uint256 duration,
        string memory token,
        address tokenAddress,
        bool lifetime
    ) external payable  {
        uint256 length = names.length;
        uint256 total;
        for (uint256 i = 0; i < length; ) {
            IPriceOracle.Price memory price = controller.rentPriceToken(
                names[i],
                duration,
                token,
                lifetime
            );
            uint256 totalPrice = price.base + price.premium;
            controller.renewTokens(names[i], duration, token, tokenAddress, lifetime);
            unchecked {
                ++i;
                total += totalPrice;
            }
        }
    }

    function supportsInterface(
        bytes4 interfaceID
    ) external pure returns (bool) {
        return
            interfaceID == type(IERC165).interfaceId ||
            interfaceID == type(IBulkRenewal).interfaceId;
    }
}
