// index.ts
// Entrypoint for Quick Test Swap Example
import { quoteBNBToCAKE, swapBNBToCAKE } from "./onchain";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const argv = yargs(hideBin(process.argv))
  .option("amount", { type: "string", demandOption: true })
  .option("slippage", { type: "number", default: 0.5 })
  .option("execute", { type: "boolean", default: false })
  .parseSync();

async function main() {
  console.log("➡️ Testnet mode (PancakeSwap V2 Router on BSC Testnet)");

  if (!argv.execute) {
    await quoteBNBToCAKE(argv.amount, argv.slippage);
    console.log("ℹ️ Dry run only. Add --execute true to send the transaction.");
  } else {
    await swapBNBToCAKE(argv.amount, argv.slippage);
  }
}

main();
