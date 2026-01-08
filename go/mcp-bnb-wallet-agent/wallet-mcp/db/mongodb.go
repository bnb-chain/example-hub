package db

import (
	"context"
	"fmt"

	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

// MongoDB represents a MongoDB database and collection
type MongoDB struct {
	Database   string
	Collection string
}

// ConnectToDB establishes a connection to MongoDB
func ConnectToDB(uri string) (*mongo.Client, error) {
	client, err := mongo.Connect(options.Client().ApplyURI(uri))
	if err != nil {
		return nil, fmt.Errorf("failed to connect to MongoDB: %w", err)
	}

	// Ping the database to verify connection
	if err := client.Ping(context.Background(), nil); err != nil {
		return nil, fmt.Errorf("failed to ping MongoDB: %w", err)
	}

	return client, nil
}

// Insert inserts a document into the MongoDB collection
func (m *MongoDB) Insert(client *mongo.Client, document interface{}) bool {
	collection := client.Database(m.Database).Collection(m.Collection)
	_, err := collection.InsertOne(context.Background(), document)
	return err == nil
}

// Read reads documents from the MongoDB collection based on a filter
func (m *MongoDB) Read(client *mongo.Client, filter interface{}, result interface{}) bool {
	collection := client.Database(m.Database).Collection(m.Collection)
	cursor, err := collection.Find(context.Background(), filter)
	if err != nil {
		return false
	}
	defer func() {
		if err := cursor.Close(context.Background()); err != nil {
			// Log the error but don't fail the operation
		}
	}()

	if err := cursor.All(context.Background(), result); err != nil {
		return false
	}
	return true
}
