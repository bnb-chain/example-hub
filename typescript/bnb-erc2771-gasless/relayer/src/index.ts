import express from "express";
import cors from "cors";
import { ethers } from "ethers";
import dotenv from "dotenv";
import { ForwarderABI } from "./abi";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Anvil Account #0
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const FORWARDER_ADDRESS = process.env.FORWARDER_ADDRESS;

if (!FORWARDER_ADDRESS) {
    console.warn("WARNING: FORWARDER_ADDRESS is not set. Relayer will fail if used.");
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

app.post("/relay", async (req, res) => {
    const { request, signature } = req.body;

    console.log("Received relay request:", request);

    if (!request || !signature) {
        return res.status(400).json({ error: "Missing request or signature" });
    }

    if (!FORWARDER_ADDRESS) {
        return res.status(500).json({ error: "Relayer not configured (FORWARDER_ADDRESS missing)" });
    }

    try {
        const forwarder = new ethers.Contract(FORWARDER_ADDRESS, ForwarderABI, wallet);

        // Verify first (optional, but good practice)
        const valid = await forwarder.verify(request, signature);
        if (!valid) {
            return res.status(400).json({ error: "Invalid signature" });
        }

        // Execute
        const tx = await forwarder.execute(request, signature);
        console.log(`Transaction sent: ${tx.hash}`);

        const receipt = await tx.wait();
        console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

        res.json({ success: true, txHash: tx.hash });
    } catch (error: any) {
        console.error("Relay error:", error);
        res.status(500).json({ error: error.message || "Relay failed" });
    }
});

app.listen(PORT, async () => {
    console.log(`Relayer listening on port ${PORT}`);
    console.log(`Chain ID: ${(await provider.getNetwork()).chainId}`);
    console.log(`Relayer Address: ${wallet.address}`);
});
