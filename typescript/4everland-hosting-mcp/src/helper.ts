import fs from "fs";
import path from "path";
import os from "os";
import archiver from "archiver";
import axios from 'axios';
import FormData from "form-data";

// Environment variable names
const ENV_TOKEN = 'TOKEN';
const ENV_API_URL = 'API_URL';
const ENV_TOKEN_VALUE = process.env[ENV_TOKEN] || '';
const ENV_API_URL_VALUE = process.env[ENV_API_URL] || 'https://cli-api.4everland.org';

// API constants
const API_ACCEPT_VERSION = '1.0';
const API_PLATFORM = 'IPFS';
const API_DEPLOY_TYPE = 'CLI';
const API_MODE = '0';
const API_PROJECT_ENDPOINT = '/project';
const API_DEPLOY_ENDPOINT = '/deploy';

// File constants
const ZIP_FILENAME = 'dist.zip';
const TEMP_DIR_PREFIX = 'project-';
const DIST_DIR_NAME = 'dist';
const SUCCESS_CODE = 200;

export async function createProjectStructure(name: string, codeFiles: Record<string, string>): Promise<string> {
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), `${TEMP_DIR_PREFIX}${name}-`));
    const distDir = path.join(tempDir, DIST_DIR_NAME);

    await fs.promises.mkdir(distDir, { recursive: true });

    for (const [filePath, content] of Object.entries(codeFiles)) {
        if (content !== null) {
            const fullPath = path.join(distDir, filePath);
            // Ensure directory exists
            await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
            await fs.promises.writeFile(fullPath, content);
        }
    }

    return tempDir;
}

export async function createZipFromDirectory(directory: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const archive = archiver('zip');
        const chunks: Buffer[] = [];

        archive.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        archive.on('error', (err) => reject(err));
        archive.on('end', () => resolve(Buffer.concat(chunks)));

        archive.directory(directory, false);
        archive.finalize();
    });
}

export async function createProject(name: string, platform: string): Promise<string> {
    const token = ENV_TOKEN_VALUE;
    const apiBaseUrl = ENV_API_URL_VALUE;

    if (!token || !apiBaseUrl) {
        throw new Error(`${ENV_TOKEN} and ${ENV_API_URL} environment variables must be set`);
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('mode', API_MODE);
    formData.append('platform', platform);
    formData.append('deployType', API_DEPLOY_TYPE);

    try {
        const response = await axios.post(`${apiBaseUrl}${API_PROJECT_ENDPOINT}`, formData, {
            headers: {
                'Accept-Version': API_ACCEPT_VERSION,
                'token': token,
                ...formData.getHeaders()
            }
        });

        if (response.data.code === SUCCESS_CODE) {
            return response.data.content.projectId;
        }

        throw new Error(`Failed to create project: ${JSON.stringify(response.data)}`);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(`HTTP error: ${error.message}`);
        }
        throw error;
    }
}

export async function deployProject(projectId: string, zipContent: Buffer): Promise<string> {
    const token = ENV_TOKEN_VALUE;
    const apiBaseUrl = ENV_API_URL_VALUE;

    if (!token || !apiBaseUrl) {
        throw new Error(`${ENV_TOKEN} and ${ENV_API_URL} environment variables must be set`);
    }

    const formData = new FormData();
    formData.append('projectId', projectId);
    formData.append('file', zipContent, { filename: ZIP_FILENAME });

    try {
        const response = await axios.post(`${apiBaseUrl}${API_DEPLOY_ENDPOINT}`, formData, {
            headers: {
                'Accept-Version': API_ACCEPT_VERSION,
                'token': token,
                ...formData.getHeaders()
            }
        });

        if (response.data.code === SUCCESS_CODE) {
            return response.data.content;
        }

        throw new Error(`Failed to deploy project: ${JSON.stringify(response.data)}`);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(`HTTP error: ${error.message}`);
        }
        throw error;
    }
}