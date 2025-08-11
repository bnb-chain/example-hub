import "dotenv/config"
import { Defender } from '@openzeppelin/defender-sdk'
import { appendFileSync, writeFileSync } from 'fs'

async function main() {
  const relayerId = '69d7107b-8f25-4b26-a735-ff4aa1d30fa8'
  const creds = {
    apiKey: process.env.API_KEY,
    apiSecret: process.env.API_SECRET,
  }
  const client = new Defender(creds)

  const { actionId } = await client.action.create({
    name: 'Relay MetaTx',
    encodedZippedCode:
      await client.action.getEncodedZippedCodeFromFolder('./build/action'),
    relayerId: relayerId,
    trigger: {
      type: 'webhook',
    },
    paused: false,
  })

  console.log('Action created with ID', actionId)

  appendFileSync('.env', `\nACTION_ID="${actionId}"`)
}

if (require.main === module) {
  main().catch(console.error)
}
