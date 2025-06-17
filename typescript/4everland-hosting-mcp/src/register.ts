import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import * as fs from 'fs';
import * as path from 'path';
import {z} from 'zod';
import {createProject, createProjectStructure, createZipFromDirectory, deployProject} from "./helper.js";

export interface IRegister {
    server: McpServer;
}

export const register = ({server}: IRegister) => {
    server.tool(
        "deploy_site",
        "Deploy site to 4EVERLAND hosting",
        {
            code_files: z.record(z.string()).describe("Map of file paths to their content"),
            project_name: z.string().regex(/^[a-zA-Z0-9_][-a-zA-Z0-9_]*[a-zA-Z0-9_]$|^[a-zA-Z0-9_]$/).describe("Name of the project (alphanumeric, underscore, and hyphen; cannot start or end with hyphen)"),
            project_id: z.string().optional().describe("Optional project ID to deploy to. If not provided, a new project will be created."),
            platform: z.enum(["IPFS", "AR", "IC", "GREENFIELD"]).default("IPFS").describe("Storage platform to deploy to"),
        },
        async ({code_files, project_name, project_id, platform}, extra) => {
            try {
                const tempDir = await createProjectStructure(project_name, code_files);
                const zipContent = await createZipFromDirectory(path.join(tempDir, 'dist'));

                project_id = project_id || await createProject(project_name, platform);
                const deploy_info = await deployProject(project_id, zipContent);

                // Cleanup temp directory
                await fs.promises.rm(tempDir, {recursive: true, force: true});

                return {
                    content: [
                        {
                            type: "text",
                            text: `Project deployed successfully `
                        }
                    ],
                    deploy_info,
                    project_id: project_id,
                    status: "success"
                };
            } catch (error) {
                console.error("Failed to deploy code:", error);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to deploy: ${error instanceof Error ? error.message : String(error)}`
                        }
                    ],
                    status: "error"
                };
            }
        }
    )
};







