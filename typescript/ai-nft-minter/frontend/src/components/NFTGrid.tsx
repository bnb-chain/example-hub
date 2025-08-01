// src/components/NFTGrid.tsx

"use client";

import { useState, useEffect } from 'react';
import NFTCard from './NFTCard';

// NFT数据类型定义 (与NFTCard保持一致)
interface NFTData {
  tokenId: string;
  name: string;
  description: string;
  image: string;
  owner: string;
  shortOwner: string;
  createdAt: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

interface NFTGridProps {
  className?: string;
}

export default function NFTGrid({ className = '' }: NFTGridProps) {
  const [nfts, setNfts] = useState<NFTData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalSupply, setTotalSupply] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // 获取NFT数据 (重置分页)
  const fetchNFTs = async (reset = true) => {
    try {
      if (reset) {
        setLoading(true);
        setCurrentPage(1);
        setNfts([]);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      
      const page = reset ? 1 : currentPage + 1;
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/nfts?page=${page}&limit=4`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        if (reset) {
          setNfts(data.nfts);
        } else {
          setNfts(prev => [...prev, ...data.nfts]);
        }
        setTotalSupply(data.totalSupply);
        setHasMore(data.hasMore);
        if (!reset) {
          setCurrentPage(page);
        }
      } else {
        throw new Error(data.error || 'Failed to fetch NFTs');
      }
    } catch (err) {
      console.error('Error fetching NFTs:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // 加载更多NFT
  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchNFTs(false);
    }
  };

  // 组件挂载时获取数据
  useEffect(() => {
    fetchNFTs();
  }, []);

  // 加载状态
  if (loading) {
    return (
      <div className={`w-full ${className}`}>
        {/* 加载状态标题 */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">NFT Market</h2>
          <p className="text-gray-400">Loading NFTs...</p>
        </div>
        
        {/* 骨架屏 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="bg-gray-800 rounded-lg overflow-hidden animate-pulse">
              <div className="w-full h-48 bg-gray-700"></div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between">
                  <div className="h-4 w-16 bg-gray-700 rounded"></div>
                  <div className="h-4 w-20 bg-gray-700 rounded"></div>
                </div>
                <div className="h-6 w-3/4 bg-gray-700 rounded"></div>
                <div className="flex justify-between">
                  <div className="h-4 w-12 bg-gray-700 rounded"></div>
                  <div className="h-4 w-24 bg-gray-700 rounded"></div>
                </div>
                <div className="flex space-x-2">
                  <div className="h-8 flex-1 bg-gray-700 rounded"></div>
                  <div className="h-8 flex-1 bg-gray-700 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className={`w-full ${className}`}>
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">NFT Market</h2>
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 max-w-md mx-auto">
            <svg className="mx-auto h-12 w-12 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="text-xl font-semibold text-red-400 mb-2">Error Loading NFTs</h3>
            <p className="text-red-300 mb-4">{error}</p>
            <button
              onClick={() => fetchNFTs(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 空状态
  if (nfts.length === 0) {
    return (
      <div className={`w-full ${className}`}>
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">NFT Market</h2>
          <div className="bg-gray-800 rounded-lg p-8 max-w-md mx-auto">
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No NFTs Found</h3>
            <p className="text-gray-400 mb-4">
              There are no NFTs in this collection yet. 
              <br />
              Create your first AI NFT to get started!
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Create NFT
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 正常状态 - 显示NFT网格
  return (
    <div className={`w-full ${className}`}>
      {/* 标题和统计 */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">NFT Market</h2>
        <p className="text-gray-400">
          {totalSupply > 0 ? `Showing ${nfts.length} of ${totalSupply} NFT${totalSupply > 1 ? 's' : ''} in collection` : 'Collection'}
        </p>
        
        {/* 刷新按钮 */}
        <button
          onClick={() => fetchNFTs(true)}
          disabled={loading}
          className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* NFT网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {nfts.map((nft) => (
          <NFTCard key={nft.tokenId} nft={nft} />
        ))}
      </div>

      {/* Load More按钮 */}
      {hasMore && (
        <div className="text-center mt-8">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      {/* 底部信息 */}
      <div className="text-center mt-8">
        <p className="text-gray-500 text-sm">
          Showing {nfts.length} of {totalSupply} NFTs
        </p>
      </div>
    </div>
  );
}