package functions

import "go.mongodb.org/mongo-driver/v2/mongo"

// WalletFunctions provides wallet operations backed by MongoDB storage
type WalletFunctions struct {
	MongoConnection *mongo.Client
	UserId          string // Unique identifier for the user (e.g., social media ID, email, etc.)
}

// User represents a wallet user in the database
type User struct {
	UserId     string `json:"user_id" bson:"user_id"`         // Unique user identifier
	Username   string `json:"username" bson:"username"`       // Optional username
	PublicKey  string `json:"public_key" bson:"public_key"`   // Ethereum public address
	PrivateKey string `json:"private_key" bson:"private_key"` // Encrypted private key (handle with care!)
}
