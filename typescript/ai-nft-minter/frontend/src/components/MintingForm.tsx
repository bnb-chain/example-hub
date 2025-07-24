// src/components/MintingForm.tsx

"use client";

import { useState } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';
// 【优化1.1】: 导入 react-textarea-autosize 库
import TextareaAutosize from 'react-textarea-autosize';

// 定义可能的状态，用于UI展示
type Status = 'idle' | 'generating' | 'uploading' | 'minting' | 'success' | 'error';

export default function MintingForm() {
  const { address, isConnected } = useAccount(); // 获取用户账户信息
  const [prompt, setPrompt] = useState(''); // 存储用户输入的 prompt
  const [status, setStatus] = useState<Status>('idle'); // 存储当前流程的状态
  const [errorMessage, setErrorMessage] = useState(''); // 存储错误信息

  const [result, setResult] = useState<{ 
    txHash: string; 
    tokenId: string;
    imageUrl: string;
  } | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!prompt || !isConnected || !address) {
      setErrorMessage('Please enter a prompt and connect your wallet.');
      return;
    }

    // 1. 开始流程，重置状态
    console.log('Starting minting process for address:', address);
    setStatus('generating');
    setErrorMessage('');
    setResult(null);

    try {
      // 2. 准备发送到后端的数据
      const body = JSON.stringify({
        prompt,
        userAddress: address,
      });

      // 3. 发送 fetch 请求到后端
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/mint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: body,
      });

      // 4. 解析后端返回的 JSON 数据
      const data = await response.json();

      // 5. 根据后端响应更新 UI
      if (response.ok && data.success) {
        // 如果成功
        setStatus('success');
        setResult({ 
            txHash: data.txHash, 
            tokenId: data.tokenId,
            imageUrl: data.imageUrl 
          });
        console.log('Minting successful:', data);
      } else {
        // 如果失败
        setStatus('error');
        setErrorMessage(data.error || 'An unknown error occurred.');
        console.error('Minting failed:', data);
      }

    } catch (error) {
      // 捕获网络错误等
      console.error('An error occurred while fetching:', error);
      setStatus('error');
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('A network error or unexpected issue occurred.');
      }
    }
  };

  // 根据状态渲染不同的 UI
  const renderStatus = () => {
    switch (status) {
      case 'generating':
        return <p className="text-yellow-500">1/3: Generating image with AI...</p>;
      case 'uploading':
        return <p className="text-yellow-500">2/3: Uploading to IPFS...</p>;
      case 'minting':
        return <p className="text-yellow-500">3/3: Minting NFT on the blockchain...</p>;
      case 'success':
        return (
          <div className="text-center space-y-4">
            <h3 className="text-xl font-bold text-green-400">✅ Success! Your NFT is Minted!</h3>
            {result?.imageUrl && (
              <div className="flex justify-center">
                <img 
                  src={result.imageUrl} 
                  alt="Generated AI NFT"
                  className="w-64 h-64 rounded-lg shadow-lg object-cover border-2 border-green-500"
                />
              </div>
            )}
            <p className="text-white">Token ID: <span className="font-mono">{result?.tokenId}</span></p>
            <div className="flex justify-center items-center space-x-4 mb-4">
              <a 
                href={result?.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 underline hover:text-blue-300"
              >
                View on IPFS
              </a>
              <a 
                href={`https://testnet.bscscan.com/tx/${result?.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 underline hover:text-blue-300"
              >
                View Transaction
              </a>
            </div>
            
            {/* 查看NFT市场链接 */}
            <div className="flex justify-center">
              <Link
                href="/marketplace"
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                🏪 View NFT Market
              </Link>
            </div>
          </div>
        );
      case 'error':
        return <p className="text-red-500">❌ Error: {errorMessage}</p>;
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-2xl p-8 space-y-6 bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-center text-white">Create Your AI NFT</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 【优化2.1】: 将输入框部分用一个 relative 的 div 包裹 */}
        <div className="relative">
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-1">
            Enter your creative prompt
          </label>
          {/* 【优化1.2】: 将 <textarea> 替换为 <TextareaAutosize> */}
          <TextareaAutosize
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., A futuristic city on Mars with flying cars"
            minRows={3}
            maxRows={10}
            className="w-full px-3 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all pr-10" // 【优化2.2】: 添加 pr-10 给按钮留出空间
            required
          />
          {/* 【优化2.3】: 添加清除按钮 */}
          {prompt && (
            <button
              type="button" // 关键：防止触发表单提交
              onClick={() => setPrompt('')}
              className="absolute top-10 right-3 text-gray-400 hover:text-white transition-colors"
              aria-label="Clear prompt"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        <button
          type="submit"
          disabled={!isConnected || (status !== 'idle' && status !== 'error' && status !== 'success')}
          className="w-full px-4 py-3 font-bold text-white bg-blue-600 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          {isConnected ? 'Generate & Mint NFT' : 'Please Connect Wallet First'}
        </button>
      </form>

      {/* 
        【优化】: 动态调整状态显示区域的高度
        使用 min-h-16 确保在没有内容时也有一个最小高度，
        这样当内容出现时，下方的按钮不会跳动。
      */}
      <div className="mt-4 text-center min-h-16 flex items-center justify-center">
        {renderStatus()}
      </div>
    </div>
  );
}