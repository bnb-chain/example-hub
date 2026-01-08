package tests

import (
	"context"
	"math/big"
	"os"
	"testing"
	"time"

	"mcp-bnb-wallet-agent/wallet-mcp/db"
	"mcp-bnb-wallet-agent/wallet-mcp/functions"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/stretchr/testify/assert"
)

func TestSignTransaction(t *testing.T) {
	// Arrange
	bnbChainTestId := "97"
	testUserId := "test_user_341c212cb93b395"
	toAddress := "0x5A2D55362b3ce1Bb5434c16a2aBd923c429a3446"

	mongoClient, err := db.ConnectToDB("mongodb://localhost:27017")
	defer func() {
		if err := mongoClient.Disconnect(context.Background()); err != nil {
			t.Logf("Warning: failed to disconnect from MongoDB: %v", err)
		}
	}()
	if err != nil {
		t.Fatalf("failed to connect to database: %v", err)
	}
	wf := functions.WalletFunctions{
		MongoConnection: mongoClient,
		UserId:          testUserId,
	}
	ctx := context.Background()
	client, err := ethclient.DialContext(ctx, os.Getenv("BNB_RPC"))
	if err != nil {
		t.Fatalf("failed to connect to RPC: %v", err)
	}

	// Act
	amount := big.NewInt(0).Mul(big.NewInt(1e14), big.NewInt(1)) // 0.0001 BNB in wei
	txHash, err := wf.SignTransaction(bnbChainTestId, toAddress, []byte{}, amount)
	if err != nil {
		t.Fatalf("failed to sign transaction: %v", err)
	}

	// Assert
	time.Sleep(8 * time.Second) // Wait for transaction confirmation
	receipt, _ := client.TransactionReceipt(ctx, common.HexToHash(txHash))
	assert.Equal(t, receipt.TxHash.Hex(), txHash)
	assert.Equal(t, receipt.Status, uint64(1))
}
