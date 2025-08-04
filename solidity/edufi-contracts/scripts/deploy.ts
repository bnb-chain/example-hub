import { ethers } from 'hardhat'
import fs from 'fs'
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

  const forwarderFactory = await ethers.getContractFactory(
    'ERC2771Forwarder',
    signer as any,
  )
  const forwarder = '0x52C0De18D999E11436776fa45800bb92d57b752c'
  const Contract = await ethers.getContractFactory('Level3Course')
  const reverseAddress = '0x2E5ba310fDa0aD5dfA4CC5656FAEDDd4CC4c162b'
  const contract = await Contract.deploy(
    forwarder,
    reverseAddress,
    '0x2a0d7311fa7e9ac2890cfd8219b2def0c206e79b',
  )
  const course = await contract.getAddress()

  console.log('Level3 Course Contract deployed to address:', course)
  const Factory = await ethers.getContractFactory('CourseFactory')
  const factory = await Factory.deploy(
    course,
    '0x2a0d7311fa7e9ac2890cfd8219b2def0c206e79b',
  )
  await factory.waitForDeployment()
  const CourseFactory = await factory.getAddress()

  const owner = await factory.owner()
  console.log('Owner is:', owner)

  console.log('CourseFactory deployed to address:', CourseFactory)
  const tx = await contract.setCourseFactory(CourseFactory)
  console.log(`Added Course Factory, ${tx.hash}`)
  const cdata: any = {
    FORWARDER_ADDRESS: forwarder,
    COURSE_ADDRESS: course,
    COURSE_FACTORY: CourseFactory,
  }
  console.log('Contract deployed to address:', forwarder)
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
