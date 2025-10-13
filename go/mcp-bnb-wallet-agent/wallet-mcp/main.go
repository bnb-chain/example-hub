package main

import (
	"log"
	"os"

	"mcp-bnb-wallet-agent/wallet-mcp/db"
	"mcp-bnb-wallet-agent/wallet-mcp/functions"

	"github.com/mark3labs/mcp-go/server"
)

func main() {
	// Get MongoDB connection string from environment
	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://localhost:27017"
	}

	// Connect to MongoDB
	client, err := db.ConnectToDB(mongoURI)
	if err != nil {
		log.Fatalf("failed to connect to MongoDB: %v", err)
	}
	log.Println("Connected to MongoDB successfully")

	// Initialize wallet functions
	wf := &functions.WalletFunctions{
		MongoConnection: client,
		UserId:          "", // Will be set per request
	}

	// Create MCP server
	walletMcpServer := server.NewMCPServer(
		"BNB Chain Wallet MCP Server",
		"1.0.0",
		server.WithToolCapabilities(true),
		server.WithLogging(),
	)

	// Register all wallet tools
	for _, toolInfo := range wf.GenerateEndpointTools() {
		walletMcpServer.AddTool(toolInfo.Tool, toolInfo.Handler)
		log.Printf("Registered MCP tool: %s", toolInfo.Tool.Name)
	}

	// Start HTTP server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8085"
	}

	log.Printf("Starting MCP server on port %s...", port)
	http := server.NewStreamableHTTPServer(
		walletMcpServer,
		server.WithEndpointPath("/mcp"),
		server.WithStateLess(true),
	)

	if err := http.Start(":" + port); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
