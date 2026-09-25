// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./libraries/SwapMath.sol";
import "./libraries/FlashAccounting.sol";

contract SingletonSwap {
    using SwapMath for uint256;

    uint256 public constant MINIMUM_LIQUIDITY = 10 ** 3;
    bytes4 private constant SELECTOR =
        bytes4(keccak256(bytes("transfer(address,uint256)")));

    struct Pool {
        uint256 reserve0;
        uint256 reserve1;
        uint256 totalSupply;
        mapping(address => uint256) balanceOf;
        address token0;
        address token1;
    }

    // Key is keccak256(abi.encodePacked(token0, token1))
    mapping(bytes32 => Pool) public pools;

    // Constants
    address public constant ETH_ADDRESS = address(0);

    struct TokenInfo {
        address token;
        string name;
        string symbol;
    }

    struct Order {
        uint256 id;
        address owner;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        bool executed;
    }

    // Token Registry
    // Token Registry
    address[] public listedTokens;
    mapping(address => bool) public isListed;

    // User Position Tracking
    // user => list of pool keys where they have balance > 0
    // User Position Tracking
    // user => list of pool keys where they have balance > 0
    mapping(address => bytes32[]) public userPools;

    // Flash Accounting
    // user => token => signed delta
    mapping(address => mapping(address => int256)) public delta;

    // Limit Orders
    uint256 public nextOrderId = 1;
    mapping(uint256 => Order) public orders;
    mapping(address => uint256[]) public userOrders;

    receive() external payable {}

    // Events
    event Mint(
        address indexed sender,
        address indexed token0,
        address indexed token1,
        uint256 amount0,
        uint256 amount1
    );
    event Burn(
        address indexed sender,
        address indexed token0,
        address indexed token1,
        uint256 amount0,
        uint256 amount1,
        address to
    );
    event Swap(
        address indexed sender,
        address indexed token0,
        address indexed token1,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address to
    );
    event Sync(
        address indexed token0,
        address indexed token1,
        uint256 reserve0,
        uint256 reserve1
    );
    event OrderPlaced(
        uint256 indexed orderId,
        address indexed owner,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    );
    event OrderCanceled(uint256 indexed orderId);
    event OrderExecuted(
        uint256 indexed orderId,
        address indexed executor,
        uint256 amountOut
    );

    uint256 private unlocked = 1;
    modifier lock() {
        require(unlocked == 1, "SingletonSwap: LOCKED");
        unlocked = 0;
        _;
        unlocked = 1;
    }

    function getReserves(
        address tokenA,
        address tokenB
    ) public view returns (uint256 reserveA, uint256 reserveB) {
        (bytes32 key, address token0, ) = _getPoolKey(tokenA, tokenB);
        Pool storage pool = pools[key];
        (reserveA, reserveB) = tokenA == token0
            ? (pool.reserve0, pool.reserve1)
            : (pool.reserve1, pool.reserve0);
    }

    // --- Liquidity ---

    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) internal view returns (uint256 amountA, uint256 amountB) {
        (uint256 reserveA, uint256 reserveB) = getReserves(tokenA, tokenB);

        if (reserveA == 0 && reserveB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint256 amountBOptimal = SwapMath.quote(
                amountADesired,
                reserveA,
                reserveB
            );
            if (amountBOptimal <= amountBDesired) {
                require(
                    amountBOptimal >= amountBMin,
                    "SingletonSwap: INSUFFICIENT_B_AMOUNT"
                );
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint256 amountAOptimal = SwapMath.quote(
                    amountBDesired,
                    reserveB,
                    reserveA
                );
                assert(amountAOptimal <= amountADesired);
                require(
                    amountAOptimal >= amountAMin,
                    "SingletonSwap: INSUFFICIENT_A_AMOUNT"
                );
                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    )
        external
        virtual
        lock
        returns (uint256 amountA, uint256 amountB, uint256 liquidity)
    {
        require(deadline >= block.timestamp, "SingletonSwap: EXPIRED");
        require(
            tokenA != ETH_ADDRESS && tokenB != ETH_ADDRESS,
            "SingletonSwap: USE_ADD_LIQUIDITY_ETH"
        );

        (amountA, amountB) = _addLiquidity(
            tokenA,
            tokenB,
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin
        );

        _registerToken(tokenA);
        _registerToken(tokenB);

        (bytes32 key, address token0, address token1) = _getPoolKey(
            tokenA,
            tokenB
        );

        // Measure actual amount added to support FOT
        // We measure delta of the contract balance during THIS transfer only.
        uint256 balance0Before = token0 == ETH_ADDRESS
            ? address(this).balance
            : IERC20(token0).balanceOf(address(this));
        uint256 balance1Before = token1 == ETH_ADDRESS
            ? address(this).balance
            : IERC20(token1).balanceOf(address(this));

        _safeTransferFrom(tokenA, msg.sender, address(this), amountA);
        _safeTransferFrom(tokenB, msg.sender, address(this), amountB);

        uint256 balance0After = token0 == ETH_ADDRESS
            ? address(this).balance
            : IERC20(token0).balanceOf(address(this));
        uint256 balance1After = token1 == ETH_ADDRESS
            ? address(this).balance
            : IERC20(token1).balanceOf(address(this));

        uint256 amount0 = balance0After - balance0Before;
        uint256 amount1 = balance1After - balance1Before;

        liquidity = _mint(key, token0, token1, amount0, amount1, to);
        (amountA, amountB) = tokenA == token0
            ? (amount0, amount1)
            : (amount1, amount0);
    }

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    )
        external
        payable
        virtual
        lock
        returns (uint256 amountToken, uint256 amountETH, uint256 liquidity)
    {
        require(deadline >= block.timestamp, "SingletonSwap: EXPIRED");

        (amountToken, amountETH) = _addLiquidity(
            token,
            ETH_ADDRESS,
            amountTokenDesired,
            msg.value,
            amountTokenMin,
            amountETHMin
        );

        _registerToken(token);
        // ETH is always listed if we consider it base, but for UI we might want it in the list separately or handle it.
        // Let's register ETH as address(0).
        _registerToken(ETH_ADDRESS);

        (bytes32 key, address token0, address token1) = _getPoolKey(
            token,
            ETH_ADDRESS
        );
        // ETH is token0 or token1? _getPoolKey sorts. ETH is address(0), so it's always token0.
        // But _getPoolKey uses pure comparison. address(0) < any other address.
        // Yes, ETH is token0.

        // Measure token delta
        uint256 balanceTokenBefore = IERC20(token).balanceOf(address(this));
        _safeTransferFrom(token, msg.sender, address(this), amountToken);
        uint256 balanceTokenAfter = IERC20(token).balanceOf(address(this));
        uint256 actualTokenAmount = balanceTokenAfter - balanceTokenBefore;

        // Refund ETH
        if (msg.value > amountETH) {
            _safeTransfer(ETH_ADDRESS, msg.sender, msg.value - amountETH);
        }
        // ETH amount is exactly `amountETH` (since we refund rest).

        uint256 amount0 = token0 == ETH_ADDRESS ? amountETH : actualTokenAmount;
        uint256 amount1 = token1 == ETH_ADDRESS ? amountETH : actualTokenAmount;

        liquidity = _mint(key, token0, token1, amount0, amount1, to);
        (amountToken, amountETH) = token == token0
            ? (amount0, amount1)
            : (amount1, amount0);
    }

    function _getPoolKey(
        address tokenA,
        address tokenB
    ) internal pure returns (bytes32 key, address token0, address token1) {
        require(tokenA != tokenB, "SingletonSwap: IDENTICAL_ADDRESSES");
        (token0, token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        require(
            token0 != address(0) || token1 != address(0),
            "SingletonSwap: ZERO_ADDRESS"
        ); // Allow address(0) for ETH, but not both 0 (impossible by identical check if A!=B)
        key = keccak256(abi.encodePacked(token0, token1));
    }

    function _safeTransfer(address token, address to, uint256 value) private {
        if (token == ETH_ADDRESS) {
            (bool success, ) = to.call{value: value}("");
            require(success, "SingletonSwap: ETH_TRANSFER_FAILED");
        } else {
            (bool success, bytes memory data) = token.call(
                abi.encodeWithSelector(SELECTOR, to, value)
            );
            require(
                success && (data.length == 0 || abi.decode(data, (bool))),
                "SingletonSwap: TRANSFER_FAILED"
            );
        }
    }

    function _safeTransferFrom(
        address token,
        address from,
        address to,
        uint256 value
    ) private {
        require(
            token != ETH_ADDRESS,
            "SingletonSwap: ETH_TRANSFER_FROM_FAILED"
        );
        // bytes4(keccak256(bytes('transferFrom(address,address,uint256)')));
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(0x23b872dd, from, to, value)
        );
        require(
            success && (data.length == 0 || abi.decode(data, (bool))),
            "SingletonSwap: TRANSFER_FROM_FAILED"
        );
    }

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) public virtual returns (uint256 amountA, uint256 amountB) {
        require(deadline >= block.timestamp, "SingletonSwap: EXPIRED");
        (amountA, amountB) = _removeLiquidity(tokenA, tokenB, liquidity, to);
        require(amountA >= amountAMin, "SingletonSwap: INSUFFICIENT_A_AMOUNT");
        require(amountB >= amountBMin, "SingletonSwap: INSUFFICIENT_B_AMOUNT");
    }

    function removeLiquidityETH(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) public virtual returns (uint256 amountToken, uint256 amountETH) {
        require(deadline >= block.timestamp, "SingletonSwap: EXPIRED");
        (amountToken, amountETH) = _removeLiquidity(
            token,
            ETH_ADDRESS,
            liquidity,
            address(this)
        );
        require(
            amountToken >= amountTokenMin,
            "SingletonSwap: INSUFFICIENT_A_AMOUNT"
        );
        require(
            amountETH >= amountETHMin,
            "SingletonSwap: INSUFFICIENT_B_AMOUNT"
        );
        _safeTransfer(token, to, amountToken);
        _safeTransfer(ETH_ADDRESS, to, amountETH);
    }

    // --- Swaps ---

    // Internal low-level swap that executes the swap logic given KNOWN inputs
    function _swap(
        bytes32 key,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address to,
        address token0,
        address token1
    ) internal {
        require(
            amount0Out > 0 || amount1Out > 0,
            "SingletonSwap: INSUFFICIENT_OUTPUT_AMOUNT"
        );
        Pool storage pool = pools[key];
        require(
            amount0Out < pool.reserve0 && amount1Out < pool.reserve1,
            "SingletonSwap: INSUFFICIENT_LIQUIDITY"
        );

        require(
            amount0In > 0 || amount1In > 0,
            "SingletonSwap: INSUFFICIENT_INPUT_AMOUNT"
        );
        {
            uint256 balance0Adjusted = (pool.reserve0 +
                amount0In -
                amount0Out) *
                1000 -
                amount0In *
                3;
            uint256 balance1Adjusted = (pool.reserve1 +
                amount1In -
                amount1Out) *
                1000 -
                amount1In *
                3;

            require(
                balance0Adjusted * balance1Adjusted >=
                    uint256(pool.reserve0) * pool.reserve1 * (1000 ** 2),
                "SingletonSwap: K"
            );
        }

        if (token0 != ETH_ADDRESS) {
            if (amount0Out > 0) {
                if (to != address(this)) _credit(to, token0, amount0Out);
            }
        } else {
            if (amount0Out > 0) {
                if (to != address(this)) _credit(to, ETH_ADDRESS, amount0Out);
            }
        }

        if (token1 != ETH_ADDRESS) {
            if (amount1Out > 0) {
                if (to != address(this)) _credit(to, token1, amount1Out);
            }
        } else {
            if (amount1Out > 0) {
                if (to != address(this)) _credit(to, ETH_ADDRESS, amount1Out);
            }
        }

        uint256 reserve0New = pool.reserve0 + amount0In - amount0Out;
        uint256 reserve1New = pool.reserve1 + amount1In - amount1Out;
        _update(key, reserve0New, reserve1New, token0, token1);

        emit Swap(
            msg.sender,
            token0,
            token1,
            amount0In,
            amount1In,
            amount0Out,
            amount1Out,
            to
        );
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external virtual lock returns (uint256[] memory amounts) {
        require(deadline >= block.timestamp, "SingletonSwap: EXPIRED");
        amounts = _getAmountsOut(amountIn, path);
        require(
            amounts[amounts.length - 1] >= amountOutMin,
            "SingletonSwap: INSUFFICIENT_OUTPUT_AMOUNT"
        );

        uint256 amountReceived = _pay(path[0], msg.sender, amounts[0]);
        if (amountReceived != amounts[0]) {
            amounts = _getAmountsOut(amountReceived, path);
            require(
                amounts[amounts.length - 1] >= amountOutMin,
                "SingletonSwap: INSUFFICIENT_OUTPUT_AMOUNT_FOT"
            );
        }

        _swapChain(path, amounts, to);
        _settle(to, path[path.length - 1]);
    }

    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable virtual lock returns (uint256[] memory amounts) {
        require(deadline >= block.timestamp, "SingletonSwap: EXPIRED");
        require(path[0] == ETH_ADDRESS, "SingletonSwap: INVALID_PATH");
        amounts = _getAmountsOut(msg.value, path);
        require(
            amounts[amounts.length - 1] >= amountOutMin,
            "SingletonSwap: INSUFFICIENT_OUTPUT_AMOUNT"
        );

        _swapChain(path, amounts, to);
        _settle(to, path[path.length - 1]);
    }

    function swapTokensForExactETH(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external virtual lock returns (uint256[] memory amounts) {
        require(deadline >= block.timestamp, "SingletonSwap: EXPIRED");
        require(
            path[path.length - 1] == ETH_ADDRESS,
            "SingletonSwap: INVALID_PATH"
        );
        amounts = _getAmountsIn(amountOut, path);
        require(
            amounts[0] <= amountInMax,
            "SingletonSwap: EXCESSIVE_INPUT_AMOUNT"
        );

        _pay(path[0], msg.sender, amounts[0]);
        _swapChain(path, amounts, to);
        _settle(to, path[path.length - 1]);
    }

    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external virtual lock returns (uint256[] memory amounts) {
        require(deadline >= block.timestamp, "SingletonSwap: EXPIRED");
        require(
            path[path.length - 1] == ETH_ADDRESS,
            "SingletonSwap: INVALID_PATH"
        );
        amounts = _getAmountsOut(amountIn, path);
        require(
            amounts[amounts.length - 1] >= amountOutMin,
            "SingletonSwap: INSUFFICIENT_OUTPUT_AMOUNT"
        );

        uint256 amountReceived = _pay(path[0], msg.sender, amounts[0]);
        if (amountReceived != amounts[0]) {
            amounts = _getAmountsOut(amountReceived, path);
            require(
                amounts[amounts.length - 1] >= amountOutMin,
                "SingletonSwap: INSUFFICIENT_OUTPUT_AMOUNT_FOT"
            );
        }

        _swapChain(path, amounts, to);
        _settle(to, path[path.length - 1]);
    }

    function swapETHForExactTokens(
        uint256 amountOut,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable virtual lock returns (uint256[] memory amounts) {
        require(deadline >= block.timestamp, "SingletonSwap: EXPIRED");
        require(path[0] == ETH_ADDRESS, "SingletonSwap: INVALID_PATH");
        amounts = _getAmountsIn(amountOut, path);
        require(
            amounts[0] <= msg.value,
            "SingletonSwap: EXCESSIVE_INPUT_AMOUNT"
        );

        // Refund ETH
        if (msg.value > amounts[0]) {
            _safeTransfer(ETH_ADDRESS, msg.sender, msg.value - amounts[0]);
        }

        _swapChain(path, amounts, to);
        _settle(to, path[path.length - 1]);
    }

    // --- Helpers ---

    function _pay(
        address token,
        address from,
        uint256 amount
    ) internal returns (uint256) {
        if (token == ETH_ADDRESS) {
            require(msg.value >= amount, "SingletonSwap: INSUFFICIENT_ETH");
            return amount;
        }
        uint256 balanceBefore = IERC20(token).balanceOf(address(this));
        _safeTransferFrom(token, from, address(this), amount);
        uint256 balanceAfter = IERC20(token).balanceOf(address(this));
        return balanceAfter - balanceBefore;
    }

    function _credit(address user, address token, uint256 amount) internal {
        delta[user][token] = FlashAccounting.safeAdd(
            delta[user][token],
            int256(amount)
        );
    }

    function _settle(address user, address token) internal {
        int256 balance = delta[user][token];
        if (balance > 0) {
            delta[user][token] = 0;
            if (token == ETH_ADDRESS) {
                _safeTransfer(ETH_ADDRESS, user, uint256(balance));
            } else {
                _safeTransfer(token, user, uint256(balance));
            }
        }
    }

    function _swapChain(
        address[] memory path,
        uint256[] memory amounts,
        address to
    ) internal {
        for (uint i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (bytes32 key, address token0, ) = _getPoolKey(input, output);
            uint256 amountOut = amounts[i + 1];
            uint256 amountIn = amounts[i];

            (uint256 amount0Out, uint256 amount1Out) = input == token0
                ? (uint(0), amountOut)
                : (amountOut, uint(0));
            (uint256 amount0In, uint256 amount1In) = input == token0
                ? (amountIn, uint(0))
                : (uint(0), amountIn);

            address _to = i < path.length - 2 ? address(this) : to;

            _swap(
                key,
                amount0In,
                amount1In,
                amount0Out,
                amount1Out,
                _to,
                token0,
                path[i + 1] == token0 ? path[i] : path[i + 1]
            );
        }
    }

    function _getAmountsOut(
        uint256 amountIn,
        address[] memory path
    ) internal view returns (uint256[] memory amounts) {
        require(path.length >= 2, "SingletonSwap: INVALID_PATH");
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        for (uint i; i < path.length - 1; i++) {
            (bytes32 key, address token0, ) = _getPoolKey(path[i], path[i + 1]);
            Pool storage pool = pools[key];
            (uint256 reserveIn, uint256 reserveOut) = path[i] == token0
                ? (pool.reserve0, pool.reserve1)
                : (pool.reserve1, pool.reserve0);
            amounts[i + 1] = SwapMath.getAmountOut(
                amounts[i],
                reserveIn,
                reserveOut
            );
        }
    }

    function _getAmountsIn(
        uint256 amountOut,
        address[] memory path
    ) internal view returns (uint256[] memory amounts) {
        require(path.length >= 2, "SingletonSwap: INVALID_PATH");
        amounts = new uint256[](path.length);
        amounts[amounts.length - 1] = amountOut;
        for (uint i = path.length - 1; i > 0; i--) {
            (bytes32 key, address token0, ) = _getPoolKey(path[i - 1], path[i]);
            Pool storage pool = pools[key];
            (uint256 reserveIn, uint256 reserveOut) = path[i - 1] == token0
                ? (pool.reserve0, pool.reserve1)
                : (pool.reserve1, pool.reserve0);
            amounts[i - 1] = SwapMath.getAmountIn(
                amounts[i],
                reserveIn,
                reserveOut
            );
        }
    }

    function _mint(
        bytes32 key,
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1,
        address to
    ) internal returns (uint256 liquidity) {
        Pool storage pool = pools[key];
        uint256 _totalSupply = pool.totalSupply;

        if (_totalSupply == 0) {
            liquidity = SwapMath.sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            pool.balanceOf[address(0)] = MINIMUM_LIQUIDITY;
            // Initialize pool tokens
            pool.token0 = token0;
            pool.token1 = token1;
        } else {
            liquidity = SwapMath.min(
                (amount0 * _totalSupply) / pool.reserve0,
                (amount1 * _totalSupply) / pool.reserve1
            );
        }

        require(liquidity > 0, "SingletonSwap: INSUFFICIENT_LIQUIDITY_MINTED");

        if (pool.balanceOf[to] == 0) {
            _addPoolToUser(to, key);
        }
        pool.balanceOf[to] += liquidity;
        pool.totalSupply += liquidity;
        if (_totalSupply == 0) pool.totalSupply += MINIMUM_LIQUIDITY;

        _update(
            key,
            pool.reserve0 + amount0,
            pool.reserve1 + amount1,
            token0,
            token1
        );

        emit Mint(msg.sender, token0, token1, amount0, amount1);
    }

    function _burn(
        bytes32 key,
        address token0,
        address token1,
        uint256 liquidity,
        address to
    ) internal returns (uint256 amount0, uint256 amount1) {
        Pool storage pool = pools[key];
        uint256 _totalSupply = pool.totalSupply;

        amount0 = (liquidity * pool.reserve0) / _totalSupply;
        amount1 = (liquidity * pool.reserve1) / _totalSupply;

        require(
            amount0 > 0 && amount1 > 0,
            "SingletonSwap: INSUFFICIENT_BURN_AMOUNT"
        );

        pool.balanceOf[msg.sender] -= liquidity;
        if (pool.balanceOf[msg.sender] == 0) {
            _removePoolFromUser(msg.sender, key);
        }
        pool.totalSupply -= liquidity;

        uint256 newReserve0 = pool.reserve0 - amount0;
        uint256 newReserve1 = pool.reserve1 - amount1;

        _update(key, newReserve0, newReserve1, token0, token1);

        if (
            pool.totalSupply == MINIMUM_LIQUIDITY &&
            pool.balanceOf[address(0)] == MINIMUM_LIQUIDITY &&
            newReserve0 <= MINIMUM_LIQUIDITY &&
            newReserve1 <= MINIMUM_LIQUIDITY
        ) {
            pool.totalSupply = 0;
            pool.balanceOf[address(0)] = 0;
            pool.reserve0 = 0;
            pool.reserve1 = 0;
            emit Sync(token0, token1, 0, 0);
        }

        if (token0 == ETH_ADDRESS) _safeTransfer(ETH_ADDRESS, to, amount0);
        else _safeTransfer(token0, to, amount0);

        if (token1 == ETH_ADDRESS) _safeTransfer(ETH_ADDRESS, to, amount1);
        else _safeTransfer(token1, to, amount1);

        emit Burn(msg.sender, token0, token1, amount0, amount1, to);
    }

    function _update(
        bytes32 key,
        uint256 reserve0,
        uint256 reserve1,
        address token0,
        address token1
    ) internal {
        Pool storage pool = pools[key];
        pool.reserve0 = reserve0;
        pool.reserve1 = reserve1;
        emit Sync(token0, token1, reserve0, reserve1);
    }

    function _removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        address to
    ) internal lock returns (uint256 amountA, uint256 amountB) {
        (bytes32 key, address token0, address token1) = _getPoolKey(
            tokenA,
            tokenB
        );
        (uint256 amount0, uint256 amount1) = _burn(
            key,
            token0,
            token1,
            liquidity,
            to
        );
        (amountA, amountB) = tokenA == token0
            ? (amount0, amount1)
            : (amount1, amount0);
    }

    // --- Token Registry Helpers ---

    function _registerToken(address token) internal {
        if (!isListed[token]) {
            isListed[token] = true;
            listedTokens.push(token);
        }
    }

    function getTokensLength() external view returns (uint256) {
        return listedTokens.length;
    }

    function getTokensPaginated(
        uint256 start,
        uint256 limit
    ) external view returns (TokenInfo[] memory items) {
        uint256 total = listedTokens.length;
        if (start >= total) {
            return new TokenInfo[](0);
        }

        uint256 end = start + limit;
        if (end > total) {
            end = total;
        }
        uint256 size = end - start;
        items = new TokenInfo[](size);

        for (uint256 i = 0; i < size; i++) {
            address t = listedTokens[start + i];
            string memory name = "BNB";
            string memory symbol = "BNB";

            if (t != ETH_ADDRESS) {
                // Try catch in case of weird tokens? Standard ERC20 should work.
                try IERC20(t).name() returns (string memory n) {
                    name = n;
                } catch {
                    name = "Unknown";
                }
                try IERC20(t).symbol() returns (string memory s) {
                    symbol = s;
                } catch {
                    symbol = "UNKNOWN";
                }
            }

            items[i] = TokenInfo({token: t, name: name, symbol: symbol});
        }
    }

    // --- User Position Helpers ---

    function _addPoolToUser(address user, bytes32 key) internal {
        bytes32[] storage userList = userPools[user];
        // Check duplication just in case, though _mint logic should only call if bal was 0
        for (uint i = 0; i < userList.length; i++) {
            if (userList[i] == key) return;
        }
        userList.push(key);
    }

    function _removePoolFromUser(address user, bytes32 key) internal {
        bytes32[] storage userList = userPools[user];
        for (uint i = 0; i < userList.length; i++) {
            if (userList[i] == key) {
                userList[i] = userList[userList.length - 1];
                userList.pop();
                return;
            }
        }
    }

    struct PositionInfo {
        bytes32 key;
        address token0;
        address token1;
        uint256 liquidity;
        uint256 reserve0;
        uint256 reserve1;
        string symbol0;
        string symbol1;
    }

    function getUserPositions(
        address user
    ) external view returns (PositionInfo[] memory positions) {
        bytes32[] memory keys = userPools[user];
        positions = new PositionInfo[](keys.length);

        for (uint i = 0; i < keys.length; i++) {
            bytes32 key = keys[i];
            Pool storage pool = pools[key];
            uint256 liq = pool.balanceOf[user];
            address t0 = pool.token0;
            address t1 = pool.token1;

            string memory s0 = "BNB";
            string memory s1 = "BNB";

            if (t0 != ETH_ADDRESS) {
                try IERC20(t0).symbol() returns (string memory s) {
                    s0 = s;
                } catch {
                    s0 = "???";
                }
            }
            if (t1 != ETH_ADDRESS) {
                try IERC20(t1).symbol() returns (string memory s) {
                    s1 = s;
                } catch {
                    s1 = "???";
                }
            }

            positions[i] = PositionInfo({
                key: key,
                token0: t0,
                token1: t1,
                liquidity: liq,
                reserve0: pool.reserve0,
                reserve1: pool.reserve1,
                symbol0: s0,
                symbol1: s1
            });
        }
    }

    function transferLP(bytes32 key, address to, uint256 amount) external {
        _transferLP(key, msg.sender, to, amount);
    }

    function _transferLP(
        bytes32 key,
        address from,
        address to,
        uint256 amount
    ) internal {
        Pool storage pool = pools[key];
        require(
            pool.balanceOf[from] >= amount,
            "SingletonSwap: INSUFFICIENT_LP_BALANCE"
        );
        require(to != address(0), "SingletonSwap: ZERO_ADDRESS");

        pool.balanceOf[from] -= amount;
        if (pool.balanceOf[from] == 0) {
            _removePoolFromUser(from, key);
        }

        if (pool.balanceOf[to] == 0) {
            _addPoolToUser(to, key);
        }
        pool.balanceOf[to] += amount;
    }

    // --- Limit Orders ---

    function placeOrder(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 deadline
    ) external payable lock returns (uint256 orderId) {
        require(deadline >= block.timestamp, "SingletonSwap: EXPIRED");
        require(amountIn > 0, "SingletonSwap: ZERO_AMOUNT");
        require(minAmountOut > 0, "SingletonSwap: ZERO_MIN_OUT");
        require(tokenIn != tokenOut, "SingletonSwap: IDENTICAL_TOKENS");

        orderId = nextOrderId++;

        // Pull tokens from user
        if (tokenIn == ETH_ADDRESS) {
            require(msg.value >= amountIn, "SingletonSwap: INSUFFICIENT_ETH");
            if (msg.value > amountIn) {
                _safeTransfer(ETH_ADDRESS, msg.sender, msg.value - amountIn);
            }
        } else {
            _safeTransferFrom(tokenIn, msg.sender, address(this), amountIn);
        }

        orders[orderId] = Order({
            id: orderId,
            owner: msg.sender,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            minAmountOut: minAmountOut,
            executed: false
        });

        userOrders[msg.sender].push(orderId);

        emit OrderPlaced(
            orderId,
            msg.sender,
            tokenIn,
            tokenOut,
            amountIn,
            minAmountOut
        );
    }

    function cancelOrder(uint256 orderId) external lock {
        Order storage order = orders[orderId];
        require(order.owner == msg.sender, "SingletonSwap: NOT_OWNER");
        require(!order.executed, "SingletonSwap: ALREADY_EXECUTED");

        order.executed = true; // Mark as executed to prevent re-execution

        // Refund tokens
        if (order.tokenIn == ETH_ADDRESS) {
            _safeTransfer(ETH_ADDRESS, msg.sender, order.amountIn);
        } else {
            _safeTransfer(order.tokenIn, msg.sender, order.amountIn);
        }

        emit OrderCanceled(orderId);
    }

    function executeOrder(uint256 orderId) external lock {
        Order storage order = orders[orderId];
        require(!order.executed, "SingletonSwap: ALREADY_EXECUTED");

        // Check if current AMM price can fill the order
        (uint256 reserveIn, uint256 reserveOut) = getReserves(
            order.tokenIn,
            order.tokenOut
        );
        uint256 amountOut = SwapMath.getAmountOut(
            order.amountIn,
            reserveIn,
            reserveOut
        );

        require(
            amountOut >= order.minAmountOut,
            "SingletonSwap: PRICE_NOT_MET"
        );

        order.executed = true;

        // Execute swap internally
        address[] memory path = new address[](2);
        path[0] = order.tokenIn;
        path[1] = order.tokenOut;

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = order.amountIn;
        amounts[1] = amountOut;

        // Swap to order owner
        _swapChain(path, amounts, order.owner);
        _settle(order.owner, order.tokenOut);

        // Pay executor a small incentive (0.1% of amountOut)
        uint256 executorFee = amountOut / 1000;
        if (executorFee > 0) {
            _credit(msg.sender, order.tokenOut, executorFee);
            _settle(msg.sender, order.tokenOut);
        }

        emit OrderExecuted(orderId, msg.sender, amountOut);
    }

    function getUserOrders(
        address user
    ) external view returns (uint256[] memory) {
        return userOrders[user];
    }
}
