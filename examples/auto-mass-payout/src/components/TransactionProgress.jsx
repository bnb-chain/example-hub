import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "./ui/card";
import { Progress } from "./ui/progress";
import { useContract } from "../hooks/useContract";
import { truncateAddress } from "../utils/helpers";

const TransactionProgress = ({
  transactionData,
  recipients,
  selectedToken,
  wallet,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState("preparing");
  const [progress, setProgress] = useState(0);
  const [transactionHash, setTransactionHash] = useState("");
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [fees, setFees] = useState({
    serviceFee: null,
    totalValue: null,
    gasEstimate: null,
  });
  const [debugInfo, setDebugInfo] = useState([]);

  const { contract, executeTransaction } = useContract(wallet);

  const addDebugInfo = (message) => {
    console.log(message);
    setDebugInfo((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  useEffect(() => {
    if (contract && recipients && selectedToken) {
      calculateFeesAndExecute();
    }
  }, [contract]);

  const calculateFeesAndExecute = async () => {
    try {
      setCurrentStep("preparing");
      setProgress(5);
      addDebugInfo("Starting fee calculation...");

      if (!contract) {
        throw new Error("Contract not available");
      }

      if (!recipients || recipients.length === 0) {
        throw new Error("No recipients provided");
      }

      if (!selectedToken) {
        throw new Error("No token selected");
      }

      addDebugInfo(`Preparing payout for ${recipients.length} recipients`);
      addDebugInfo(
        `Selected token: ${selectedToken.symbol} (${selectedToken.address})`
      );

      // Prepare payout data
      const payoutData = recipients.map((recipient, index) => {
        try {
          if (
            !recipient.address ||
            !ethers.utils.isAddress(recipient.address)
          ) {
            throw new Error(
              `Invalid address at index ${index}: ${recipient.address}`
            );
          }
          if (
            !recipient.amount ||
            isNaN(recipient.amount) ||
            parseFloat(recipient.amount) <= 0
          ) {
            throw new Error(
              `Invalid amount at index ${index}: ${recipient.amount}`
            );
          }

          return {
            recipient: recipient.address,
            amount: ethers.utils.parseUnits(
              recipient.amount.toString(),
              selectedToken.decimals
            ),
          };
        } catch (err) {
          throw new Error(
            `Error processing recipient ${index + 1}: ${err.message}`
          );
        }
      });

      addDebugInfo("Payout data prepared successfully");
      setProgress(15);

      // Calculate fees based on token type
      let serviceFee = ethers.constants.Zero;
      let totalValue = ethers.constants.Zero;

      try {
        if (selectedToken.address === "native") {
          addDebugInfo("Calculating BNB payout fees...");

          // For BNB payouts, calculate total including service fee
          try {
            totalValue = await contract.calculateBNBTotal(payoutData);
            addDebugInfo(
              `BNB total calculated: ${ethers.utils.formatEther(
                totalValue
              )} BNB`
            );
          } catch (error) {
            addDebugInfo(`calculateBNBTotal failed: ${error.message}`);
            // Fallback calculation: sum of all amounts + estimated fee
            const payoutSum = payoutData.reduce(
              (sum, payout) => sum.add(payout.amount),
              ethers.constants.Zero
            );
            const estimatedFee = ethers.utils.parseEther("0.001"); // Small estimated fee
            totalValue = payoutSum.add(estimatedFee);
            addDebugInfo(
              `Using fallback calculation: ${ethers.utils.formatEther(
                totalValue
              )} BNB`
            );
          }

          serviceFee = ethers.constants.Zero;
        } else {
          addDebugInfo("Calculating ERC20 token payout fees...");

          // For ERC20 tokens, get service fee separately
          try {
            serviceFee = await contract.serviceFee();
            addDebugInfo(
              `Service fee: ${ethers.utils.formatEther(serviceFee)} BNB`
            );
          } catch (error) {
            addDebugInfo(`serviceFee() call failed: ${error.message}`);
            // Use a reasonable default fee
            serviceFee = ethers.utils.parseEther("0.001"); // 0.001 BNB default
            addDebugInfo(
              `Using default service fee: ${ethers.utils.formatEther(
                serviceFee
              )} BNB`
            );
          }

          totalValue = serviceFee;
        }

        setFees({ serviceFee, totalValue });
        addDebugInfo("Fee calculation completed successfully");
        setProgress(25);

        // Check user's balance
        const userBalance = await wallet.signer.getBalance();
        const userBalanceFormatted = ethers.utils.formatEther(userBalance);
        const totalValueFormatted = ethers.utils.formatEther(totalValue);

        addDebugInfo(`User balance: ${userBalanceFormatted} BNB`);
        addDebugInfo(`Required: ${totalValueFormatted} BNB`);

        if (userBalance.lt(totalValue)) {
          throw new Error(
            `Insufficient BNB balance. Need ${totalValueFormatted} BNB but have ${userBalanceFormatted} BNB`
          );
        }

        // If it's an ERC20 token, also check token balance and allowance
        if (selectedToken.address !== "native") {
          await checkTokenBalanceAndAllowance(payoutData);
        }

        setProgress(35);

        // Execute the payout
        await executePayout(payoutData, totalValue);
      } catch (feeError) {
        addDebugInfo(`Fee calculation failed: ${feeError.message}`);
        throw feeError;
      }
    } catch (error) {
      console.error("Fee calculation and execution failed:", error);
      addDebugInfo(`Error: ${error.message}`);
      setError(error.message);
      setCurrentStep("failed");
    }
  };

  const checkTokenBalanceAndAllowance = async (payoutData) => {
    try {
      addDebugInfo("Checking token balance and allowance...");

      const tokenContract = new ethers.Contract(
        selectedToken.address,
        [
          "function balanceOf(address) view returns (uint256)",
          "function allowance(address,address) view returns (uint256)",
          "function decimals() view returns (uint8)",
        ],
        wallet.signer
      );

      const [balance, allowance] = await Promise.all([
        tokenContract.balanceOf(wallet.address),
        tokenContract.allowance(wallet.address, contract.address),
      ]);

      const totalTokensNeeded = payoutData.reduce(
        (sum, payout) => sum.add(payout.amount),
        ethers.constants.Zero
      );

      const balanceFormatted = ethers.utils.formatUnits(
        balance,
        selectedToken.decimals
      );
      const totalNeededFormatted = ethers.utils.formatUnits(
        totalTokensNeeded,
        selectedToken.decimals
      );
      const allowanceFormatted = ethers.utils.formatUnits(
        allowance,
        selectedToken.decimals
      );

      addDebugInfo(
        `Token balance: ${balanceFormatted} ${selectedToken.symbol}`
      );
      addDebugInfo(
        `Tokens needed: ${totalNeededFormatted} ${selectedToken.symbol}`
      );
      addDebugInfo(`Allowance: ${allowanceFormatted} ${selectedToken.symbol}`);

      if (balance.lt(totalTokensNeeded)) {
        throw new Error(
          `Insufficient ${selectedToken.symbol} balance. Need ${totalNeededFormatted} but have ${balanceFormatted}`
        );
      }

      if (allowance.lt(totalTokensNeeded)) {
        throw new Error(
          `Insufficient allowance. Need to approve ${totalNeededFormatted} ${selectedToken.symbol} for the contract`
        );
      }

      addDebugInfo("Token balance and allowance check passed");
    } catch (error) {
      addDebugInfo(`Token check failed: ${error.message}`);
      throw error;
    }
  };

  const executePayout = async (payoutData, totalValue) => {
    try {
      setCurrentStep("executing");
      setProgress(50);
      addDebugInfo("Executing payout transaction...");

      let txResult;
      if (selectedToken.address === "native") {
        addDebugInfo(
          `Calling massPayoutBNB with value: ${ethers.utils.formatEther(
            totalValue
          )} BNB`
        );
        txResult = await executeTransaction("massPayoutBNB", [payoutData], {
          value: totalValue,
          gasLimit: 500000 + payoutData.length * 50000, // Dynamic gas limit
        });
      } else {
        addDebugInfo(
          `Calling massPayoutToken with service fee: ${ethers.utils.formatEther(
            totalValue
          )} BNB`
        );
        txResult = await executeTransaction(
          "massPayoutToken",
          [selectedToken.address, payoutData],
          {
            value: totalValue,
            gasLimit: 500000 + payoutData.length * 80000, // Higher gas for token transfers
          }
        );
      }

      if (!txResult?.tx) {
        throw new Error("Invalid transaction result");
      }

      setTransactionHash(txResult.tx.hash);
      addDebugInfo(`Transaction submitted: ${txResult.tx.hash}`);
      setCurrentStep("confirming");
      setProgress(70);

      // Wait for confirmation
      addDebugInfo("Waiting for transaction confirmation...");
      const receipt = await txResult.tx.wait();
      addDebugInfo(`Transaction confirmed in block ${receipt.blockNumber}`);

      setCurrentStep("processing");
      setProgress(90);

      // Process results
      await processResults(receipt);
    } catch (error) {
      addDebugInfo(`Execution failed: ${error.message}`);
      throw error;
    }
  };

  const processResults = async (receipt) => {
    try {
      addDebugInfo("Processing payout results...");

      const payoutResults = [];
      const payoutEvents =
        receipt.events?.filter((event) => event.event === "PayoutCompleted") ||
        [];

      addDebugInfo(`Found ${payoutEvents.length} payout events`);

      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        const event = payoutEvents.find(
          (e) =>
            e.args?.recipient?.toLowerCase() === recipient.address.toLowerCase()
        );

        payoutResults.push({
          address: recipient.address,
          amount: recipient.amount,
          success: event ? event.args.success : false,
          transactionHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed?.toString() || "0",
        });
      }

      const successfulPayouts = payoutResults.filter((r) => r.success).length;
      addDebugInfo(
        `Results: ${successfulPayouts}/${payoutResults.length} successful payouts`
      );

      setResults(payoutResults);
      setCurrentStep("completed");
      setProgress(100);

      setTimeout(() => {
        if (onComplete) {
          onComplete(payoutResults);
        }
      }, 2000);
    } catch (error) {
      addDebugInfo(`Result processing failed: ${error.message}`);
      throw error;
    }
  };

  const getStepStatus = (step) => {
    const steps = [
      "preparing",
      "executing",
      "confirming",
      "processing",
      "completed",
    ];
    const currentIndex = steps.indexOf(currentStep);
    const stepIndex = steps.indexOf(step);

    if (currentStep === "failed") return "failed";
    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return (
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">
            ✓
          </div>
        );
      case "active":
        return (
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
          </div>
        );
      case "failed":
        return (
          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">
            ✗
          </div>
        );
      default:
        return <div className="w-6 h-6 bg-gray-300 rounded-full"></div>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Executing Mass Payout</CardTitle>
          <CardDescription>
            Processing payout to {recipients?.length || 0} recipients
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>

          {/* Fee Information */}
          {fees.serviceFee !== null && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm font-medium text-blue-900 mb-2">
                Fee Information
              </div>
              <div className="text-xs space-y-1">
                {selectedToken.address === "native" ? (
                  <div>
                    Total BNB needed (including fees):{" "}
                    {ethers.utils.formatEther(fees.totalValue || "0")} BNB
                  </div>
                ) : (
                  <>
                    <div>
                      Service fee:{" "}
                      {ethers.utils.formatEther(fees.serviceFee || "0")} BNB
                    </div>
                    <div>
                      Plus:{" "}
                      {recipients.reduce(
                        (sum, r) => sum + parseFloat(r.amount || 0),
                        0
                      )}{" "}
                      {selectedToken.symbol}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Current Step */}
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-blue-50 rounded-full px-4 py-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-blue-700">
                {currentStep === "preparing" &&
                  "Calculating fees and preparing..."}
                {currentStep === "executing" && "Executing payout..."}
                {currentStep === "confirming" && "Confirming transaction..."}
                {currentStep === "processing" && "Processing results..."}
                {currentStep === "completed" && "Payout completed!"}
                {currentStep === "failed" && "Transaction failed"}
              </span>
            </div>
          </div>

          {/* Debug Information */}
          {debugInfo.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-900 mb-2">
                Debug Information
              </div>
              <div className="max-h-32 overflow-y-auto">
                {debugInfo.slice(-10).map((info, index) => (
                  <div key={index} className="text-xs text-gray-600 font-mono">
                    {info}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transaction Hash */}
          {transactionHash && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-900 mb-2">
                Transaction Hash
              </div>
              <div className="flex items-center space-x-2">
                <code className="text-xs font-mono bg-white p-2 rounded border flex-1 break-all">
                  {transactionHash}
                </code>
                <a
                  href={`${
                    wallet?.chainId === 97
                      ? "https://testnet.bscscan.com"
                      : "https://bscscan.com"
                  }/tx/${transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-500 text-xs whitespace-nowrap"
                >
                  View on BSCScan
                </a>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-sm font-medium text-red-800 mb-2">
                Transaction Failed
              </div>
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {/* Results Preview */}
          {results.length > 0 && (
            <div className="border rounded-lg p-4">
              <div className="text-sm font-medium text-gray-900 mb-3">
                Results ({results.filter((r) => r.success).length}/
                {results.length} successful)
              </div>
              <div className="max-h-40 overflow-y-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1">Address</th>
                      <th className="text-right py-1">Amount</th>
                      <th className="text-center py-1">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.slice(0, 10).map((result, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-1 font-mono">
                          {truncateAddress(result.address)}
                        </td>
                        <td className="py-1 text-right">{result.amount}</td>
                        <td className="py-1 text-center">
                          {result.success ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <span className="text-red-600">✗</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionProgress;
