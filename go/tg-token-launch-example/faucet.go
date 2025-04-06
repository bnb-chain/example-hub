package main

import (
	"context"
	"crypto/ecdsa"
	"encoding/hex"
	"fmt"
	"log"
	"math/big"
	"os"
	"strings"

	"tg-token-launch-example/utils"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

// SendToken transfers tokens from the faucet to a user address
func SendToken(tokenAddress string, to string) (string, error) {
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

	toAddress := common.HexToAddress(to)
	contractAddress := common.HexToAddress(tokenAddress)

	tokenABI := `[{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"type":"function"}]`
	parsedABI, err := abi.JSON(strings.NewReader(tokenABI))
	if err != nil {
		return "", err
	}

	// Send 10 tokens
	amount := new(big.Int).Mul(big.NewInt(10), big.NewInt(1e18))
	data, err := parsedABI.Pack("transfer", toAddress, amount)
	if err != nil {
		return "", err
	}

	msg := ethereum.CallMsg{To: &contractAddress, Data: data}
	gasLimit, err := client.EstimateGas(context.Background(), msg)
	if err != nil {
		gasLimit = uint64(60000) // fallback
	}

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

	log.Printf("✅ Sent tokens to %s, tx: %s", to, signedTx.Hash().Hex())
	return signedTx.Hash().Hex(), nil
}

// getPrivateKey retrieves the private key from mnemonic or env
func getPrivateKey() (*ecdsa.PrivateKey, error) {
	mnemonic := os.Getenv("MNEMONIC")
	if mnemonic != "" {
		privateKey, err := utils.DerivePrivateKeyFromMnemonic(mnemonic)
		if err != nil {
			return nil, fmt.Errorf("failed to derive private key from mnemonic: %v", err)
		}
		return privateKey, nil
	}

	rawKey := os.Getenv("PRIVATE_KEY")
	if rawKey == "" {
		return nil, fmt.Errorf("neither MNEMONIC nor PRIVATE_KEY is set")
	}

	privateKeyBytes, err := hex.DecodeString(strings.TrimPrefix(rawKey, "0x"))
	if err != nil {
		return nil, fmt.Errorf("invalid PRIVATE_KEY: %v", err)
	}

	return crypto.ToECDSA(privateKeyBytes)
}
