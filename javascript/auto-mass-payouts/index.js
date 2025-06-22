require("dotenv").config();
const express = require("express");
const { ethers } = require("ethers");

const app = express();
const port = 3000;

app.use(express.json());

const provider = new ethers.JsonRpcProvider(process.env.BSCTEST_RPC);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// ✅ Lấy từ .env
const payoutContractAddress = process.env.PAYOUT_CONTRACT;
const tokenAddress = process.env.TOKEN_ADDRESS;

const abi = [
  "function payout(address token, address[] recipients, uint256[] amounts) external",
];

const payoutContract = new ethers.Contract(payoutContractAddress, abi, wallet);

// POST /payout
app.post("/payout", async (req, res) => {
  try {
    const { recipients, amounts } = req.body;

    if (!recipients || !amounts || recipients.length !== amounts.length) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const parsedAmounts = amounts.map((amount) =>
      ethers.parseUnits(amount.toString(), 18)
    );
    const tx = await payoutContract.payout(
      tokenAddress,
      recipients,
      parsedAmounts
    );
    await tx.wait();

    res.json({ status: "success", txHash: tx.hash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`✅ Backend running at http://localhost:${port}`);
});
