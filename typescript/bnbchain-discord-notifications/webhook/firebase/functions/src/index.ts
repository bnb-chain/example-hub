import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import axios from "axios";
import Moralis from "moralis";
import {BigNumber} from "@moralisweb3/core";
import * as dotenv from "dotenv";
dotenv.config();

// Discord Webhook from Firebase env config
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

if (!DISCORD_WEBHOOK_URL) {
  throw new Error("DISCORD_WEBHOOK_URL env variable is not set");
}

// --- ABI definitions ---
const pingedABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "pingCount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "timestamp",
        type: "uint256",
      },
    ],
    name: "Pinged",
    type: "event",
  },
];

const pongedABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "pongCount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "timestamp",
        type: "uint256",
      },
    ],
    name: "Ponged",
    type: "event",
  },
];

// --- Interfaces ---
interface PingedEvent {
  sender: string;
  pingCount: BigNumber;
  timestamp: BigNumber;
}

interface PongedEvent {
  sender: string;
  pongCount: BigNumber;
  timestamp: BigNumber;
}

// --- Pinged Stream ---
export const pingedStream = onRequest(async (req, res) => {
  try {
    const logs = Moralis.Streams.parsedLogs<PingedEvent>({
      ...req.body,
      abi: pingedABI,
    });

    if (!logs.length) {
      res.status(204).send("No Pinged events.");
      return;
    }

    if (!req.body.confirmed) {
      logger.info("Unconfirmed event ignored.");
      res.status(204).send("Unconfirmed event.");
      return;
    }

    for (const log of logs) {
      const message = {
        content:
          "🏓 **Ping** event received!\n" +
          `👤 Sender: \`${log.sender}\`\n` +
          `🔢 Ping #: \`${log.pingCount.toString()}\`\n` +
          `🕒 Time: <t:${log.timestamp.toString()}>`,
      };

      await axios.post(DISCORD_WEBHOOK_URL, message);
    }

    logger.info("Pinged events sent", {count: logs.length});
    res.status(200).send("Pinged events processed.");
  } catch (err) {
    logger.error("Error in pingedStream", err);
    res.status(500).send("Error processing Pinged events.");
  }
});

// --- Ponged Stream ---
export const pongedStream = onRequest(async (req, res) => {
  try {
    const logs = Moralis.Streams.parsedLogs<PongedEvent>({
      ...req.body,
      abi: pongedABI,
    });

    if (!logs.length) {
      res.status(204).send("No Ponged events.");
      return;
    }

    if (!req.body.confirmed) {
      logger.info("Unconfirmed event ignored.");
      res.status(204).send("Unconfirmed event.");
      return;
    }

    for (const log of logs) {
      const message = {
        content:
          "🏓 **Pong** event received!\n" +
          `👤 Sender: \`${log.sender}\`\n` +
          `🔢 Pong #: \`${log.pongCount.toString()}\`\n` +
          `🕒 Time: <t:${log.timestamp.toString()}>`,
      };

      await axios.post(DISCORD_WEBHOOK_URL, message);
    }

    logger.info("Ponged events sent", {count: logs.length});
    res.status(200).send("Ponged events processed.");
  } catch (err) {
    logger.error("Error in pongedStream", err);
    res.status(500).send("Error processing Ponged events.");
  }
});
