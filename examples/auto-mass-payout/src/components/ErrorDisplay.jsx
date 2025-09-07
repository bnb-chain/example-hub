import React from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";

const ErrorDisplay = ({ error, onRetry, onRefresh }) => {
  if (!error) return null;

  const isMetaMaskError =
    error.includes("MetaMask") || error.includes("disconnected");

  return (
    <Card className="border-red-200 bg-red-50 p-4">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-red-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800">Connection Error</h3>
          <p className="mt-1 text-sm text-red-700">{error}</p>
          <div className="mt-3 flex space-x-3">
            {isMetaMaskError ? (
              <Button
                onClick={onRefresh}
                size="sm"
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                Refresh Page
              </Button>
            ) : (
              <Button
                onClick={onRetry}
                size="sm"
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                Try Again
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ErrorDisplay;
