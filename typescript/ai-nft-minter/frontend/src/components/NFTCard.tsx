// src/components/NFTCard.tsx

"use client";

import { useState } from 'react';
import Image from 'next/image';

// NFT数据类型定义
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

interface NFTCardProps {
  nft: NFTData;
}

export default function NFTCard({ nft }: NFTCardProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // 格式化时间显示
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'Asia/Shanghai'
      });
    } catch (error) {
      return 'Unknown';
    }
  };

  // 处理图片加载错误
  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  // 处理图片加载完成
  const handleImageLoad = () => {
    setImageLoading(false);
  };

  // 截断名称显示
  const truncateName = (name: string, maxLength: number = 30) => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 hover:scale-105 transform transition-transform">
      {/* NFT图片容器 */}
      <div className="relative w-full h-48 bg-gray-700">
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {imageError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
            <div className="text-center text-gray-400">
              <svg className="mx-auto h-12 w-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">Image not available</p>
            </div>
          </div>
        ) : (
          <Image
            src={nft.image}
            alt={nft.name}
            fill
            className="object-cover"
            onLoad={handleImageLoad}
            onError={handleImageError}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            loading="lazy"
            quality={75}
          />
        )}
      </div>

      {/* NFT信息容器 */}
      <div className="p-4 space-y-3">
        {/* Token ID */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-mono text-blue-400">
            #{nft.tokenId.padStart(3, '0')}
          </span>
          <span className="text-xs text-gray-400">
            {formatDate(nft.createdAt)}
          </span>
        </div>

        {/* NFT名称 */}
        <h3 className="text-lg font-semibold text-white leading-tight">
          {truncateName(nft.name)}
        </h3>

        {/* 所有者信息 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Owner:</span>
          <span className="text-sm font-mono text-gray-300">
            {nft.shortOwner}
          </span>
        </div>

        {/* 属性标签 (如果有的话) */}
        {nft.attributes && nft.attributes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {nft.attributes.slice(0, 2).map((attr, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded-full"
              >
                {attr.trait_type}: {attr.value}
              </span>
            ))}
            {nft.attributes.length > 2 && (
              <span className="px-2 py-1 text-xs bg-gray-700 text-gray-400 rounded-full">
                +{nft.attributes.length - 2} more
              </span>
            )}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex space-x-2 pt-2">
          <button
            onClick={() => window.open(nft.image, '_blank')}
            className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            View IPFS
          </button>
          <button
            onClick={() => {
              // 跳转到BSCScan上的Token详情页面
              const bscScanUrl = `https://testnet.bscscan.com/token/${process.env.NEXT_PUBLIC_CONTRACT_ADDRESSS}?a=${nft.tokenId}`;
              window.open(bscScanUrl, '_blank');
            }}
            className="flex-1 px-3 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Details
          </button>
        </div>
      </div>
    </div>
  );
}