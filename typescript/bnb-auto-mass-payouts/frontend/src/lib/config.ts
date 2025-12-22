export const appConfig = {
  massPayoutAddress: process.env.NEXT_PUBLIC_MASS_PAYOUT_ADDRESS ?? "",
  mockUsdtAddress: process.env.NEXT_PUBLIC_USDT_ADDRESS ?? "",
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "97"),
  rpcUrl:
    process.env.NEXT_PUBLIC_RPC_URL ??
    "https://data-seed-prebsc-1-s1.binance.org:8545",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
};
