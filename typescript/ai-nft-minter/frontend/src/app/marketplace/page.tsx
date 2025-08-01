// src/app/marketplace/page.tsx

"use client";

import { useState } from 'react';
import Link from 'next/link';
import NFTGrid from '@/components/NFTGrid';
import WalletConnect from '@/components/WalletConnect';

export default function MarketplacePage() {
  const [key, setKey] = useState(0);

  // 强制刷新NFTGrid组件
  const handleRefresh = () => {
    setKey(prev => prev + 1);
  };

  return (
    <main className="min-h-screen bg-gray-900">
      {/* 导航栏 */}
      <nav className="bg-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo和标题 */}
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-xl font-bold text-white hover:text-blue-400 transition-colors">
                AI-NFT Minter
              </Link>
              <span className="text-gray-400">|</span>
              <span className="text-gray-300">Market</span>
            </div>

            {/* 导航链接 */}
            <div className="flex items-center space-x-4">
              <Link 
                href="/" 
                className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Create NFT
              </Link>
              <Link 
                href="/marketplace" 
                className="text-blue-400 px-3 py-2 rounded-md text-sm font-medium bg-blue-500/10"
              >
                Marketplace
              </Link>
              <WalletConnect />
            </div>
          </div>
        </div>
      </nav>

      {/* 主要内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题和描述 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            🎨 AI-NFT Marketplace
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Discover and explore unique AI-generated NFTs created by our community. 
            Each NFT is a one-of-a-kind digital artwork powered by artificial intelligence.
          </p>
        </div>

        {/* 快速操作按钮 */}
        <div className="flex justify-center mb-8">
          <Link
            href="/"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            + Create New NFT
          </Link>
        </div>

        {/* NFT网格组件 */}
        <NFTGrid key={key} className="pb-8" />
      </div>

      {/* 页脚 */}
      <footer className="bg-gray-800 border-t border-gray-700 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 text-sm mb-4 md:mb-0">
              © 2024 AI-NFT Minter. Built for BNB Chain Cookbook Challenge.
            </div>
            <div className="flex space-x-6 text-sm">
              <a 
                href="https://testnet.bscscan.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                BSC Testnet
              </a>
              <a 
                href="https://gateway.pinata.cloud" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                IPFS Gateway
              </a>
              <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                Create NFT
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}