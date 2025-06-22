require("dotenv").config();
const axios = require("axios");
const Web3 = require("web3");

const apiKey = process.env.BSCSCAN_API_KEY;
const address = process.env.WATCHED_ADDRESS.toLowerCase();

let lastTxHash = null;

async function checkTransactions() {
  try {
    const url = `https://api.bscscan.com/api?module=account&action=txlist&address=${address}&sort=desc&apikey=${apiKey}`;
    const res = await axios.get(url);
    const txs = res.data.result;

    if (!txs || txs.length === 0) return;

    const latestTx = txs[0];
    if (latestTx.hash !== lastTxHash) {
      lastTxHash = latestTx.hash;

      const isIncoming = latestTx.to?.toLowerCase() === address;
      const direction = isIncoming ? "📥 Incoming" : "📤 Outgoing";
      const valueBNB = Web3.utils.fromWei(latestTx.value);

      console.log(`${direction} transaction detected!`);
      console.log(`Hash: ${latestTx.hash}`);
      console.log(`From: ${latestTx.from}`);
      console.log(`To: ${latestTx.to}`);
      console.log(`Value: ${valueBNB} BNB`);
      console.log(
        `Time: ${new Date(latestTx.timeStamp * 1000).toLocaleString()}`
      );
      console.log("---");
    }
  } catch (err) {
    console.error("❌ Error checking txs:", err.message);
  }
}

// Check mỗi 10 giây
setInterval(checkTransactions, 10000);
