package functions

import (
	"mcp-bnb-wallet-agent/wallet-mcp/types"
)

// GenerateEndpointTools generates all available MCP tools for wallet operations
func (wf *WalletFunctions) GenerateEndpointTools() []types.ToolInfo {
	var tools []types.ToolInfo

	// Wallet creation tool
	createWalletTool, createWalletHandler := wf.GenerateCreateWalletTool()
	tools = append(tools, types.ToolInfo{Tool: createWalletTool, Handler: createWalletHandler})

	// Wallet read tool
	readWalletTool, readWalletHandler := wf.GenerateReadWalletTool()
	tools = append(tools, types.ToolInfo{Tool: readWalletTool, Handler: readWalletHandler})

	// Transaction signing tool
	signTxTool, signTxHandler := wf.GenerateSignTransactionTool()
	tools = append(tools, types.ToolInfo{Tool: signTxTool, Handler: signTxHandler})

	// Asset transfer tool
	transferTool, transferHandler := wf.GenerateTransferAssetTool()
	tools = append(tools, types.ToolInfo{Tool: transferTool, Handler: transferHandler})

	// Balance check tool
	balanceTool, balanceHandler := wf.GenerateGetWalletBalanceTool()
	tools = append(tools, types.ToolInfo{Tool: balanceTool, Handler: balanceHandler})

	return tools
}
