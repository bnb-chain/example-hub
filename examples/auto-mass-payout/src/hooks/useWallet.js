import { useState, useEffect } from "react";
import { ethers } from "ethers";

export const useWallet = () => {
  const [wallet, setWallet] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const connect = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error(
          "MetaMask is not installed. Please install MetaMask to continue."
        );
      }

      // Request account access
      await window.ethereum.request({ method: "eth_requestAccounts" });

      // Create provider and signer
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      // Check if on BSC network
      if (network.chainId !== 56 && network.chainId !== 97) {
        // Try to switch to BSC Testnet
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x61" }], // BSC Testnet
          });
        } catch (switchError) {
          // If BSC Testnet is not added, add it
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: "0x61",
                  chainName: "BSC Testnet",
                  nativeCurrency: {
                    name: "BNB",
                    symbol: "BNB",
                    decimals: 18,
                  },
                  rpcUrls: ["https://data-seed-prebsc-1-s1.binance.org:8545/"],
                  blockExplorerUrls: ["https://testnet.bscscan.com/"],
                },
              ],
            });
          } else {
            throw switchError;
          }
        }

        // Refresh network info after switch
        const newNetwork = await provider.getNetwork();
        setWallet({
          provider,
          signer,
          address,
          chainId: newNetwork.chainId,
        });
      } else {
        setWallet({
          provider,
          signer,
          address,
          chainId: network.chainId,
        });
      }

      setIsConnected(true);

      // Listen for account changes
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);
    } catch (error) {
      setError(error.message);
      console.error("Wallet connection failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    // Remove event listeners
    if (window.ethereum) {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    }

    setWallet(null);
    setIsConnected(false);
    setError(null);
  };

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      disconnect();
    } else {
      // Reconnect with new account
      connect();
    }
  };

  const handleChainChanged = (chainId) => {
    // Reload the page when chain changes
    window.location.reload();
  };

  const switchToNetwork = async (chainId) => {
    if (!window.ethereum) return;

    try {
      const hexChainId = `0x${chainId.toString(16)}`;
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hexChainId }],
      });
    } catch (error) {
      console.error("Failed to switch network:", error);
      throw error;
    }
  };

  // Auto-connect on page refresh if previously connected
  useEffect(() => {
    const autoConnect = async () => {
      if (window.ethereum && window.ethereum.selectedAddress) {
        try {
          await connect();
        } catch (error) {
          console.log("Auto-connect failed:", error);
        }
      }
    };

    autoConnect();
  }, []);

  return {
    wallet,
    isConnected,
    isLoading,
    error,
    connect,
    disconnect,
    switchToNetwork,
  };
};
