import { useState, useCallback, useEffect } from "react";
import { BrowserProvider, formatUnits, parseUnits } from "ethers";

// ERC20 ABI (just balanceOf + transfer + approve)
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

// QrisPaymentVault ABI
const VAULT_ABI = [
  "function settle(address merchant, uint256 amount, string qrisRef) returns (bytes32)",
  "function merchantBalance(address merchant) view returns (uint256)",
  "function totalSettled() view returns (uint256)",
  "function receiptCount() view returns (uint256)",
];

// BSC mainnet BUSD address
const BUSD_ADDRESS = "0xe9e7CEA3DedcA5984780Bafc599bE2b0Fa6fC12";
// BSC testnet BUSD (used if chainId != 56)
const BUSD_TESTNET = "0xe9e7CEA3DedcA5984780Bafc599bE2b0Fa6fC12";

export function useWallet() {
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [busdBalance, setBusdBalance] = useState(null);
  const [vaultContract, setVaultContract] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError("No wallet found. Please install MetaMask.");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const browserProvider = new BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send("eth_requestAccounts", []);
      const network = await browserProvider.getNetwork();
      const signerInstance = await browserProvider.getSigner();

      setAddress(accounts[0]);
      setChainId(Number(network.chainId));
      setProvider(browserProvider);
      setSigner(signerInstance);

      // Get BUSD balance
      const busdAddr =
        Number(network.chainId) === 56 ? BUSD_ADDRESS : BUSD_TESTNET;
      const token = new ethers.Contract(busdAddr, ERC20_ABI, signerInstance);
      const balance = await token.balanceOf(accounts[0]);
      setBusdBalance(formatUnits(balance, 18));
    } catch (err) {
      setError(err.message || "Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  }, []);

  // Listen for account/chain changes
  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccountsChanged = () => {
      setAddress(null);
      setSigner(null);
      setBusdBalance(null);
    };
    const handleChainChanged = () => {
      window.location.reload();
    };
    window.ethereum.on?.("accountsChanged", handleAccountsChanged);
    window.ethereum.on?.("chainChanged", handleChainChanged);
    return () => {
      window.ethereum.removeListener?.(
        "accountsChanged",
        handleAccountsChanged
      );
      window.ethereum.removeListener?.("chainChanged", handleChainChanged);
    };
  }, []);

  // Settle a payment on-chain via QrisPaymentVault
  const settlePayment = useCallback(
    async (vaultAddress, merchantAddress, amountBUSD, qrisRef) => {
      if (!signer) throw new Error("Wallet not connected");

      const busdAddr = Number(chainId) === 56 ? BUSD_ADDRESS : BUSD_TESTNET;
      const token = new ethers.Contract(busdAddr, ERC20_ABI, signer);
      const vault = new ethers.Contract(vaultAddress, VAULT_ABI, signer);

      const amountWei = parseUnits(amountBUSD.toFixed(18), 18);

      // Step 1: Approve vault to spend BUSD
      const approveTx = await token.approve(vaultAddress, amountWei);
      await approveTx.wait();

      // Step 2: Settle payment via vault
      const settleTx = await vault.settle(merchantAddress, amountWei, qrisRef);
      const receipt = await settleTx.wait();

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        receiptId: receipt.logs[0]?.topics[1] || null,
      };
    },
    [signer, chainId]
  );

  return {
    address,
    chainId,
    provider,
    signer,
    busdBalance,
    connecting,
    error,
    connect,
    settlePayment,
  };
}
