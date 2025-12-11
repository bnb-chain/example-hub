import { WebSocketProvider } from "ethers";
import { Client, GatewayIntentBits } from 'discord.js';
import config from "./config.js";
import { MonitorService } from './service.js';

// Global state variables for resource cleanup on exit
const providers: WebSocketProvider[] = [];
let discordClient: Client | null = null;
let monitorInstance: MonitorService | null = null;

const main = async () => {
  // Check required configuration variables
  if (!config.discord.bot_token || !config.discord.channel_id) {
    console.error('FATAL: Discord Bot Token or Channel ID not configured.');
    process.exit(1);
  }

  // 1. Initialize Discord Client
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
  });
  discordClient = client;


  // 2. Start monitoring only after Discord client is ready
  client.on('ready', () => {
    console.log(`Discord Bot logged in as: ${client.user?.tag}`);
    const channel = client.channels.cache.get(config.discord.channel_id);

    // If channel is not found, terminate the process
    if (!channel) {
      console.error('FATAL: Could not find configured Discord Channel ID.');
      // NOTE: Remove the log below as it can be confusing. The MonitorService constructor already logs success/failure.
      // console.log('频道类型:', channel.type.toString());
      destroy();
      return;
    }

    const monitorService = new MonitorService(config, channel);
    monitorInstance = monitorService;

    // 3. Setup BSC monitoring (Native Coin & Contracts)
    if (config.bsc.bnb_enable || config.bsc.contract_enable) {
      setupProvider('BSC', config.bsc.rpc_wss_url, (provider) => {
        if (config.bsc.bnb_enable) monitorService.monitorBNB('BSC', provider, config.bsc.bnb);
        if (config.bsc.contract_enable) monitorService.monitorBEP20('BSC', provider, config.bsc.contracts);
      });
    }

    // 4. Setup opBNB monitoring (Native Coin & Contracts)
    if (config.opbnb.bnb_enable || config.opbnb.contract_enable) {
      setupProvider('opBNB', config.opbnb.rpc_wss_url, (provider) => {
        if (config.opbnb.bnb_enable) monitorService.monitorBNB('opBNB', provider, config.opbnb.bnb);
        if (config.opbnb.contract_enable) monitorService.monitorBEP20('opBNB', provider, config.opbnb.contracts);
      });
    }
  });

  try {
    await client.login(config.discord.bot_token);
    console.log(`Discord Bot connecting...`);
  } catch (err) {
    console.error('FATAL: Discord login failed.', err);
    process.exit(1);
  }
};


/**
 * Gracefully shuts down all resources (WebSockets, Discord client, File Streams).
 * This function ensures all resources are released before process exit.
 */
const destroy = (): void => {
  console.log('\nShutting down resources and exiting...');

  // 1. Destroy Ethers WebSocket Providers
  providers.forEach((provider) => {
    try {
      provider.removeAllListeners();
      provider.destroy();
      console.log('WebSocket Provider destroyed.');
    } catch (e) {
      console.error('Error destroying Provider:', e);
    }
  });

  // 2. Destroy Discord Client
  if (discordClient && discordClient.isReady()) {
    discordClient.destroy();
    console.log('Discord client closed.');
  }

  // 3. Close MonitorService File Streams
  if (monitorInstance) {
    monitorInstance.destory();
    monitorInstance = null;
  }

  // Ensure process exits gracefully
  process.exit(0);
}

/**
 * Utility function to initialize a WebSocketProvider and handle errors.
 */
const setupProvider = (name: string, url: string, callback: (p: WebSocketProvider) => void) => {
  try {
    const provider = new WebSocketProvider(url);

    // Error handling: Ethers internal errors
    provider.on('error', (error) => {
      console.error(`ERROR [${name}]: Provider error detected.`, error);
      // NOTE: For production, reconnect logic should be implemented here.
    });

    // NOTE: WebSocket close handling is crucial but was missing in the original code.
    // It should be added here for a robust solution (using provider.websocket.onclose).

    console.log(`Connected to ${name} RPC node.`);
    providers.push(provider);
    callback(provider);
  } catch (error) {
    console.error(`FATAL: Failed to connect to ${name}.`, error);
    process.exit(1);
  }
};

main();

// Process Signal Handling
// 1. Uncaught synchronous exceptions
process.on('uncaughtException', (err) => {
  console.error('FATAL: Uncaught Exception detected!', err);
  destroy();
});

// 2. Unhandled Promise rejections (asynchronous errors)
process.on('unhandledRejection', (reason, promise) => {
  console.error('FATAL: Unhandled Promise Rejection detected!', reason);
  destroy();
});

// 3. Interrupt and Termination signals (Ctrl+C, kill command)
['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, () => {
    console.log(`\nTermination signal ${signal} received. Shutting down.`);
    destroy();
  });
});
