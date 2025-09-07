import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import WalletConnect from "./components/WalletConnect";
import FileUpload from "./components/FileUpload";
import TokenSelector from "./components/TokenSelector";
import PayoutReview from "./components/PayoutReview";
import TransactionProgress from "./components/TransactionProgress";
import ExportReport from "./components/ExportReport";
import { Card } from "./components/ui/card";
import { useWallet } from "./hooks/useWallet";
import { useToast } from "./hooks/useToast";

const STEPS = {
  UPLOAD: "upload",
  TOKEN: "token",
  REVIEW: "review",
  EXECUTE: "execute",
  COMPLETE: "complete",
};

function App() {
  const [currentStep, setCurrentStep] = useState(STEPS.UPLOAD);
  const [recipients, setRecipients] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [transactionData, setTransactionData] = useState(null);
  const [payoutResults, setPayoutResults] = useState([]);

  const { wallet, isConnected, connect, disconnect } = useWallet();
  const { showToast } = useToast();

  const handleFileUpload = (data) => {
    setRecipients(data);
    setCurrentStep(STEPS.TOKEN);
    showToast("Recipients loaded successfully", "success");
  };

  const handleTokenSelect = (token) => {
    setSelectedToken(token);
    setCurrentStep(STEPS.REVIEW);
  };

  const handleExecutePayout = async (txData) => {
    setTransactionData(txData);
    setCurrentStep(STEPS.EXECUTE);
  };

  const handlePayoutComplete = (results) => {
    setPayoutResults(results);
    setCurrentStep(STEPS.COMPLETE);
  };

  const handleStartOver = () => {
    setCurrentStep(STEPS.UPLOAD);
    setRecipients([]);
    setSelectedToken(null);
    setTransactionData(null);
    setPayoutResults([]);
  };

  const getStepNumber = (step) => {
    const steps = Object.values(STEPS);
    return steps.indexOf(step) + 1;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  BNB Chain Auto-Payout
                </h1>
                <p className="text-sm text-gray-500">
                  Distribute tokens to 100s of wallets in one click 🚀
                </p>
              </div>
            </div>
            <WalletConnect
              isConnected={isConnected}
              wallet={wallet}
              onConnect={connect}
              onDisconnect={disconnect}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isConnected ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Connect Your Wallet
              </h2>
              <p className="text-gray-600 mb-6">
                Connect your wallet to start distributing tokens to multiple
                recipients on BNB Chain.
              </p>
              <button
                onClick={connect}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                Connect Wallet
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Progress Indicator */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Progress
                </h2>
                <span className="text-sm text-gray-500">
                  Step {getStepNumber(currentStep)} of{" "}
                  {Object.keys(STEPS).length}
                </span>
              </div>
              <div className="flex items-center space-x-4">
                {Object.values(STEPS).map((step, index) => {
                  const isActive = step === currentStep;
                  const isCompleted = getStepNumber(currentStep) > index + 1;
                  return (
                    <div key={step} className="flex items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          isCompleted
                            ? "bg-green-500 text-white"
                            : isActive
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {isCompleted ? "✓" : index + 1}
                      </div>
                      {index < Object.values(STEPS).length - 1 && (
                        <div
                          className={`w-12 h-1 mx-2 ${
                            isCompleted ? "bg-green-500" : "bg-gray-200"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step Content */}
            {currentStep === STEPS.UPLOAD && (
              <FileUpload onUpload={handleFileUpload} />
            )}

            {currentStep === STEPS.TOKEN && (
              <TokenSelector
                recipients={recipients}
                onSelect={handleTokenSelect}
                wallet={wallet}
              />
            )}

            {currentStep === STEPS.REVIEW && (
              <PayoutReview
                recipients={recipients}
                selectedToken={selectedToken}
                wallet={wallet}
                onExecute={handleExecutePayout}
                onBack={() => setCurrentStep(STEPS.TOKEN)}
              />
            )}

            {currentStep === STEPS.EXECUTE && (
              <TransactionProgress
                transactionData={transactionData}
                recipients={recipients}
                selectedToken={selectedToken}
                wallet={wallet}
                onComplete={handlePayoutComplete}
              />
            )}

            {currentStep === STEPS.COMPLETE && (
              <ExportReport
                results={payoutResults}
                selectedToken={selectedToken}
                transactionData={transactionData}
                onStartOver={handleStartOver}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Built for BNB Chain Cookbook Challenge
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <a href="#" className="hover:text-gray-700">
                Documentation
              </a>
              <a href="#" className="hover:text-gray-700">
                Support
              </a>
              <a href="#" className="hover:text-gray-700">
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
