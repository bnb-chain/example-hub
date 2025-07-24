// 1. 导入必要的模块
const express = require('express');
const cors = require('cors');
const fs = require('fs/promises'); // 使用 promise 版本的 fs
const path = require('path');
require('dotenv').config(); // 这行代码会自动加载 .env 文件中的变量

// 2. 初始化 Express 应用
const app = express();

// 3. 使用中间件
app.use(cors()); // 允许跨域请求，这样我们的前端才能访问后端
app.use(express.json()); // 允许服务器解析 JSON 格式的请求体

// 4. 定义一个简单的根路由，用于测试服务器是否正常运行
app.get('/', (req, res) => {
  res.send('AI-NFT Minter Backend is running!');
});

// ---------------------------------------------------
// 未来我们的 /api/mint 路由将在这里定义
// ---------------------------------------------------
// 导入我们的服务模块
const { generateImage } = require('./services/stabilityai');
const { uploadImageToIPFS, uploadMetadataToIPFS } = require('./services/pinata');
const { mintNFT } = require('./services/blockchain');
const { getAllNFTs, clearCache } = require('./services/nft-market');


// 定义 /api/mint 路由
app.post('/api/mint', async (req, res) => {
    try {
        const { prompt, userAddress } = req.body;
        if (!prompt || !userAddress) {
            return res.status(400).json({ success: false, error: "Prompt and userAddress are required." });
        }

        const timestamp = Date.now();
        console.log(`\n\n--- New Minting Request [${timestamp}] ---`);
        console.log(`Prompt: ${prompt}, User: ${userAddress}`);

        // 1. 生成 AI 图像
        const imageBuffer = await generateImage(prompt);
        
        // 【新增】将图片保存到本地
        const imageFileName = `${timestamp}.png`;
        const imagePath = path.join(__dirname, '..', 'output', 'images', imageFileName);
        await fs.writeFile(imagePath, imageBuffer);
        console.log(`Image saved locally to: ${imagePath}`);

        // 2. 上传图像到 IPFS (现在返回一个对象)
        const imageUploadResult = await uploadImageToIPFS(imageBuffer, prompt);
        // 【新增】在日志中打印可点击的链接
        console.log(`Image IPFS URL: ${imageUploadResult.ipfsUrl}`);

        // 3. 创建元数据
        const metadata = {
            name: `AI Art: ${prompt.substring(0, 30)}...`,
            description: `An AI-generated artwork based on the prompt: "${prompt}"`,
            image: `ipfs://${imageUploadResult.ipfsHash}`, // 在元数据中仍然使用 ipfs://协议
            attributes: [
                { trait_type: "AI Model", value: "Stable Diffusion" },
                { trait_type: "Generated At", value: new Date(timestamp).toISOString() },
            ],
        };
        
        // 【新增】将元数据保存到本地
        const metadataFileName = `${timestamp}.json`;
        const metadataPath = path.join(__dirname, '..', 'output', 'metadata', metadataFileName);
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2)); // 使用 null, 2 进行格式化，更易读
        console.log(`Metadata saved locally to: ${metadataPath}`);

        // 4. 上传元数据到 IPFS
        const metadataUploadResult = await uploadMetadataToIPFS(metadata);
        // 【新增】在日志中打印可点击的链接
        console.log(`Metadata IPFS URL: ${metadataUploadResult.ipfsUrl}`);

        // 5. 铸造 NFT
        const tokenURI = `ipfs://${metadataUploadResult.ipfsHash}`;
        const result = await mintNFT(userAddress, tokenURI);

        // 6. 返回成功响应
        console.log(`--- Minting Request [${timestamp}] Finished Successfully ---`);
        // 【新增】在成功响应中也加入 IPFS 链接，方便前端使用
        res.status(200).json({ 
            success: true, 
            ...result,
            imageUrl: imageUploadResult.ipfsUrl,
            metadataUrl: metadataUploadResult.ipfsUrl
        });

    } catch (error) {
        console.error("\n--- Minting Request Failed ---");
        console.error(error);
        res.status(500).json({ success: false, error: "An internal server error occurred." });
    }
});

// ---------------------------------------------------
// NFT 市场相关路由
// ---------------------------------------------------

// 获取NFT信息 (支持分页)
app.get('/api/nfts', async (req, res) => {
    try {
        console.log('\n--- NFT Market Request ---');
        
        // 获取分页参数
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 4;
        const offset = (page - 1) * limit;
        
        console.log(`-> Page ${page}, Limit ${limit}, Offset ${offset}`);
        
        // 获取所有NFT信息
        const result = await getAllNFTs(offset, limit);
        
        console.log(`-> Successfully fetched ${result.nfts.length} NFTs for page ${page}`);
        console.log('--- NFT Market Request Complete ---\n');
        
        res.status(200).json(result);
        
    } catch (error) {
        console.error('\n--- NFT Market Request Failed ---');
        console.error(error);
        
        res.status(500).json({ 
            success: false, 
            error: "Failed to fetch NFTs", 
            details: error.message 
        });
    }
});

// 清除NFT缓存 (可选，用于强制刷新)
app.post('/api/nfts/refresh', async (req, res) => {
    try {
        console.log('\n--- NFT Cache Refresh Request ---');
        
        // 清除缓存
        clearCache();
        
        // 重新获取数据
        const result = await getAllNFTs();
        
        console.log(`-> Cache refreshed, fetched ${result.nfts.length} NFTs`);
        console.log('--- NFT Cache Refresh Complete ---\n');
        
        res.status(200).json(result);
        
    } catch (error) {
        console.error('\n--- NFT Cache Refresh Failed ---');
        console.error(error);
        
        res.status(500).json({ 
            success: false, 
            error: "Failed to refresh NFT cache", 
            details: error.message 
        });
    }
});

// 5. 启动服务器
const PORT = process.env.PORT || 3001; // 使用环境变量中的端口，或默认为 3001
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is listening on port ${PORT}`);
  console.log(`- Local:    http://localhost:${PORT}`);
  // 你可以把这里的 IP 换成你的真实 IP，或者保持原样作为一个提示
  console.log(`- Network:  http://207.180.254.119:${PORT}`);
});