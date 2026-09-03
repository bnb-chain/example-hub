import type { Eip1193Provider } from "ethers";

export type EthereumProvider = Eip1193Provider & {
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

export type RpcError = {
  code: number;
  message?: string;
};

export type InvoicePayload = {
  merchant: string;
  memo: string;
  amount: string;
  amountWei: string;
  processor: string;
  token: string;
  chainId: string;
  invoiceId: string;
  nonce?: string;
};

export const DEFAULT_PROCESSOR = process.env.NEXT_PUBLIC_PAYMENT_PROCESSOR_ADDRESS ?? "";
export const DEFAULT_TOKEN = process.env.NEXT_PUBLIC_STABLECOIN_ADDRESS ?? "";

export const BNB_TESTNET_PARAMS = {
  chainId: "0x61",
  chainName: "BNB Smart Chain Testnet",
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  rpcUrls: ["https://bsc-testnet.drpc.org"],
  blockExplorerUrls: ["https://testnet.bscscan.com"],
};

export const DECIMALS = 18;

export const getErrorMessage = (err: unknown) => {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err && "message" in err && typeof (err as { message?: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return "Unexpected error";
};

export const hasErrorCode = (err: unknown, code: number) => {
  return typeof err === "object" && err !== null && "code" in err && (err as RpcError).code === code;
};
