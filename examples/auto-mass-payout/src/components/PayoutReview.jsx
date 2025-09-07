import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./ui/card";
import { Button } from "./ui/button";
import { formatTokenAmount, validateAmount } from "../utils/validation";
import { truncateAddress } from "../utils/helpers";
import contractService from "../services/contractService"; // Use our new contract service

const PayoutReview = ({
  recipients,
  selectedToken,
  wallet,
  onExecute,
  onBack,
}) => {
  const [gasEstimate, setGasEstimate] = useState(null);
  const [serviceFee, setServiceFee] = useState("0");
  const [totalCost, setTotalCost] = useState("0");
  const [isLoading, setIsLoading] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    if (wallet && selectedToken && recipients.length > 0) {
      calculateCosts();
      checkApprovalNeeded();
    }
  }, [wallet, selectedToken, recipients]);

  const calculateCosts = async () => {
    console.log("🔄 Starting cost calculation...");
    setIsLoading(true);

    try {
      // Initialize contract service with wallet
      await contractService.initialize(
        wallet.provider?.provider || window.ethereum
      );

      const payoutData = recipients.map((recipient) => ({
        recipient: recipient.address,
        amount: ethers.utils.parseUnits(
          recipient.amount.toString(),
          selectedToken.decimals || 18
        ),
      }));

      console.log("📊 Payout data prepared:", payoutData.length, "recipients");

      // Get service fee from contract
      const fee = await contractService.getServiceFee();
      const serviceFeeFormatted = ethers.utils.formatEther(fee);
      setServiceFee(serviceFeeFormatted);
      console.log("💰 Service fee loaded:", serviceFeeFormatted, "BNB");

      // Calculate recipient total
      const recipientTotal = recipients.reduce(
        (sum, r) => sum + parseFloat(r.amount),
        0
      );
      console.log("📊 Recipient total:", recipientTotal, selectedToken.symbol);

      // Estimate gas
      let gasEstimate;
      try {
        if (selectedToken.address === "native") {
          // For BNB payouts
          const totalBNBNeeded = await contractService.calculateBNBTotal(
            payoutData
          );
          gasEstimate = await contractService.estimateGas(
            "massPayoutBNB",
            [payoutData],
            {
              value: totalBNBNeeded,
            }
          );
        } else {
          // For token payouts
          gasEstimate = await contractService.estimateGas(
            "massPayoutToken",
            [selectedToken.address, payoutData],
            {
              value: fee,
            }
          );
        }

        const gasPrice = await wallet.provider.getGasPrice();
        const gasCost = gasEstimate.mul(gasPrice);
        const gasCostFormatted = ethers.utils.formatEther(gasCost);
        setGasEstimate(gasCostFormatted);
        console.log("⛽ Gas estimate:", gasCostFormatted, "BNB");

        // Calculate total cost
        if (selectedToken.address === "native") {
          // For BNB: recipient total + service fee + gas
          const totalCostValue =
            recipientTotal +
            parseFloat(serviceFeeFormatted) +
            parseFloat(gasCostFormatted);
          setTotalCost(totalCostValue.toString());
        } else {
          // For tokens: only service fee + gas (in BNB)
          const totalCostValue =
            parseFloat(serviceFeeFormatted) + parseFloat(gasCostFormatted);
          setTotalCost(totalCostValue.toString());
        }
      } catch (gasError) {
        console.warn(
          "⚠️ Gas estimation failed, using fallback:",
          gasError.message
        );

        // Fallback gas estimate
        const fallbackGas = ethers.BigNumber.from("300000");
        const gasPrice = await wallet.provider.getGasPrice();
        const gasCost = fallbackGas.mul(gasPrice);
        const gasCostFormatted = ethers.utils.formatEther(gasCost);
        setGasEstimate(gasCostFormatted);

        // Calculate total cost with fallback
        if (selectedToken.address === "native") {
          const totalCostValue =
            recipientTotal +
            parseFloat(serviceFeeFormatted) +
            parseFloat(gasCostFormatted);
          setTotalCost(totalCostValue.toString());
        } else {
          const totalCostValue =
            parseFloat(serviceFeeFormatted) + parseFloat(gasCostFormatted);
          setTotalCost(totalCostValue.toString());
        }
      }

      console.log("✅ Cost calculation completed");
    } catch (error) {
      console.error("❌ Failed to calculate costs:", error);

      // Fallback values
      setServiceFee("0.001"); // Default service fee from contract
      setGasEstimate("0.002"); // Reasonable gas estimate

      const recipientTotal = recipients.reduce(
        (sum, r) => sum + parseFloat(r.amount),
        0
      );

      if (selectedToken.address === "native") {
        setTotalCost((recipientTotal + 0.001 + 0.002).toString());
      } else {
        setTotalCost("0.003"); // service fee + gas
      }
    } finally {
      setIsLoading(false);
    }
  };

  const checkApprovalNeeded = async () => {
    if (selectedToken.address === "native" || !wallet) {
      setNeedsApproval(false);
      return;
    }

    try {
      const tokenContract = new ethers.Contract(
        selectedToken.address,
        [
          "function allowance(address owner, address spender) view returns (uint256)",
        ],
        wallet.signer
      );

      const totalAmount = recipients.reduce((sum, recipient) => {
        return sum.add(
          ethers.utils.parseUnits(
            recipient.amount.toString(),
            selectedToken.decimals || 18
          )
        );
      }, ethers.BigNumber.from(0));

      // Get contract address
      const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS_TESTNET;
      const allowance = await tokenContract.allowance(
        wallet.address,
        contractAddress
      );

      setNeedsApproval(allowance.lt(totalAmount));
    } catch (error) {
      console.error("Failed to check approval:", error);
      setNeedsApproval(true);
    }
  };

  const handleApprove = async () => {
    if (!wallet) return;

    setIsApproving(true);
    try {
      const tokenContract = new ethers.Contract(
        selectedToken.address,
        [
          "function approve(address spender, uint256 amount) returns (bool)",
          "function balanceOf(address) view returns (uint256)",
        ],
        wallet.signer
      );

      const balance = await tokenContract.balanceOf(wallet.address);
      const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS_TESTNET;
      const tx = await tokenContract.approve(contractAddress, balance);
      await tx.wait();

      setNeedsApproval(false);
    } catch (error) {
      console.error("Approval failed:", error);
      alert("Failed to approve token spending");
    } finally {
      setIsApproving(false);
    }
  };

  const handleExecute = () => {
    const transactionData = {
      recipients,
      selectedToken,
      gasEstimate,
      serviceFee,
      totalCost,
      needsApproval: false,
    };
    onExecute(transactionData);
  };

  const recipientTotal = recipients.reduce(
    (sum, r) => sum + parseFloat(r.amount),
    0
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Review & Confirm Payout</CardTitle>
          <CardDescription>
            Review the details before executing the mass payout transaction
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Payout Summary */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Payout Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-500">Recipients</div>
                <div className="text-xl font-bold text-gray-900">
                  {recipients.length}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Token</div>
                <div className="text-xl font-bold text-gray-900">
                  {selectedToken.symbol}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Total Amount</div>
                <div className="text-xl font-bold text-gray-900">
                  {recipientTotal.toFixed(6)} {selectedToken.symbol}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Service Fee</div>
                <div className="text-xl font-bold text-gray-900">
                  {parseFloat(serviceFee).toFixed(6)} BNB
                </div>
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="border rounded-lg p-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3">
              Cost Breakdown
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Recipients ({recipients.length})
                </span>
                <span>
                  {recipientTotal.toFixed(6)} {selectedToken.symbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Service Fee</span>
                <span>{parseFloat(serviceFee).toFixed(6)} BNB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Estimated Gas</span>
                <span>
                  {gasEstimate
                    ? `${parseFloat(gasEstimate).toFixed(6)} BNB`
                    : "Calculating..."}
                </span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between font-semibold">
                  <span>Total Cost</span>
                  <span>
                    {selectedToken.address === "native"
                      ? `${parseFloat(totalCost).toFixed(6)} BNB`
                      : `${recipientTotal.toFixed(6)} ${
                          selectedToken.symbol
                        } + ${parseFloat(totalCost).toFixed(6)} BNB`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recipients Preview */}
          <div className="border rounded-lg p-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3">
              Recipients ({recipients.length})
            </h3>
            <div className="max-h-60 overflow-y-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Address
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recipients.slice(0, 10).map((recipient, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm font-mono text-gray-600">
                        {truncateAddress(recipient.address)}
                      </td>
                      <td className="px-3 py-2 text-sm text-right text-gray-900">
                        {recipient.amount} {selectedToken.symbol}
                      </td>
                    </tr>
                  ))}
                  {recipients.length > 10 && (
                    <tr>
                      <td
                        colSpan="2"
                        className="px-3 py-2 text-sm text-center text-gray-500"
                      >
                        ... and {recipients.length - 10} more recipients
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Approval Notice */}
          {needsApproval && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-yellow-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Token Approval Required
                  </h3>
                  <p className="mt-1 text-sm text-yellow-700">
                    You need to approve the contract to spend your{" "}
                    {selectedToken.symbol} tokens before executing the payout.
                  </p>
                  <div className="mt-3">
                    <Button
                      onClick={handleApprove}
                      disabled={isApproving}
                      size="sm"
                      className="bg-yellow-600 hover:bg-yellow-700"
                    >
                      {isApproving
                        ? "Approving..."
                        : `Approve ${selectedToken.symbol}`}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Debug Info */}
          {process.env.NODE_ENV === "development" && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs">
              <h4 className="font-semibold mb-2">Debug Info:</h4>
              <div>
                Contract Address:{" "}
                {import.meta.env.VITE_CONTRACT_ADDRESS_TESTNET}
              </div>
              <div>Service Fee: {serviceFee} BNB</div>
              <div>Gas Estimate: {gasEstimate || "Loading..."} BNB</div>
              <div>Total Cost: {totalCost} BNB</div>
              <div>Is Loading: {isLoading.toString()}</div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back to Token Selection
          </Button>
          <Button
            onClick={handleExecute}
            disabled={needsApproval || isLoading || !gasEstimate}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading
              ? "Calculating..."
              : `Execute Payout (${recipients.length} recipients)`}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PayoutReview;
