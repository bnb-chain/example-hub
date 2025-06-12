package ethutils

import (
	"context"
	"errors"
	"fmt"
	"math"
	"math/big"
	"strings"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
)

type TokenInfo struct {
	Symbol   string
	Decimals int
}

// Fetches token symbol and decimals
func GetTokenMetadata(client *ethclient.Client, tokenAddress common.Address) (*TokenInfo, error) {
	tokenABI := `[{"constant":true,"name":"symbol","outputs":[{"name":"","type":"string"}],"type":"function"},
				  {"constant":true,"name":"decimals","outputs":[{"name":"","type":"uint8"}],"type":"function"}]`

	parsedABI, err := abi.JSON(strings.NewReader(tokenABI))
	if err != nil {
		return nil, err
	}

	ctx := context.Background()

	symbolData, _ := parsedABI.Pack("symbol")
	decimalsData, _ := parsedABI.Pack("decimals")

	// Symbol
	symbolResult, err := client.CallContract(ctx, ethereum.CallMsg{To: &tokenAddress, Data: symbolData}, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to call symbol: %w", err)
	}
	var symbol string
	if err := parsedABI.UnpackIntoInterface(&symbol, "symbol", symbolResult); err != nil {
		return nil, fmt.Errorf("failed to unpack symbol: %w", err)
	}

	// Decimals
	decimalsResult, err := client.CallContract(ctx, ethereum.CallMsg{To: &tokenAddress, Data: decimalsData}, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to call decimals: %w", err)
	}
	var decimals uint8
	if err := parsedABI.UnpackIntoInterface(&decimals, "decimals", decimalsResult); err != nil {
		return nil, fmt.Errorf("failed to unpack decimals: %w", err)
	}

	return &TokenInfo{Symbol: symbol, Decimals: int(decimals)}, nil
}

// Converts raw token amount to human-readable string
func FormatTokenAmount(raw *big.Int, decimals int) string {
	f := new(big.Float).SetInt(raw)
	divisor := new(big.Float).SetFloat64(math.Pow10(decimals))
	human := new(big.Float).Quo(f, divisor)
	return human.Text('f', 6) // show 6 decimal places
}

// GetTokenPair fetches token0 and token1 addresses from a pair contract.
func GetTokenPair(client *ethclient.Client, contract common.Address, parsedABI abi.ABI) (token0, token1 common.Address, err error) {
	ctx := context.Background()

	// Fetch token0
	if _, ok := parsedABI.Methods["token0"]; ok {
		input, _ := parsedABI.Pack("token0")
		out, err := client.CallContract(ctx, ethereum.CallMsg{To: &contract, Data: input}, nil)
		if err != nil || len(out) < 32 {
			return token0, token1, errors.New("failed to fetch token0")
		}
		token0 = common.BytesToAddress(out[12:])
	} else {
		return token0, token1, errors.New("token0() not found in ABI")
	}

	// Fetch token1
	if _, ok := parsedABI.Methods["token1"]; ok {
		input, _ := parsedABI.Pack("token1")
		out, err := client.CallContract(ctx, ethereum.CallMsg{To: &contract, Data: input}, nil)
		if err != nil || len(out) < 32 {
			return token0, token1, errors.New("failed to fetch token1")
		}
		token1 = common.BytesToAddress(out[12:])
	} else {
		return token0, token1, errors.New("token1() not found in ABI")
	}

	return token0, token1, nil
}
