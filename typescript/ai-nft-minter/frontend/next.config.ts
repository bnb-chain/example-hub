// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /**
   * 仅在 `npm run dev` 时生效，用于允许
   * 非同源浏览器访问 `/_next/*` 资源
   */
  allowedDevOrigins: [
    'http://207.180.254.119:3000', // 公网 IP 访问
    'http://localhost:3000',       // 本地回环
    // 如果还有代理域名或其它端口，继续往数组里加
    // 'http://my.example.com:3000',
    // '*.192.168.0.*:3000',
  ],
  
  /**
   * 配置允许的外部图片域名
   */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gateway.pinata.cloud',
        pathname: '/ipfs/**',
      },
      {
        protocol: 'https',
        hostname: '*.mypinata.cloud',
        pathname: '/ipfs/**',
      },
      {
        protocol: 'https',
        hostname: 'ipfs.io',
        pathname: '/ipfs/**',
      },
      {
        protocol: 'https',
        hostname: 'cloudflare-ipfs.com',
        pathname: '/ipfs/**',
      },
      {
        protocol: 'https',
        hostname: 'dweb.link',
        pathname: '/ipfs/**',
      },
    ],
  },
}

export default nextConfig
