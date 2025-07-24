// src/lib/wagmi.ts

import { http, createConfig } from 'wagmi';
import { bscTestnet } from 'wagmi/chains'; // 直接从 wagmi 导入 bscTestnet 链信息
import { metaMask } from 'wagmi/connectors'; // 导入 MetaMask 连接器

// 创建 wagmi 配置
export const config = createConfig({
  chains: [bscTestnet], // 指定我们 DApp 支持的链
  connectors: [
    metaMask(), // 指定我们支持的钱包连接方式，这里是 MetaMask
  ],
  transports: {
    // 为每条链配置一个 transport (通信方式)
    // http() 会创建一个基于 HTTP RPC 的 transport
    [bscTestnet.id]: http(),
  },
});