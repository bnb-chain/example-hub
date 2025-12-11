import { Contract, WebSocketProvider, formatEther, formatUnits } from 'ethers';
import { EmbedBuilder, Channel, TextChannel, DMChannel, NewsChannel, ChannelType } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { AppConfig, MonitorFilter, TokenMonitorConfig, EventData } from './types.js';

// Network ID to Name mapping
const NETWORK_MAP: Record<number, string> = { 56: 'BSC', 204: 'opBNB' };

// Standard ERC20/BEP20 ABI for symbol, decimals, and Transfer event
const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

type SendableChannel = TextChannel | DMChannel | NewsChannel;

// Utility function: Normalizes address to lowercase to avoid checksum mismatch issues.
const normalizeAddr = (addr: string) => addr ? addr.toLowerCase() : '';

export class MonitorService {
  private channel: SendableChannel | null = null;
  private config: AppConfig;
  private bnbLogStream: fs.WriteStream | null = null;
  private tokenLogStream: fs.WriteStream | null = null;

  constructor(config: AppConfig, channel: Channel | undefined) {
    this.config = config;

    // Initialize Discord channel
    if (this.isSendableChannel(channel)) {
      this.channel = channel;
      console.log('MonitorService: Discord channel initialized successfully.');
    } else {
      console.error('MonitorService: Invalid or non-sendable Discord channel.');
    }

    this.initLogStreams();
  }

  // Type guard for Discord channel
  private isSendableChannel(channel: Channel | null | undefined): channel is SendableChannel {
    if (!channel) return false;
    return channel && [ChannelType.GuildText, ChannelType.DM, ChannelType.GuildAnnouncement].includes(channel.type);
  }

  private initLogStreams() {
    if (!this.config.csv_log.enable) return;

    const { path: logPath, bnb_logname, bep20_logname } = this.config.csv_log;

    if (!fs.existsSync(logPath)) {
      fs.mkdirSync(logPath, { recursive: true });
    }

    // Initialize Native Coin (BNB) log stream
    if (bnb_logname) {
      const fullPath = path.join(logPath, bnb_logname);
      const exists = fs.existsSync(fullPath);
      this.bnbLogStream = fs.createWriteStream(fullPath, { flags: 'a' });
      if (!exists) this.bnbLogStream.write('ChainId,ChainName,Amount,Hash,From,To\n');
    }

    // Initialize Token (BEP20) log stream
    if (bep20_logname) {
      const fullPath = path.join(logPath, bep20_logname);
      const exists = fs.existsSync(fullPath);
      this.tokenLogStream = fs.createWriteStream(fullPath, { flags: 'a' });
      if (!exists) this.tokenLogStream.write('ChainId,ChainName,Symbol,Amount,From,To,Hash\n');
    }
  }

  /**
   * Universal filter logic: checks if an event should be processed.
   * Uses OR logic: Pass if it matches any From/To whitelist OR meets the min_value threshold.
   * If no filter is set, it returns false (relies on index.ts's is_filter check).
   */
  private shouldProcess(
    from: string,
    to: string,
    value: number,
    filterConfig: MonitorFilter
  ): boolean {
    const fromLower = normalizeAddr(from);
    const toLower = normalizeAddr(to);

    // 1. Check From whitelist
    if (filterConfig.froms.length > 0) {
      if (filterConfig.froms.map(normalizeAddr).includes(fromLower)) return true;
    }

    // 2. Check To whitelist
    if (filterConfig.tos.length > 0) {
      if (filterConfig.tos.map(normalizeAddr).includes(toLower)) return true;
    }

    // 3. Check min value
    if (filterConfig.min_value > 0 && value >= filterConfig.min_value) return true;

    return false; // Not passed any filter rule
  }

  // Monitor Native Coin (BNB/ETH) transactions
  public async monitorBNB(chainName: string, provider: WebSocketProvider, filter: MonitorFilter) {
    console.log(`Monitoring native coin transfers on ${chainName}...`);
    // Pre-check if any filtering rules are active
    const is_filter_active = filter.froms.length > 0 || filter.tos.length > 0 || filter.min_value > 0;

    provider.on('block', async (blockNumber) => {
      try {
        const block = await provider.getBlock(blockNumber, true); // true: fetch transactions
        if (!block || !block.prefetchedTransactions) return;

        for (const tx of block.prefetchedTransactions) {
          if (!tx.to || tx.value === 0n) continue;

          const bnbVal = Number(formatEther(tx.value));

          // Apply filter logic only if filtering is active
          if (is_filter_active && !this.shouldProcess(tx.from, tx.to, bnbVal, filter)) continue;

          this.processEvent({
            chainId: Number(tx.chainId),
            chainName,
            symbol: 'BNB',
            from: tx.from,
            to: tx.to,
            value: bnbVal.toFixed(4).toString(), // Format value for consistent output
            hash: tx.hash
          });
        }
      } catch (error) {
        console.error(`Error processing block on ${chainName}:`, error);
      }
    });
  }

  // Monitor Token (BEP20/ERC20) Transfer events
  public async monitorBEP20(chainName: string, provider: WebSocketProvider, tokens: TokenMonitorConfig[]) {
    const chainId = this.getChainIdByName(chainName);
    for (const tokenConfig of tokens) {
      try {
        const contract = new Contract(tokenConfig.address, ERC20_ABI, provider);

        const [symbol, decimals] = await Promise.all([
          contract.symbol().catch(() => 'UNKNOWN'),
          contract.decimals().catch(() => 18n)
        ]);

        console.log(`Monitoring token: ${symbol} (${tokenConfig.address.slice(0, 6)}...) on ${chainName}`);

        // Pre-check if any filtering rules are active
        const is_filter_active = tokenConfig.froms.length > 0 || tokenConfig.tos.length > 0 || tokenConfig.min_value > 0;

        // Listen for Transfer event
        contract.on('Transfer', async (from, to, value, eventPayload) => {
          try {
            const formattedVal = formatUnits(value, decimals);
            const numVal = Number(formattedVal);

            // Apply filter logic only if filtering is active
            if (is_filter_active && !this.shouldProcess(from, to, numVal, tokenConfig)) return;

            this.processEvent({
              chainId,
              chainName,
              symbol,
              from,
              to,
              value: numVal.toFixed(4).toString(), // Format value for consistent output
              hash: eventPayload.log.transactionHash
            });
          } catch (e) {
            console.error(`Error processing token event (${symbol}):`, e);
          }
        });
      } catch (e) {
        console.error(`Failed to initialize token contract ${tokenConfig.address}:`, e);
      }
    }
  }

  // Unified event processing: sends alert and writes log
  private processEvent(data: EventData) {
    this.sendDiscordAlert(data);
    this.writeCsv(data);
  }

  private sendDiscordAlert(data: EventData) {
    if (!this.channel) return;

    const scanUrl = data.chainName === 'BSC' ? 'bscscan.com' : 'opbnbscan.com';
    const fromLink = `[${data.from.slice(0, 6)}...${data.from.slice(-4)}](https://${scanUrl}/address/${data.from})`;
    const toLink = `[${data.to.slice(0, 6)}...${data.to.slice(-4)}](https://${scanUrl}/address/${data.to})`;

    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle(`🔔 ${data.symbol} Transfer Alert`)
      .setURL(`https://${scanUrl}/tx/${data.hash}`)
      .setFooter({ text: `Network: ${data.chainName}` })
      .setTimestamp()
      .addFields(
        {
          name: '\u200B', value: [
            `**Amount: **${data.value} ${data.symbol}`,
            `**Hash: **${data.hash}`,
            `**From: **${data.from}`,
            `**To: **${data.to}`
          ].join('\n')
        }
      );

    this.channel.send({ embeds: [embed] }).catch(e => console.error('Discord alert failed:', e));
  }

  private writeCsv(data: EventData) {
    const isNative = data.symbol === 'BNB';
    const stream = isNative ? this.bnbLogStream : this.tokenLogStream;

    // Ensure stream is active and not destroyed
    if (!stream || stream.destroyed) return;

    const line = isNative
      ? `${data.chainId},${data.chainName},${data.value},${data.hash},${data.from},${data.to}\n`
      : `${data.chainId},${data.chainName},${data.symbol},${data.value},${data.from},${data.to},${data.hash}\n`;

    stream.write(line);
  }

  private getChainIdByName(name: string): number {
    for (const [id, n] of Object.entries(NETWORK_MAP)) {
      if (n === name) return Number(id);
    }
    return 0;
  }

  /**
   * Gracefully closes all file write streams (must be called upon exit).
   * Calls stream.end() to ensure all buffered data is written to disk.
   */
  public destory(): void {
    if (this.bnbLogStream && !this.bnbLogStream.destroyed) {
      this.bnbLogStream.end();
      console.log('MonitorService: BNB log stream closed.');
    }
    if (this.tokenLogStream && !this.tokenLogStream.destroyed) {
      this.tokenLogStream.end();
      console.log('MonitorService: Token log stream closed.');
    }
  }
}
