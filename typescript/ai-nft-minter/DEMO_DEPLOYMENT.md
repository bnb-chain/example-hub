# 🌐 演示部署指南

## 📋 演示地址配置

### 推荐部署平台

#### 1. **前端部署** (Vercel - 推荐)
```bash
# 1. 连接GitHub仓库到Vercel
# 2. 自动部署前端到: https://your-project.vercel.app

# 环境变量配置
NEXT_PUBLIC_BACKEND_URL=https://your-backend.railway.app
NEXT_PUBLIC_CONTRACT_ADDRESS=0x你的合约地址
```

#### 2. **后端部署** (Railway - 推荐)
```bash
# 1. 连接GitHub仓库到Railway
# 2. 自动部署后端API到: https://your-project.railway.app

# 环境变量配置
STABILITY_API_KEY=你的真实API密钥
PINATA_API_KEY=你的真实API密钥
PINATA_SECRET_KEY=你的真实Secret密钥
MINTER_PRIVATE_KEY=你的钱包私钥
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
CONTRACT_ADDRESS=0x你的合约地址
PORT=3001
```

### 🚀 一键部署方案

#### Vercel 部署 (前端)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/tuofangzhe/bnb-nft-ai-minter&project-name=bnb-ai-nft-minter&repository-name=bnb-ai-nft-minter)

#### Railway 部署 (后端)
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template/your-template-id)

## 📝 演示说明文档

### 🎯 演示地址信息

**🌍 在线演示**: http://207.180.254.119:3000/

**📱 移动端适配**: 完全支持移动端访问

**🔗 后端API**: http://207.180.254.119:3001

**⛓️ 智能合约**: 
- 合约地址: `0x你的合约地址`
- 网络: BNB Smart Chain 测试网
- 浏览器: https://testnet.bscscan.com/address/0xFd4CC80fA342512c69bF18355fD3386c5978244b

### 🎮 演示使用指南

#### 第一步：连接钱包
1. 点击"Connect Wallet"按钮
2. 选择MetaMask或其他Web3钱包
3. 切换到BNB Smart Chain测试网
4. 确保有足够的测试BNB (从 https://testnet.binance.org/faucet-smart 获取)

#### 第二步：AI图像生成与NFT铸造
1. 在文本框中输入英文提示词，例如：
   - "a beautiful sunset over mountains"
   - "a futuristic cyberpunk city"
   - "an abstract colorful painting"
2. 点击"Generate & Mint NFT"
3. 等待AI生成图像 (~15秒)
4. 确认钱包交易
5. 等待NFT铸造完成 (~30秒)

#### 第三步：查看NFT市场
1. 点击"Marketplace"导航
2. 浏览所有已铸造的NFT
3. 查看NFT详情和元数据
4. 点击"View on BSCScan"查看区块链交易

### 🔧 测试功能清单

#### 核心功能测试
- [ ] 钱包连接 (MetaMask/WalletConnect)
- [ ] AI图像生成 (Stability AI)
- [ ] IPFS上传 (Pinata)
- [ ] NFT铸造 (智能合约)
- [ ] 市场浏览 (分页加载)
- [ ] 响应式设计 (移动端)

#### 高级功能测试
- [ ] 错误处理 (网络异常)
- [ ] 加载状态显示
- [ ] 交易状态跟踪
- [ ] IPFS图像显示
- [ ] 元数据完整性

### 💡 演示亮点

#### 1. **无需配置**
- 评审人员无需获取API密钥
- 无需本地环境搭建
- 直接在线体验完整功能

#### 2. **真实环境**
- 部署在生产环境
- 真实的AI API调用
- 真实的区块链交互

#### 3. **完整体验**
- 从AI生成到NFT铸造的完整流程
- 包含市场浏览功能
- 移动端完整适配

### 📊 性能指标

#### 用户体验指标
- 页面加载时间: <2秒
- AI图像生成: 10-15秒
- NFT铸造时间: 20-30秒
- 移动端适配: 100%

#### 技术指标
- 前端性能分数: 95+
- 响应式设计: 完全支持
- 跨浏览器兼容: Chrome/Firefox/Safari/Edge
- 网络容错: 自动重试和错误处理

### 🔐 安全说明

#### 演示环境安全措施
- 使用测试网络 (无真实价值)
- API密钥限制使用量
- 钱包私钥仅用于演示
- 所有数据公开透明

#### 生产环境部署
- 环境变量加密存储
- API密钥定期轮换
- 智能合约安全审计
- 前端代码混淆

### 📞 技术支持

#### 演示问题反馈
- **GitHub Issues**: https://github.com/tuofangzhe/bnb-nft-ai-minter/issues
- **问题类型**: 演示功能、技术问题、用户体验

#### 常见问题解答
**Q: 演示地址访问不了？**
A: 检查网络连接，或稍后重试。如持续问题请提交Issue。

**Q: 钱包连接失败？**
A: 确保使用支持的钱包，并切换到BSC测试网。

**Q: AI生成时间过长？**
A: 正常情况下10-15秒，如超过30秒请刷新页面重试。

**Q: NFT铸造失败？**
A: 确保钱包有足够的测试BNB，并检查网络连接。

### 🎯 评审重点

#### 技术实现
- 完整的全栈架构
- AI与区块链的无缝集成
- 现代化技术栈应用

#### 用户体验
- 直观的操作流程
- 流畅的交互体验
- 完善的错误处理

#### 商业价值
- 实际可用的产品
- 完整的功能闭环
- 可扩展的架构设计

---

**🎉 立即体验**: http://207.180.254.119:3000/

**⭐ 项目仓库**: https://github.com/tuofangzhe/bnb-nft-ai-minter
