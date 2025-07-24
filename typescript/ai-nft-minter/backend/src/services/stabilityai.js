const axios = require('axios');

const STABILITY_API_KEY = process.env.STABILITY_API_KEY;
const API_HOST = 'https://api.stability.ai';
const ENGINE_ID = 'stable-diffusion-v1-6';

async function generateImage(prompt) {
  if (!STABILITY_API_KEY) {
    throw new Error("Missing Stability AI API key.");
  }

  console.log("-> Calling Stability AI API...");

  const response = await axios.post(
    `${API_HOST}/v1/generation/${ENGINE_ID}/text-to-image`,
    {
      text_prompts: [{ text: prompt }],
      cfg_scale: 7,
      height: 1024,
      width: 1024,
      steps: 30,
      samples: 1,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${STABILITY_API_KEY}`,
      },
    }
  );

  if (response.status !== 200) {
    throw new Error(`Stability AI API returned non-200 status: ${response.statusText}`);
  }

  const imageArtifact = response.data.artifacts[0];
  console.log("<- Image generated successfully from Stability AI.");
  
  return Buffer.from(imageArtifact.base64, 'base64');
}

module.exports = { generateImage };