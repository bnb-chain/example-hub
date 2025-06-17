#!/usr/bin/env node

import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {register} from "./register.js";

// Create server instance
const server: McpServer = new McpServer({
    name: "4EVERLAND Hosting",
    version: "0.1.3",
    capabilities: {
        resources: {},
        tools: {},
    },
});

register({server});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`4EVERLAND Hosting MCP Server running on stdio`);
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});