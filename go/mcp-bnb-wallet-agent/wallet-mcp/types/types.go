package types

import (
	"context"
	"github.com/mark3labs/mcp-go/mcp"
)

// ToolInfo represents an MCP tool with its handler function
type ToolInfo struct {
	Tool    mcp.Tool
	Handler func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error)
}
