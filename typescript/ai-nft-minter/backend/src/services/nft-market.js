const { ethers } = require("ethers");
const axios = require("axios");

const BSC_TESTNET_RPC_URL = process.env.BSC_TESTNET_RPC_URL;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

// 创建只读的 provider (不需要私钥)
const provider = new ethers.providers.JsonRpcProvider(BSC_TESTNET_RPC_URL);

// 复用现有的合约 ABI (只需要读取相关的函数)
const contractABI = [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "initialOwner",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "sender",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "ERC721IncorrectOwner",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "operator",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "ERC721InsufficientApproval",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "approver",
          "type": "address"
        }
      ],
      "name": "ERC721InvalidApprover",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "operator",
          "type": "address"
        }
      ],
      "name": "ERC721InvalidOperator",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "ERC721InvalidOwner",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "receiver",
          "type": "address"
        }
      ],
      "name": "ERC721InvalidReceiver",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "sender",
          "type": "address"
        }
      ],
      "name": "ERC721InvalidSender",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "ERC721NonexistentToken",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "OwnableInvalidOwner",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "OwnableUnauthorizedAccount",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "approved",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "Approval",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "operator",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "approved",
          "type": "bool"
        }
      ],
      "name": "ApprovalForAll",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "_fromTokenId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "_toTokenId",
          "type": "uint256"
        }
      ],
      "name": "BatchMetadataUpdate",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "_tokenId",
          "type": "uint256"
        }
      ],
      "name": "MetadataUpdate",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "Transfer",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "approve",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "balanceOf",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "getApproved",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "operator",
          "type": "address"
        }
      ],
      "name": "isApprovedForAll",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "name",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "ownerOf",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "renounceOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "uri",
          "type": "string"
        }
      ],
      "name": "safeMint",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "safeTransferFrom",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        },
        {
          "internalType": "bytes",
          "name": "data",
          "type": "bytes"
        }
      ],
      "name": "safeTransferFrom",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "operator",
          "type": "address"
        },
        {
          "internalType": "bool",
          "name": "approved",
          "type": "bool"
        }
      ],
      "name": "setApprovalForAll",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes4",
          "name": "interfaceId",
          "type": "bytes4"
        }
      ],
      "name": "supportsInterface",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "symbol",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "tokenURI",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "transferFrom",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];

// 创建只读合约实例
const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);

// 缓存数据，避免重复查询
let cachedAllNFTs = null; // 缓存所有NFT数据
let cachedTotalSupply = null; // 缓存总供应量
let cacheTimestamp = null;
const CACHE_DURATION = 2 * 60 * 1000; // 2分钟缓存（缩短缓存时间）

// 工具函数：缩短地址显示
function shortenAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// IPFS网关列表 (使用可靠的网关)
const IPFS_GATEWAYS = [
    'https://gateway.pinata.cloud/ipfs/',
    'https://ipfs.io/ipfs/',
    'https://dweb.link/ipfs/'
];

// 工具函数：从IPFS URI获取HTTP URL (使用随机网关)
function getIPFSHttpUrl(ipfsUri) {
    if (!ipfsUri) return '';
    
    let hash = '';
    
    // 处理 ipfs://QmXXX... 格式
    if (ipfsUri.startsWith('ipfs://')) {
        hash = ipfsUri.replace('ipfs://', '');
    } else if (ipfsUri.startsWith('http')) {
        // 如果已经是HTTP URL，直接返回
        return ipfsUri;
    } else {
        // 如果是纯hash
        hash = ipfsUri;
    }
    
    // 随机选择一个网关来分散负载
    const randomGateway = IPFS_GATEWAYS[Math.floor(Math.random() * IPFS_GATEWAYS.length)];
    return `${randomGateway}${hash}`;
}

// 从IPFS获取metadata (带重试机制)
async function fetchMetadataFromIPFS(tokenURI) {
    const maxRetries = 2;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const httpUrl = getIPFSHttpUrl(tokenURI);
            console.log(`-> Fetching metadata from: ${httpUrl} (attempt ${attempt + 1})`);
            
            const response = await axios.get(httpUrl, {
                timeout: 8000, // 8秒超时
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (compatible; NFT-Fetcher/1.0)'
                }
            });
            
            return response.data;
        } catch (error) {
            console.error(`Failed to fetch metadata from ${tokenURI} (attempt ${attempt + 1}):`, error.message);
            
            // 如果不是最后一次尝试，等待一下再重试
            if (attempt < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒延迟
            }
        }
    }
    
    return null;
}

// 获取单个NFT的信息
async function getNFTInfo(tokenId) {
    try {
        console.log(`-> Getting info for token ID: ${tokenId}`);
        
        // 并行获取tokenURI和owner
        const [tokenURI, owner] = await Promise.all([
            contract.tokenURI(tokenId),
            contract.ownerOf(tokenId)
        ]);
        
        console.log(`   TokenURI: ${tokenURI}`);
        console.log(`   Owner: ${owner}`);
        
        // 获取metadata
        const metadata = await fetchMetadataFromIPFS(tokenURI);
        
        if (!metadata) {
            console.warn(`   Failed to fetch metadata for token ${tokenId}`);
            return null;
        }
        
        // 提取创建时间
        const createdAt = metadata.attributes?.find(attr => 
            attr.trait_type === "Generated At"
        )?.value;
        
        // 格式化NFT信息
        const nftInfo = {
            tokenId: tokenId.toString(),
            name: metadata.name || `AI NFT #${tokenId}`,
            description: metadata.description || '',
            image: getIPFSHttpUrl(metadata.image),
            owner: owner,
            shortOwner: shortenAddress(owner),
            createdAt: createdAt || new Date().toISOString(),
            attributes: metadata.attributes || []
        };
        
        console.log(`   ✓ Successfully processed token ${tokenId}`);
        return nftInfo;
        
    } catch (error) {
        console.error(`Error getting NFT info for token ${tokenId}:`, error.message);
        return null;
    }
}

// 获取NFT总供应量
async function getTotalSupply() {
    try {
        // 由于我们的合约从tokenId 1开始铸造，我们可以通过尝试调用tokenURI来确定总数
        // 这种方法避免了查询大量事件日志
        
        let totalSupply = 0;
        let consecutiveFailures = 0;
        const maxConsecutiveFailures = 3; // 连续失败3次就停止
        
        console.log('-> Detecting total supply by checking token existence...');
        
        // 从tokenId 1开始检查，直到连续失败
        for (let tokenId = 1; tokenId <= 1000; tokenId++) { // 最多检查1000个
            try {
                await contract.tokenURI(tokenId);
                totalSupply = tokenId;
                consecutiveFailures = 0; // 重置连续失败计数
                console.log(`   Token ${tokenId} exists`);
            } catch (error) {
                consecutiveFailures++;
                console.log(`   Token ${tokenId} does not exist (${consecutiveFailures}/${maxConsecutiveFailures})`);
                
                if (consecutiveFailures >= maxConsecutiveFailures) {
                    break; // 连续失败达到阈值，停止检查
                }
            }
        }
        
        console.log(`-> Total supply detected: ${totalSupply} NFTs`);
        return totalSupply;
        
    } catch (error) {
        console.error("Error getting total supply:", error.message);
        throw error;
    }
}

// 主函数：获取NFT信息 (支持分页)
async function getAllNFTs(offset = 0, limit = 4) {
    try {
        // 检查缓存
        const now = Date.now();
        if (cachedAllNFTs && cachedTotalSupply && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
            console.log('-> Using cached NFT data for pagination');
            
            // 从缓存中应用分页
            const startIndex = offset;
            const endIndex = offset + limit;
            const paginatedNFTs = cachedAllNFTs.slice(startIndex, endIndex);
            
            return {
                success: true,
                totalSupply: cachedTotalSupply,
                totalNFTs: cachedAllNFTs.length,
                currentPage: Math.floor(offset / limit) + 1,
                hasMore: endIndex < cachedAllNFTs.length,
                nfts: paginatedNFTs
            };
        }
        
        console.log('\n--- Fetching All NFTs ---');
        
        // 检查环境变量
        if (!BSC_TESTNET_RPC_URL || !CONTRACT_ADDRESS) {
            throw new Error("Missing required environment variables: BSC_TESTNET_RPC_URL or CONTRACT_ADDRESS");
        }
        
        // 获取总供应量
        const totalSupply = await getTotalSupply();
        
        if (totalSupply === 0) {
            console.log('-> No NFTs found');
            return {
                success: true,
                totalSupply: 0,
                nfts: []
            };
        }
        
        // 分批获取NFT信息，避免速率限制
        const batchSize = 5; // 每批处理5个NFT
        const allNfts = [];
        
        console.log(`-> Fetching data for all ${totalSupply} NFTs in batches of ${batchSize}...`);
        
        for (let i = 1; i <= totalSupply; i += batchSize) {
            const endIndex = Math.min(i + batchSize - 1, totalSupply);
            console.log(`   Processing batch ${i}-${endIndex}...`);
            
            const batchPromises = [];
            for (let j = i; j <= endIndex; j++) {
                batchPromises.push(getNFTInfo(j));
            }
            
            const batchResults = await Promise.all(batchPromises);
            allNfts.push(...batchResults);
            
            // 在批次之间添加小延迟，避免速率限制
            if (i + batchSize <= totalSupply) {
                await new Promise(resolve => setTimeout(resolve, 500)); // 500ms延迟
            }
        }
        
        const nftResults = allNfts;
        
        // 过滤掉失败的结果
        const validNFTs = nftResults.filter(nft => nft !== null);
        
        console.log(`-> Successfully processed ${validNFTs.length}/${totalSupply} NFTs`);
        
        // 按创建时间倒序排序 (最新的在前面)
        validNFTs.sort((a, b) => {
            const dateA = new Date(a.createdAt);
            const dateB = new Date(b.createdAt);
            return dateB.getTime() - dateA.getTime(); // 倒序
        });
        
        // 应用分页
        const startIndex = offset;
        const endIndex = offset + limit;
        const paginatedNFTs = validNFTs.slice(startIndex, endIndex);
        
        console.log(`-> Returning ${paginatedNFTs.length} NFTs (offset: ${offset}, limit: ${limit})`);
        
        const result = {
            success: true,
            totalSupply: totalSupply,
            totalNFTs: validNFTs.length,
            currentPage: Math.floor(offset / limit) + 1,
            hasMore: endIndex < validNFTs.length,
            nfts: paginatedNFTs
        };
        
        // 更新缓存 (缓存所有排序后的NFT数据)
        cachedAllNFTs = validNFTs;
        cachedTotalSupply = totalSupply;
        cacheTimestamp = now;
        
        console.log('--- NFT Fetching Complete ---\n');
        return result;
        
    } catch (error) {
        console.error('Error in getAllNFTs:', error.message);
        throw error;
    }
}

// 清除缓存函数 (可用于强制刷新)
function clearCache() {
    cachedAllNFTs = null;
    cachedTotalSupply = null;
    cacheTimestamp = null;
    console.log('-> NFT cache cleared');
}

module.exports = {
    getAllNFTs,
    clearCache,
    shortenAddress,
    getIPFSHttpUrl
};