const axios = require('axios');
const FormData = require('form-data');

// 从 .env 文件加载凭证
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET = process.env.PINATA_API_SECRET;

// 定义 Pinata API 和网关的常量
const PINATA_API_URL = 'https://api.pinata.cloud/pinning';
const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

/**
 * 上传图片 Buffer 到 Pinata IPFS.
 * @param {Buffer} imageBuffer - 图片的二进制 Buffer 数据.
 * @param {string} prompt - 用于生成图片的提示词.
 * @returns {Promise<{ipfsHash: string, ipfsUrl: string}>} - 包含 IPFS 哈希和完整网关 URL 的对象.
 */
async function uploadImageToIPFS(imageBuffer, prompt) {
  console.log("-> Uploading image to IPFS via Pinata API...");

  const formData = new FormData();
  formData.append('file', imageBuffer, { filename: `ai-nft-${Date.now()}.png` });

  const metadata = JSON.stringify({
    name: `AI NFT - ${prompt.substring(0, 50)}`,
    keyvalues: {
      prompt: prompt
    }
  });
  formData.append('pinataMetadata', metadata);
  
  const pinataOptions = JSON.stringify({
    cidVersion: 0
  });
  formData.append('pinataOptions', pinataOptions);

  try {
    const response = await axios.post(
      `${PINATA_API_URL}/pinFileToIPFS`,
      formData,
      {
        maxBodyLength: "Infinity",
        headers: {
          'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_SECRET
        }
      }
    );

    const ipfsHash = response.data.IpfsHash;
    console.log("<- Image uploaded successfully. IPFS Hash:", ipfsHash);

    // 【修改点】返回一个包含哈希和完整 URL 的对象
    return {
      ipfsHash: ipfsHash,
      ipfsUrl: `${PINATA_GATEWAY}${ipfsHash}`
    };

  } catch (error) {
    console.error("Error uploading file to Pinata:", error.response ? error.response.data : error.message);
    throw new Error("Failed to upload image to IPFS.");
  }
}

/**
 * 上传元数据 JSON 对象到 Pinata IPFS.
 * @param {object} metadata - 要上传的元数据 JSON 对象.
 * @returns {Promise<{ipfsHash: string, ipfsUrl: string}>} - 包含 IPFS 哈希和完整网关 URL 的对象.
 */
async function uploadMetadataToIPFS(metadata) {
  console.log("-> Uploading metadata JSON to IPFS via Pinata API...");
  
  try {
    const response = await axios.post(
      `${PINATA_API_URL}/pinJSONToIPFS`,
      {
        pinataContent: metadata,
        pinataMetadata: {
          name: metadata.name || 'AI NFT Metadata'
        }
      },
      {
        headers: {
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_SECRET
        }
      }
    );
    
    const ipfsHash = response.data.IpfsHash;
    console.log("<- Metadata uploaded successfully. IPFS Hash:", ipfsHash);

    // 【修改点】返回一个包含哈希和完整 URL 的对象
    return {
      ipfsHash: ipfsHash,
      ipfsUrl: `${PINATA_GATEWAY}${ipfsHash}`
    };

  } catch (error) {
    console.error("Error uploading JSON to Pinata:", error.response ? error.response.data : error.message);
    throw new Error("Failed to upload metadata to IPFS.");
  }
}

module.exports = { uploadImageToIPFS, uploadMetadataToIPFS };