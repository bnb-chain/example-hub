// src/components/WalletConnect.tsx

"use client";

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { metaMask } from 'wagmi/connectors';

export default function WalletConnect() {
  const { address, isConnected } = useAccount(); // 获取账户信息
  const { connect } = useConnect(); // 获取连接函数
  const { disconnect } = useDisconnect(); // 获取断开连接函数
  const [mounted, setMounted] = useState(false);

  // 解决hydration问题
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="px-4 py-2 bg-gray-600 text-white rounded-md">
        Loading...
      </div>
    );
  }

  if (isConnected) {
    return (
      <div>
        <p>Connected as: {`${address?.slice(0, 6)}...${address?.slice(-4)}`}</p>
        <button 
          onClick={() => disconnect()}
          className="px-4 py-2 bg-red-500 text-white rounded-md"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button 
      onClick={() => connect({ connector: metaMask() })}
      className="px-4 py-2 bg-blue-500 text-white rounded-md"
    >
      Connect Wallet
    </button>
  );
}