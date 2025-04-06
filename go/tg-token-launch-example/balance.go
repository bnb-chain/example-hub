package main

import (
	"context"
	"fmt"
	"math/big"
	"os"
	"strings"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
)

// GetTokenBalance returns the BEP20 token balance of a given address
func GetTokenBalance(tokenAddress string, walletAddress string) (string, error) {
	client, err := ethclient.Dial(os.Getenv("RPC_URL"))
	if err != nil {
		return "", err
	}
	defer client.Close()

	contract := common.HexToAddress(tokenAddress)
	account := common.HexToAddress(walletAddress)

	tokenABI := `[{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"type":"function"}]`
	parsedABI, err := abi.JSON(strings.NewReader(tokenABI))
	if err != nil {
		return "", err
	}

	data, err := parsedABI.Pack("balanceOf", account)
	if err != nil {
		return "", err
	}

	callMsg := ethereum.CallMsg{To: &contract, Data: data}
	output, err := client.CallContract(context.Background(), callMsg, nil)
	if err != nil {
		return "", err
	}

	var balance *big.Int
	err = parsedABI.UnpackIntoInterface(&balance, "balanceOf", output)
	if err != nil {
		return "", err
	}

	// Return in human-readable format (e.g. 1.23 tokens)
	human := new(big.Float).Quo(new(big.Float).SetInt(balance), big.NewFloat(1e18))
	return fmt.Sprintf("%s tokens", human.Text('f', 6)), nil
}
