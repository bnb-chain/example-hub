package V2router

import (
	"math/big"
	"strings"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
)

var RouterABI = `[
	{
		"inputs": [
			{"name": "amountIn", "type": "uint256"},
			{"name": "amountOutMin", "type": "uint256"},
			{"name": "path", "type": "address[]"},
			{"name": "to", "type": "address"},
			{"name": "deadline", "type": "uint256"}
		],
		"name": "swapExactTokensForTokens",
		"outputs": [{"name": "amounts", "type": "uint256[]"}],
		"stateMutability": "nonpayable",
		"type": "function"
	}
]`

type SimpleRouter struct {
	*bind.BoundContract
}

func NewSimpleRouter(address common.Address, backend bind.ContractBackend) (*SimpleRouter, error) {
	parsed, err := abi.JSON(strings.NewReader(RouterABI))
	if err != nil {
		return nil, err
	}

	contract := bind.NewBoundContract(address, parsed, backend, backend, backend)
	return &SimpleRouter{BoundContract: contract}, nil
}

func (r *SimpleRouter) SwapExactTokensForTokens(opts *bind.TransactOpts, amountIn *big.Int, amountOutMin *big.Int, path []common.Address, to common.Address, deadline *big.Int) (*types.Transaction, error) {
	return r.BoundContract.Transact(opts, "swapExactTokensForTokens", amountIn, amountOutMin, path, to, deadline)
}
