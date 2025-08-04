import { ethers } from 'ethers'
import EthRegistrarABI from '../artifacts/contracts/ethregistrar/ETHRegistrarController.sol/ETHRegistrarController.json'

export async function getRegistrationTime(name) {
  const provider = new ethers.providers.JsonRpcProvider(
    'hpublicttps://bnb-testnet.api.onfinality.io/',
  )
  const node = ethers.utils.namehash(name)
  const baseRegistrar = new ethers.Contract(
    '0x98e9FdF05313A49D95A44ff3563EA3ba05Ce551E',
    EthRegistrarABI.abi,
    provider,
  )

  // 1. Filter for NameRegistered events for this name
  const filter = baseRegistrar.filters.NameRegistered(name, null, null, null)
  const logs = await baseRegistrar.queryFilter(filter, 51000000, 'latest')

  if (logs.length === 0) {
    throw new Error('No registration found for ' + name)
  }

  // 2. Take the first log (earliest)
  const firstLog = logs[0]
  const block = await provider.getBlock(firstLog.blockNumber)

  return {
    name,
    registeredAt: new Date(block.timestamp * 1000).toISOString(),
    txHash: firstLog.transactionHash,
  }
}
getRegistrationTime('destro').then(console.log)
