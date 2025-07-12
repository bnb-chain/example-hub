import {
  AgentRuntime,
  Character,
  elizaLogger,
  settings,
  stringToUuid,
  defaultCharacter,
  ModelProviderName,
} from '@elizaos/core';
import { DirectClient } from '@elizaos/client-direct';
import { getTokenForProvider, initializeDatabase, initializeDbCache } from './util.ts';
import path from 'node:path';
import fs from 'node:fs';
import { startChat } from './chat.ts';
import bnbPlugin from '@elizaos/plugin-bnb';

const character = {
  ...defaultCharacter,
  plugins: [bnbPlugin],
  modelProvider: ModelProviderName.OPENAI,
};

export function createAgent(character: Character, db: any, cache: any, token: string) {
  elizaLogger.success(elizaLogger.successesTitle, 'Creating runtime for character', character.name);

  return new AgentRuntime({
    databaseAdapter: db,
    token,
    modelProvider: character.modelProvider,
    evaluators: [],
    character,
    plugins: character.plugins || [], // Fixed: Use character.plugins instead of empty array
    providers: [],
    actions: [],
    services: [],
    managers: [],
    cacheManager: cache,
  });
}

const startAgent = async () => {
  const directClient = new DirectClient();
  const serverPort = parseInt(settings.SERVER_PORT || '3000');

  character.id ??= stringToUuid(character.name);
  character.username ??= character.name;

  const token = getTokenForProvider(character.modelProvider, character);

  const dataDir = path.join(import.meta.dirname, '../data');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const db = initializeDatabase(dataDir);

  await db.init();

  const cache = initializeDbCache(character, db);
  const runtime = createAgent(character, db, cache, token);
  await runtime.initialize();

  directClient.registerAgent(runtime);
  elizaLogger.debug(`Started ${character.name} as ${runtime.agentId}`);

  directClient.start(serverPort);

  elizaLogger.log("Chat started. Type 'exit' to quit.");

  startChat(character);
};

startAgent();
