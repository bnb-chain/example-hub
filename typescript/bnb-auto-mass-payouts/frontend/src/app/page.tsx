"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  BrowserProvider,
  Contract,
  ContractTransactionReceipt,
  formatUnits,
  isAddress,
  parseUnits,
} from "ethers";
import { massPayoutAbi } from "@/lib/abi/massPayout";
import { erc20Abi } from "@/lib/abi/erc20";
import { appConfig } from "@/lib/config";
import type {
  BatchRecord,
  RecipientInput,
  ScheduleRecord,
  StoredRecipient,
} from "@/types/payout";

declare global {
  interface Window {
    ethereum?: {
      request: (args: {
        method: string;
        params?: unknown[];
      }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (
        event: string,
        handler: (...args: unknown[]) => void
      ) => void;
    };
  }
}

type TokenOption = {
  id: string;
  label: string;
  address: string;
  decimals: number;
  type: "native" | "erc20";
  helper?: string;
};

type PreparedPayload = {
  addresses: string[];
  tokenAmounts: bigint[];
  metadataURI: string;
  total: bigint;
  decimals: number;
  cleaned: RecipientInput[];
};

const createEmptyRow = (): RecipientInput => ({ address: "", amount: "" });

const shorten = (value?: string) =>
  value && value.length > 10
    ? `${value.slice(0, 6)}...${value.slice(-4)}`
    : value ?? "—";

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleString() : "—";

const randomId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

export default function Home() {
  const [recipients, setRecipients] = useState<RecipientInput[]>([
    createEmptyRow(),
  ]);
  const [selectedToken, setSelectedToken] = useState("native");
  const [memo, setMemo] = useState("");
  const [wallet, setWallet] = useState<{ account?: string; chainId?: number }>(
    {}
  );
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);
  const [mode, setMode] = useState<"instant" | "program">("instant");
  const [scheduleTime, setScheduleTime] = useState(() => {
    const defaultTime = new Date(Date.now() + 60 * 60 * 1000)
      .toISOString()
      .slice(0, 16);
    return defaultTime;
  });
  const [csvError, setCsvError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tokens = useMemo<TokenOption[]>(() => {
    const items: TokenOption[] = [
      {
        id: "native",
        label: "Native BNB",
        address: "native",
        decimals: 18,
        type: "native",
        helper: "Funds leave your wallet immediately.",
      },
    ];

    if (appConfig.mockUsdtAddress) {
      items.push({
        id: "usdt",
        label: "Mock USDT (BEP-20)",
        address: appConfig.mockUsdtAddress,
        decimals: 6,
        type: "erc20",
        helper: "Perfect for dry-runs of stable payouts.",
      });
    }

    return items;
  }, []);

  const activeToken = useMemo(
    () => tokens.find((token) => token.id === selectedToken) ?? tokens[0],
    [selectedToken, tokens]
  );

  useEffect(() => {
    const onAccountsChanged = (accounts: string[]) => {
      setWallet((prev) => ({ ...prev, account: accounts?.[0] }));
    };
    const onChainChanged = (chainIdHex: string) => {
      setWallet((prev) => ({ ...prev, chainId: parseInt(chainIdHex, 16) }));
    };

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", onAccountsChanged as (...args: unknown[]) => void);
      window.ethereum.on("chainChanged", onChainChanged as (...args: unknown[]) => void);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", onAccountsChanged as (...args: unknown[]) => void);
        window.ethereum.removeListener("chainChanged", onChainChanged as (...args: unknown[]) => void);
      }
    };
  }, []);

  const fetchBatches = useCallback(async () => {
    try {
      const response = await fetch("/api/batches", { cache: "no-store" });
      if (!response.ok) return;
      const body = await response.json();
      setSupabaseConfigured(Boolean(body?.configured));
      if (Array.isArray(body?.data)) {
        setBatches(body.data);
      }
    } catch (error) {
      console.error("Failed to fetch batches", error);
    }
  }, []);

  const fetchSchedules = useCallback(async () => {
    try {
      const response = await fetch("/api/schedules", { cache: "no-store" });
      if (!response.ok) return;
      const body = await response.json();
      if (Array.isArray(body?.data)) {
        setSchedules(body.data);
      }
    } catch (error) {
      console.error("Failed to fetch schedules", error);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
    fetchSchedules();
  }, [fetchBatches, fetchSchedules]);

  const ensureChain = useCallback(async () => {
    if (!window.ethereum) return;
    const desiredChainHex = `0x${appConfig.chainId.toString(16)}`;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: desiredChainHex }],
      });
      setWallet((prev) => ({ ...prev, chainId: appConfig.chainId }));
    } catch (rawError) {
      const error =
        typeof rawError === "object" && rawError !== null
          ? (rawError as { code?: number })
          : undefined;
      if (error?.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: desiredChainHex,
              chainName: "BNB Smart Chain Testnet",
              rpcUrls: [appConfig.rpcUrl],
              blockExplorerUrls: ["https://testnet.bscscan.com"],
              nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
            },
          ],
        });
      } else {
        throw rawError;
      }
    }
  }, []);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setStatus("Install MetaMask or any EVM wallet to continue.");
      return;
    }

    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const network = await provider.getNetwork();
      const currentChain = Number(network.chainId);
      if (currentChain !== appConfig.chainId) {
        await ensureChain();
      }
      const refreshedNetwork = await provider.getNetwork();
      setWallet({
        account: accounts[0],
        chainId: Number(refreshedNetwork.chainId),
      });
      setStatus("Wallet connected and synced to BNB testnet.");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Wallet connection failed.";
      setStatus(message);
    }
  }, [ensureChain]);

  const totalAmount = useMemo(() => {
    if (!activeToken) return "0";
    try {
      const values = recipients
        .filter((recipient) => recipient.amount.trim())
        .map((recipient) => parseUnits(recipient.amount, activeToken.decimals));
      const total = values.reduce((acc, value) => acc + value, 0n);
      return formatUnits(total, activeToken.decimals);
    } catch {
      return "0";
    }
  }, [activeToken, recipients]);

  const preparePayload = useCallback((): PreparedPayload | null => {
    if (!window.ethereum) {
      setStatus("Wallet not detected.");
      return null;
    }
    if (!appConfig.massPayoutAddress) {
      setStatus("Mass payout contract is not configured yet.");
      return null;
    }
    if (!activeToken) {
      setStatus("Select a token first.");
      return null;
    }

    const cleaned = recipients.filter(
      (entry) => entry.address.trim() && entry.amount.trim()
    );

    if (!cleaned.length) {
      setStatus("Provide at least one recipient.");
      return null;
    }

    if (
      cleaned.some(
        (entry) =>
          !isAddress(entry.address.trim()) || Number(entry.amount) <= 0
      )
    ) {
      setStatus("All addresses must be valid and amounts positive.");
      return null;
    }

    const tokenAmounts = cleaned.map((entry) =>
      parseUnits(entry.amount, activeToken.decimals)
    );
    const addresses = cleaned.map((entry) => entry.address.trim());
    const total = tokenAmounts.reduce((acc, value) => acc + value, 0n);
    const metadataURI = memo || `batch-${randomId()}`;

    return {
      addresses,
      tokenAmounts,
      metadataURI,
      total,
      decimals: activeToken.decimals,
      cleaned,
    };
  }, [activeToken, memo, recipients]);

  const parseSpecificEvent = useCallback(
    (
      receipt: ContractTransactionReceipt | null,
      contract: Contract,
      targetName: string
    ) => {
      if (!receipt) return null;
      try {
        for (const log of receipt.logs) {
          try {
            const parsed = contract.interface.parseLog(log);
            if (parsed?.name === targetName) {
              return parsed;
            }
          } catch {
            continue;
          }
        }
      } catch {
        // ignore
      }
      return null;
    },
    []
  );

  const persistBatch = useCallback(
    async (payload: {
      batchId: string;
      metadataURI: string;
      token: string;
      tokenType: string;
      totalWei: string;
      humanTotal: string;
      count: number;
      txHash: string;
      payer: string;
      chainId: number;
      recipients: StoredRecipient[];
    }) => {
      try {
        const response = await fetch("/api/batches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          await fetchBatches();
        }
      } catch (error) {
        console.warn("Supabase logging skipped", error);
      }
    },
    [fetchBatches]
  );

  const persistSchedule = useCallback(
    async (payload: {
      scheduleId: string;
      metadataURI: string;
      token: string;
      tokenType: string;
      totalWei: string;
      humanTotal: string;
      executeAfter: string;
      payer: string;
      chainId: number;
      recipients: StoredRecipient[];
    }) => {
      try {
        const response = await fetch("/api/schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          await fetchSchedules();
        }
      } catch (error) {
        console.warn("Supabase schedule logging skipped", error);
      }
    },
    [fetchSchedules]
  );

  const executeMassPayout = async () => {
    const prepared = preparePayload();
    if (!prepared || !activeToken) return;

    setIsSubmitting(true);
    setStatus("Preparing transaction...");

    try {
      const provider = new BrowserProvider(window.ethereum!);
      await ensureChain();
      const signer = await provider.getSigner();
      const account = await signer.getAddress();
      const contract = new Contract(
        appConfig.massPayoutAddress,
        massPayoutAbi,
        signer
      );

      let tx;
      if (activeToken.type === "native") {
        tx = await contract.sendNative(
          prepared.addresses,
          prepared.tokenAmounts,
          prepared.metadataURI,
          {
            value: prepared.total,
          }
        );
      } else {
        const tokenContract = new Contract(activeToken.address, erc20Abi, signer);
        const allowance = await tokenContract.allowance(
          account,
          appConfig.massPayoutAddress
        );
        if (allowance < prepared.total) {
          setStatus("Approving token spend...");
          const approveTx = await tokenContract.approve(
            appConfig.massPayoutAddress,
            prepared.total
          );
          await approveTx.wait();
        }
        setStatus("Dispatching ERC-20 payouts...");
        tx = await contract.sendERC20(
          activeToken.address,
          prepared.addresses,
          prepared.tokenAmounts,
          prepared.metadataURI
        );
      }

      setStatus("Waiting for confirmation...");
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
      setStatus("Payout recorded on-chain.");

      let batchId = prepared.metadataURI;
      const parsed = parseSpecificEvent(receipt, contract, "PayoutExecuted");
      if (parsed?.args?.batchId) {
        batchId = String(parsed.args.batchId);
      }

      await persistBatch({
        batchId,
        metadataURI: prepared.metadataURI,
        token: activeToken.address,
        tokenType: activeToken.type.toUpperCase(),
        totalWei: prepared.total.toString(),
        humanTotal: formatUnits(prepared.total, prepared.decimals),
        count: prepared.cleaned.length,
        txHash: receipt.hash,
        payer: account,
        chainId: appConfig.chainId,
        recipients: prepared.cleaned.map((entry, index) => ({
          address: prepared.addresses[index],
          amount: entry.amount,
          amountWei: prepared.tokenAmounts[index].toString(),
        })),
      });

      setRecipients([createEmptyRow()]);
      setMemo("");
    } catch (error: unknown) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : "Transaction failed";
      setStatus(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const scheduleMassPayout = async () => {
    const prepared = preparePayload();
    if (!prepared || !activeToken) return;

    const executeAfterMs = Date.parse(scheduleTime);
    if (Number.isNaN(executeAfterMs)) {
      setStatus("Pick a valid schedule time.");
      return;
    }
    const executeAfter = Math.floor(executeAfterMs / 1000);
    if (executeAfter <= Math.floor(Date.now() / 1000) + 60) {
      setStatus("Schedule time must be at least one minute from now.");
      return;
    }

    setIsSubmitting(true);
    setStatus("Creating scheduled batch...");

    try {
      const provider = new BrowserProvider(window.ethereum!);
      await ensureChain();
      const signer = await provider.getSigner();
      const account = await signer.getAddress();
      const contract = new Contract(
        appConfig.massPayoutAddress,
        massPayoutAbi,
        signer
      );

      let tx;
      if (activeToken.type === "native") {
        tx = await contract.scheduleNative(
          prepared.addresses,
          prepared.tokenAmounts,
          prepared.metadataURI,
          executeAfter,
          {
            value: prepared.total,
          }
        );
      } else {
        const tokenContract = new Contract(activeToken.address, erc20Abi, signer);
        const allowance = await tokenContract.allowance(
          account,
          appConfig.massPayoutAddress
        );
        if (allowance < prepared.total) {
          setStatus("Approving token vault...");
          const approveTx = await tokenContract.approve(
            appConfig.massPayoutAddress,
            prepared.total
          );
          await approveTx.wait();
        }
        tx = await contract.scheduleERC20(
          activeToken.address,
          prepared.addresses,
          prepared.tokenAmounts,
          prepared.metadataURI,
          executeAfter
        );
      }

      setStatus("Waiting for confirmation...");
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
      setStatus("Payout queued!");

      let scheduleId = prepared.metadataURI;
      const parsed = parseSpecificEvent(
        receipt,
        contract,
        "ScheduledPayoutCreated"
      );
      if (parsed?.args?.scheduleId) {
        scheduleId = String(parsed.args.scheduleId);
      }

      await persistSchedule({
        scheduleId,
        metadataURI: prepared.metadataURI,
        token: activeToken.address,
        tokenType: activeToken.type.toUpperCase(),
        totalWei: prepared.total.toString(),
        humanTotal: formatUnits(prepared.total, prepared.decimals),
        executeAfter: new Date(executeAfter * 1000).toISOString(),
        payer: account,
        chainId: appConfig.chainId,
        recipients: prepared.cleaned.map((entry, index) => ({
          address: prepared.addresses[index],
          amount: entry.amount,
          amountWei: prepared.tokenAmounts[index].toString(),
        })),
      });

      setRecipients([createEmptyRow()]);
      setMemo("");
      setMode("instant");
      fetchSchedules();
    } catch (error: unknown) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : "Scheduling failed";
      setStatus(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = () => {
    if (mode === "instant") {
      executeMassPayout();
    } else {
      scheduleMassPayout();
    }
  };

  const updateRecipient = (
    index: number,
    field: keyof RecipientInput,
    value: string
  ) => {
    setRecipients((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addRecipient = () => setRecipients((prev) => [...prev, createEmptyRow()]);

  const removeRecipient = (index: number) => {
    setRecipients((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleCsvUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const rows = text
        .split(/\r?\n/)
        .map((row) => row.trim())
        .filter(Boolean);
      if (!rows.length) {
        setCsvError("CSV is empty.");
        return;
      }
      const dataRows = rows[0].toLowerCase().includes("address")
        ? rows.slice(1)
        : rows;
      const parsed: RecipientInput[] = dataRows
        .map((line) => line.split(/,|;|\t/).map((item) => item.trim()))
        .filter((cells) => cells.length >= 2)
        .map((cells) => ({ address: cells[0], amount: cells[1] }));
      if (!parsed.length) {
        setCsvError("Could not parse any rows.");
        return;
      }
      setCsvError("");
      setRecipients(parsed);
    } catch (error) {
      setCsvError("Failed to read CSV file.");
      console.error(error);
    } finally {
      event.target.value = "";
    }
  };

  const minScheduleInput = useMemo(() => {
    return new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);
  }, []);

  const actionLabel = mode === "instant" ? "Execute Payout" : "Schedule Payout";

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10">
        <header className="rounded-3xl border border-yellow-200/30 bg-gradient-to-br from-yellow-400/30 via-[#0b0b0b] to-black p-8 shadow-[0_25px_80px_rgba(250,204,21,0.15)]">
          <p className="text-sm uppercase tracking-[0.35em] text-yellow-200">
            BNB Chain Hackathon
          </p>
          <h1 className="mt-4 text-4xl font-semibold text-yellow-50 md:text-5xl">
            Auto-Mass Payouts
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-yellow-50/80">
            Spray BNB or tokens to thousands of recipients instantly or lock
            schedules that fire while you sleep. Upload CSVs, tag your batches
            with human metadata, and keep Supabase + BscScan perfectly in sync.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-sm text-yellow-100/90">
            <span className="rounded-full border border-yellow-200/50 px-4 py-1">
              Chain ID: {appConfig.chainId}
            </span>
            <span className="rounded-full border border-yellow-200/50 px-4 py-1">
              Contract: {shorten(appConfig.massPayoutAddress)}
            </span>
            <button
              onClick={connectWallet}
              className="rounded-full bg-yellow-400 px-5 py-2 font-medium text-black transition hover:bg-yellow-300"
            >
              {wallet.account
                ? `Connected ${shorten(wallet.account)}`
                : "Connect Wallet"}
            </button>
          </div>
          {status && (
            <p className="mt-4 text-sm text-yellow-100/80">{status}</p>
          )}
          {txHash && (
            <a
              href={`https://testnet.bscscan.com/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex text-sm text-yellow-200 underline"
            >
              View transaction on BscScan
            </a>
          )}
        </header>

        <section className="space-y-4 rounded-3xl border border-white/5 bg-black/60 p-6 shadow-xl">
          <div className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-yellow-200/70">
            <button
              onClick={() => setMode("instant")}
              className={`rounded-full px-4 py-2 transition ${mode === "instant"
                ? "bg-yellow-400 text-black"
                : "border border-white/10 text-yellow-100"
                }`}
            >
              Execute now
            </button>
            <button
              onClick={() => setMode("program")}
              className={`rounded-full px-4 py-2 transition ${mode === "program"
                ? "bg-yellow-400 text-black"
                : "border border-white/10 text-yellow-100"
                }`}
            >
              Program payout
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-5 lg:col-span-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm uppercase tracking-[0.25em] text-yellow-100">
                  Token
                </label>
                <select
                  value={selectedToken}
                  onChange={(event) => setSelectedToken(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-white outline-none focus:border-yellow-400"
                >
                  {tokens.map((token) => (
                    <option key={token.id} value={token.id}>
                      {token.label}
                      {token.address !== "native"
                        ? ` (${shorten(token.address)})`
                        : ""}
                    </option>
                  ))}
                </select>
                {activeToken?.helper && (
                  <p className="text-xs text-yellow-100/70">{activeToken.helper}</p>
                )}
              </div>

              <div className="space-y-3 rounded-2xl border border-white/10 bg-black/50 p-4">
                <div className="flex flex-wrap items-center gap-3 text-xs uppercase text-yellow-100/80">
                  <span>Recipients</span>
                  <button
                    onClick={addRecipient}
                    className="rounded-full border border-yellow-300/50 px-3 py-1 text-yellow-200 transition hover:bg-yellow-400/10"
                  >
                    + Add Row
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-full border border-yellow-300/50 px-3 py-1 text-yellow-200 transition hover:bg-yellow-400/10"
                  >
                    Load CSV
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleCsvUpload}
                  />
                </div>

                {csvError && (
                  <p className="text-xs text-red-300">{csvError}</p>
                )}

                <div className="space-y-2">
                  {recipients.map((recipient, index) => (
                    <div
                      key={`recipient-${index}`}
                      className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/30 p-3 text-sm md:flex-row"
                    >
                      <input
                        placeholder="0xRecipient"
                        value={recipient.address}
                        onChange={(event) =>
                          updateRecipient(index, "address", event.target.value)
                        }
                        className="w-full rounded-2xl border border-white/10 bg-transparent px-3 py-2 font-mono text-xs uppercase tracking-wide outline-none focus:border-yellow-300"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          placeholder="Amount"
                          type="number"
                          min="0"
                          step="any"
                          value={recipient.amount}
                          onChange={(event) =>
                            updateRecipient(index, "amount", event.target.value)
                          }
                          className="w-full rounded-2xl border border-white/10 bg-transparent px-3 py-2 font-semibold outline-none focus:border-yellow-300"
                        />
                        <button
                          onClick={() => removeRecipient(index)}
                          className="rounded-full border border-white/20 px-3 py-2 text-xs uppercase tracking-widest text-white/70 transition hover:border-red-400 hover:text-red-300"
                          disabled={recipients.length === 1}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {mode === "program" && (
                <div className="space-y-2 rounded-2xl border border-yellow-400/30 bg-black/40 p-4">
                  <label className="text-xs uppercase tracking-[0.35em] text-yellow-100">
                    Execute after
                  </label>
                  <input
                    type="datetime-local"
                    min={minScheduleInput}
                    value={scheduleTime}
                    onChange={(event) => setScheduleTime(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-white outline-none focus:border-yellow-300"
                  />
                  <p className="text-xs text-yellow-100/70">
                    The contract locks funds immediately and the scheduler runs
                    the transaction once the timestamp is reached.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.35em] text-yellow-100">
                  Metadata / Notes
                </label>
                <textarea
                  value={memo}
                  onChange={(event) => setMemo(event.target.value)}
                  rows={3}
                  placeholder="Example: March vendor cycle, APAC region"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-yellow-300"
                />
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-white/10 bg-black/40 p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-yellow-100">
                  Total ({activeToken.label})
                </p>
                <p className="text-4xl font-semibold text-yellow-200">
                  {totalAmount}
                </p>
                {mode === "program" && (
                  <p className="text-xs text-yellow-100/70">
                    Scheduled for {new Date(scheduleTime).toLocaleString()}
                  </p>
                )}
              </div>
              <button
                onClick={handleAction}
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-yellow-400 px-6 py-3 text-lg font-semibold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Broadcasting..." : actionLabel}
              </button>
              <div className="rounded-2xl border border-white/10 bg-black/50 p-4">
                <h3 className="text-sm font-semibold text-yellow-100">
                  CSV expectations
                </h3>
                <p className="mt-2 text-xs text-yellow-100/80">
                  Columns: <code>address, amount</code>. Values can be comma,
                  semicolon, or tab separated. Download the ready-to-use sample
                  to share with vendors.
                </p>
                <a
                  href="/sample-recipients.csv"
                  className="mt-3 inline-flex text-xs font-semibold text-yellow-300 underline"
                  download
                >
                  Download template
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 rounded-3xl border border-white/5 bg-black/70 p-6 shadow-xl lg:col-span-2">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <h3 className="text-lg font-semibold text-yellow-100">Recent payouts</h3>
              {!supabaseConfigured && (
                <p className="mt-2 text-xs text-orange-200">
                  Configure SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to enable
                  automatic logging.
                </p>
              )}
              {batches.length ? (
                <div className="mt-4 space-y-3">
                  {batches.slice(0, 5).map((batch) => (
                    <div
                      key={batch.batch_id}
                      className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm"
                    >
                      <div className="flex justify-between text-xs text-yellow-100/70">
                        <span>{formatDate(batch.created_at)}</span>
                        <span>{batch.token_type}</span>
                      </div>
                      <p className="mt-1 font-mono text-sm text-yellow-50">
                        {shorten(batch.batch_id)} · {batch.human_total} to {" "}
                        {batch.recipient_count} wallets
                      </p>
                      <a
                        href={`https://testnet.bscscan.com/tx/${batch.tx_hash}`}
                        className="text-xs text-yellow-300 underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {shorten(batch.tx_hash)}
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-yellow-100/70">
                  No batches yet. Broadcast one and the list will refresh
                  instantly.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <h3 className="text-lg font-semibold text-yellow-100">
                Programmed payouts
              </h3>
              {schedules.length ? (
                <div className="mt-4 space-y-3">
                  {schedules.slice(0, 5).map((schedule) => (
                    <div
                      key={schedule.schedule_id}
                      className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm"
                    >
                      <div className="flex justify-between text-xs text-yellow-100/70">
                        <span>
                          Runs {formatDate(schedule.execute_after)}
                        </span>
                        <span>
                          {schedule.executed ? "Executed" : "Pending"}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-sm text-yellow-50">
                        {shorten(schedule.schedule_id)} · {schedule.human_total} ·
                        {" "}
                        {schedule.recipients?.length ?? 0} wallets
                      </p>
                      {schedule.executed_tx && (
                        <a
                          href={`https://testnet.bscscan.com/tx/${schedule.executed_tx}`}
                          className="text-xs text-yellow-300 underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {shorten(schedule.executed_tx)}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-yellow-100/70">
                  Queue a schedule to see it here. The automation worker will
                  run the `/api/run-scheduler` route or your cron job.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border border-white/5 bg-black/70 p-6 shadow-xl">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <h3 className="text-lg font-semibold text-yellow-100">
                Automation checklist
              </h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-yellow-100/80">
                <li>
                  Set <code>SCHEDULER_PRIVATE_KEY</code> + <code>SCHEDULER_RPC_URL</code>
                  on the server.
                </li>
                <li>
                  Hit <code>/api/run-scheduler</code> via cron (Vercel Cron, GitHub
                  Actions, PM2, etc.). Include <code>x-cron-token</code> if you set
                  <code>SCHEDULER_WEBHOOK_TOKEN</code>.
                </li>
                <li>
                  Each run executes up to 5 due schedules and updates Supabase.
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <h3 className="text-lg font-semibold text-yellow-100">
                CSV quick example
              </h3>
              <pre className="mt-3 rounded-xl bg-black/60 p-3 text-xs text-yellow-100 overflow-x-auto">
                address,amount{"\n"}0x742d35Cc6634C0532925a3b844Bc454e4438f44e,150.5{"\n"}0x53d284357ec70cE289D6D64134DfA7EEd37c79C2,20
              </pre>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
