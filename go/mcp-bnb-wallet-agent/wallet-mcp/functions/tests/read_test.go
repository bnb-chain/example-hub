package tests

import (
	"context"
	"testing"

	"mcp-bnb-wallet-agent/wallet-mcp/db"
	"mcp-bnb-wallet-agent/wallet-mcp/functions"

	"github.com/stretchr/testify/assert"
	"go.mongodb.org/mongo-driver/v2/bson"
)

func TestRead(t *testing.T) {

	mg := db.MongoDB{
		Database:   "User",
		Collection: "Wallet",
	}
	client, err := db.ConnectToDB("mongodb://localhost:27017")

	t.Run("If user exists, the wallet address can be found in the database", func(t *testing.T) {
		// Arrange
		if err != nil {
			t.Fatalf("failed to connect to mongodb: %v", err)
		}
		wf := functions.WalletFunctions{
			MongoConnection: client,
			UserId:          RandomString(15),
		}
		pk, err := wf.CreateWallet()
		if err != nil {
			t.Fatalf("failed to create wallet: %v", err)
		}
		var user []functions.User

		// Act
		ack := mg.Read(wf.MongoConnection, bson.D{{Key: "user_id", Value: wf.UserId}}, &user)

		// Assert
		assert.Equal(t, true, ack)
		assert.Equal(t, pk, user[0].PublicKey)
	})

	t.Cleanup(func() {
		_ = client.Disconnect(context.Background())
	})

}
