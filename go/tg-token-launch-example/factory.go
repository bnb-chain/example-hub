package main

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"log"
	"math/big"
	"os"
	"strings"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

// DeployToken calls the factory contract and deploys a new token
func DeployToken(name, symbol string) (string, error) {
	client, err := ethclient.Dial(os.Getenv("RPC_URL"))
	if err != nil {
		return "", err
	}
	defer client.Close()

	privateKey, err := getPrivateKey()
	if err != nil {
		return "", err
	}

	fromAddress := crypto.PubkeyToAddress(*privateKey.Public().(*ecdsa.PublicKey))
	nonce, err := client.PendingNonceAt(context.Background(), fromAddress)
	if err != nil {
		return "", err
	}

	gasPrice, err := client.SuggestGasPrice(context.Background())
	if err != nil {
		return "", err
	}

	// TokenFactory ABI
	const factoryABI = `[{"inputs":[{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"symbol","type":"string"},{"internalType":"address","name":"initialRecipient","type":"address"}],"name":"deployToken","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"nonpayable","type":"function"}]`
	parsedABI, err := abi.JSON(strings.NewReader(factoryABI))
	if err != nil {
		return "", err
	}

	// Pack deployToken call
	data, err := parsedABI.Pack("deployToken", name, symbol, fromAddress)
	if err != nil {
		return "", err
	}

	// Set contract address (TokenFactory)
	contractAddress := common.HexToAddress(os.Getenv("TOKEN_FACTORY_ADDRESS"))

	msg := ethereum.CallMsg{
		From: fromAddress,
		To:   &contractAddress,
		Data: data,
	}
	gasLimit, err := client.EstimateGas(context.Background(), msg)
	if err != nil {
		gasLimit = uint64(300_000) // fallback
	}

	// Create and sign transaction
	tx := types.NewTransaction(nonce, contractAddress, big.NewInt(0), gasLimit, gasPrice, data)
	chainID := big.NewInt(97) // BNB Testnet
	signedTx, err := types.SignTx(tx, types.NewEIP155Signer(chainID), privateKey)
	if err != nil {
		return "", err
	}

	err = client.SendTransaction(context.Background(), signedTx)
	if err != nil {
		return "", err
	}

	log.Println("⛓ Sent deployToken transaction:", signedTx.Hash().Hex())

	// OPTIONAL: Wait for receipt and get deployed address from logs
	receipt, err := waitForReceipt(client, signedTx.Hash())
	if err != nil {
		return "", err
	}

	// Parse event log to get deployed token address
	factoryAddr := common.HexToAddress(os.Getenv("TOKEN_FACTORY_ADDRESS"))

	for _, vLog := range receipt.Logs {
		if vLog.Address == factoryAddr && len(vLog.Topics) >= 3 {
			// Debug print to confirm
			log.Println("Log from factory:")
			log.Println("  Topic[1] (token):", vLog.Topics[1].Hex())
			log.Println("  Topic[2] (owner):", vLog.Topics[2].Hex())

			tokenAddress := common.HexToAddress(vLog.Topics[2].Hex())
			log.Println("🎉 Token deployed to:", tokenAddress.Hex())
			return tokenAddress.Hex(), nil
		}
	}

	return "", fmt.Errorf("could not find deployed token address in logs")
}

// Waits for transaction receipt
func waitForReceipt(client *ethclient.Client, txHash common.Hash) (*types.Receipt, error) {
	ctx := context.Background()
	for {
		receipt, err := client.TransactionReceipt(ctx, txHash)
		if err == nil {
			return receipt, nil
		}
	}
}
