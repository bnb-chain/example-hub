import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { COMMON_TOKENS } from "../utils/constants";
import { formatTokenAmount } from "../utils/validation";

const TokenSelector = ({ recipients, onSelect, wallet }) => {
  const [selectedToken, setSelectedToken] = useState(null);
  const [customToken, setCustomToken] = useState("");
  const [tokenBalance, setTokenBalance] = useState(null);
  const [totalAmount, setTotalAmount] = useState("0");
  const [isLoading, setIsLoading] = useState(false);

  const availableTokens = COMMON_TOKENS[wallet?.chainId] || [];

  useEffect(() => {
    if (recipients.length > 0) {
      const total = recipients.reduce((sum, recipient) => {
        return sum + parseFloat(recipient.amount || 0);
      }, 0);
      setTotalAmount(total.toString());
    }
  }, [recipients]);

  useEffect(() => {
    if (selectedToken && wallet) {
      fetchTokenBalance();
    }
  }, [selectedToken, wallet]);

  const fetchTokenBalance = async () => {
    if (!selectedToken || !wallet.signer) return;

    setIsLoading(true);
    try {
      if (selectedToken.address === "native" || selectedToken.isNative) {
        // For native tokens (tBNB on testnet, BNB on mainnet)
        const balance = await wallet.signer.getBalance();
        setTokenBalance(ethers.utils.formatEther(balance));
      } else {
        // For ERC20 tokens
        const tokenContract = new ethers.Contract(
          selectedToken.address,
          [
            "function balanceOf(address) view returns (uint256)",
            "function decimals() view returns (uint8)",
            "function symbol() view returns (string)",
          ],
          wallet.signer
        );
        const balance = await tokenContract.balanceOf(wallet.address);
        const decimals = await tokenContract.decimals();
        setTokenBalance(ethers.utils.formatUnits(balance, decimals));
      }
    } catch (error) {
      console.error("Failed to fetch token balance:", error);
      setTokenBalance("0");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenSelect = (token) => {
    setSelectedToken(token);
  };

  const handleCustomTokenAdd = async () => {
    if (!ethers.utils.isAddress(customToken)) {
      alert("Invalid token address");
      return;
    }

    try {
      const tokenContract = new ethers.Contract(
        customToken,
        [
          "function symbol() view returns (string)",
          "function name() view returns (string)",
          "function decimals() view returns (uint8)",
        ],
        wallet.provider
      );

      const [symbol, name, decimals] = await Promise.all([
        tokenContract.symbol(),
        tokenContract.name(),
        tokenContract.decimals(),
      ]);

      const token = {
        address: customToken,
        symbol,
        name,
        decimals,
        logo: "🪙",
        isNative: false,
        description: "Custom ERC20 Token",
      };

      handleTokenSelect(token);
    } catch (error) {
      alert(
        "Failed to load token information. Please check the contract address."
      );
    }
  };

  const handleProceed = () => {
    if (selectedToken) {
      onSelect(selectedToken);
    }
  };

  const isBalanceSufficient =
    tokenBalance && parseFloat(tokenBalance) >= parseFloat(totalAmount);
  const currentNetwork = wallet?.chainId === 97 ? "BSC Testnet" : "BSC Mainnet";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Token</CardTitle>
          <CardDescription>
            Choose the token you want to distribute to {recipients.length}{" "}
            recipients on {currentNetwork}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Network Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-blue-800">
                Connected to {currentNetwork}
              </span>
            </div>
          </div>

          {/* Common Tokens */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Available Tokens on {currentNetwork}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableTokens.map((token) => (
                <button
                  key={token.symbol}
                  onClick={() => handleTokenSelect(token)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedToken?.address === token.address
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{token.logo}</div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 flex items-center space-x-2">
                        <span>{token.symbol}</span>
                        {token.isNative && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            Native
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{token.name}</div>
                      {token.description && (
                        <div className="text-xs text-gray-400 mt-1">
                          {token.description}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Token */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Add Custom ERC20 Token
            </h3>
            <div className="flex space-x-3">
              <Input
                placeholder="Enter token contract address (0x...)"
                value={customToken}
                onChange={(e) => setCustomToken(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleCustomTokenAdd}
                disabled={!customToken || !ethers.utils.isAddress(customToken)}
                variant="outline"
              >
                Add Token
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Only add tokens you trust. Verify the contract address before
              adding.
            </p>
          </div>

          {/* Selected Token Info */}
          {selectedToken && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">{selectedToken.logo}</div>
                  <div>
                    <div className="font-medium text-gray-900 flex items-center space-x-2">
                      <span>{selectedToken.name}</span>
                      {selectedToken.isNative && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                          Native
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {selectedToken.symbol}
                    </div>
                    {selectedToken.description && (
                      <div className="text-xs text-gray-400">
                        {selectedToken.description}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Your Balance</div>
                  <div
                    className={`font-medium ${
                      isBalanceSufficient ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                        <span>Loading...</span>
                      </div>
                    ) : (
                      `${parseFloat(tokenBalance || 0).toFixed(6)} ${
                        selectedToken.symbol
                      }`
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Recipients</div>
                    <div className="font-medium">{recipients.length}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Total Amount</div>
                    <div className="font-medium">
                      {totalAmount} {selectedToken.symbol}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Token Type</div>
                    <div className="font-medium">
                      {selectedToken.isNative ? "Native" : "ERC20"}
                    </div>
                  </div>
                </div>
              </div>

              {!isBalanceSufficient && tokenBalance && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <div className="text-sm text-red-800">
                    ⚠️ Insufficient balance. You need {totalAmount}{" "}
                    {selectedToken.symbol} but only have{" "}
                    {parseFloat(tokenBalance).toFixed(6)} {selectedToken.symbol}
                  </div>
                  {selectedToken.isNative && wallet?.chainId === 97 && (
                    <div className="mt-2">
                      <a
                        href="https://testnet.binance.org/faucet-smart"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-500 text-sm underline"
                      >
                        Get free tBNB from BSC Testnet Faucet
                      </a>
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={handleProceed}
                className="w-full"
                disabled={!isBalanceSufficient || isLoading}
              >
                {isLoading
                  ? "Checking Balance..."
                  : `Continue with ${selectedToken.symbol} ${
                      selectedToken.isNative ? "(Native)" : "(ERC20)"
                    }`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TokenSelector;
