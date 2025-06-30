import dotenv from "dotenv";
import { Client, GatewayIntentBits, TextChannel } from "discord.js";
import axios from "axios";
import Web3 from "web3";

dotenv.config();

const web3 = new Web3();
const address = process.env.WATCHED_ADDRESS?.toLowerCase() || "";
let lastTxHash: string | null = null;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", () => {
  console.log(`✅ Bot is ready as ${client.user?.tag}`);
  setInterval(checkTransactions, 10000);
});

async function checkTransactions() {
  if (!process.env.BSCSCAN_API_KEY || !address) {
    console.error("❌ Missing environment variables.");
    return;
  }

  try {
    const url = `https://api.bscscan.com/api?module=account&action=txlist&address=${address}&sort=desc&apikey=${process.env.BSCSCAN_API_KEY}`;
    const res = await axios.get(url);
    const txs = (res.data as any).result;

    if (!txs || txs.length === 0) return;

    const latestTx = txs[0];
    if (latestTx.hash !== lastTxHash) {
      lastTxHash = latestTx.hash;

      const isIncoming = latestTx.to?.toLowerCase() === address;
      const direction = isIncoming ? "📥 Incoming" : "📤 Outgoing";
      const valueBNB = web3.utils.fromWei(latestTx.value, "ether");
      const explorer = `https://bscscan.com/tx/${latestTx.hash}`;

      const message = `${direction} transaction detected!
**From:** \`${latestTx.from}\`
**To:** \`${latestTx.to}\`
**Amount:** ${valueBNB} BNB
**Time:** ${new Date(+latestTx.timeStamp * 1000).toLocaleString()}
[🔎 View on BscScan](${explorer})`;

      const channel = await client.channels.fetch(
        process.env.DISCORD_CHANNEL_ID || ""
      );
      if (channel && channel.isTextBased()) {
        (channel as TextChannel).send(message);
      }
    }
  } catch (err: any) {
    console.error("❌ Error:", err.message);
  }
}

client.login(process.env.DISCORD_TOKEN);
