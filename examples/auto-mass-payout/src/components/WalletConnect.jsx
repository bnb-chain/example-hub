import React from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { truncateAddress } from "../utils/helpers";

const WalletConnect = ({ isConnected, wallet, onConnect, onDisconnect }) => {
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center space-y-3">
        <Button onClick={onConnect} className="bg-blue-600 hover:bg-blue-700">
          Connect MetaMask
        </Button>
        <p className="text-xs text-gray-500 text-center">
          Make sure you have MetaMask installed
        </p>
      </div>
    );
  }

  const networkName =
    wallet?.chainId === 97
      ? "BSC Testnet"
      : wallet?.chainId === 56
      ? "BSC Mainnet"
      : "Unknown";

  return (
    <div className="flex items-center space-x-3">
      <Card className="p-3">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">{networkName}</span>
          </div>
          <div className="text-sm font-medium">
            {truncateAddress(wallet?.address)}
          </div>
        </div>
      </Card>
      <Button onClick={onDisconnect} variant="outline" size="sm">
        Disconnect
      </Button>
    </div>
  );
};

export default WalletConnect;
