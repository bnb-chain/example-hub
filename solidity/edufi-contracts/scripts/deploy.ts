import { ethers } from 'hardhat'
import 'dotenv/config'
import { Defender } from '@openzeppelin/defender-sdk'

async function main() {
  const creds = {
    relayerApiKey: process.env.RELAYER_API_KEY,
    relayerApiSecret: process.env.RELAYER_API_SECRET,
  }

  const client = new Defender(creds)
  const provider = client.relaySigner.getProvider()
  const signer = await client.relaySigner.getSigner(provider, { speed: 'fast' })
  const owner  = process.env.OWNER_ADDRESS
  const forwarderFactory = await ethers.getContractFactory(
    'ERC2771Forwarder',
    signer as any,
  )
  const forwarder = await forwarderFactory.deploy(
    'ERC2771Forwarder'
  )
  console.log('Forwarder Deployed to:', await forwarder.getAddress())
  const Contract = await ethers.getContractFactory('Level3Course')
  const reverseAddress = '0x2E5ba310fDa0aD5dfA4CC5656FAEDDd4CC4c162b'
  const contract = await Contract.deploy(
    forwarder,
    reverseAddress,
    owner
  )
  const course = await contract.getAddress()

  console.log('Level3 Course Contract deployed to address:', course)
  const Factory = await ethers.getContractFactory('CourseFactory')
  const factory = await Factory.deploy(
    course,
    owner,
  )
  await factory.waitForDeployment()
  const CourseFactory = await factory.getAddress()

  console.log('CourseFactory deployed to address:', CourseFactory)
  const tx = await contract.setCourseFactory(CourseFactory)
  console.log(`Added Course Factory, ${tx.hash}`)
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
