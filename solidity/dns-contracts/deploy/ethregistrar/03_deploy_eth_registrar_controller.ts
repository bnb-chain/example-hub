import type { DeployFunction } from 'hardhat-deploy/types.js'
import { namehash, zeroAddress } from 'viem'
import { createInterfaceId } from '../../test/fixtures/createInterfaceId.js'

const func: DeployFunction = async function (hre) {
  const { deployments, network, viem } = hre

  const { deployer, owner } = await viem.getNamedClients()

  const registry = await viem.getContract('ENSRegistry', owner)
  const tokenAddresses: `0x${string}`[] = [
    '0xFa60D973F7642B748046464e165A65B7323b0DEE',
    '0x64544969ed7EBf5f083679233325356EbE738930',
  ]

  const registrar = await viem.getContract('BaseRegistrarImplementation', owner)
  const priceOracle = await viem.getContract('TokenPriceOracle', owner)
  const reverseRegistrar = await viem.getContract('ReverseRegistrar', owner)
  const nameWrapper = await viem.getContract('NameWrapper', owner)

  const referralDeployment = await viem.deploy('ReferralController', [])

  const controllerDeployment = await viem.deploy('ETHRegistrarController', [
    registrar.address,
    priceOracle.address,
    60n,
    86400n,
    reverseRegistrar.address,
    nameWrapper.address,
    registry.address,
    owner.address,
    referralDeployment.address,
  ])
  if (!controllerDeployment.newlyDeployed) return

  const controller = await viem.getContract('ETHRegistrarController')

  const refferal = await viem.getContract('ReferralController')

  if (owner.address !== deployer.address) {
    const hash = await controller.write.transferOwnership([owner.address])
    console.log(
      `Transferring ownership of ETHRegistrarController to ${owner.address} (tx: ${hash})...`,
    )
    await viem.waitForTransactionSuccess(hash)
  }

  for (const tokenAddress of tokenAddresses) {
    const hash = await controller.write.setToken([tokenAddress])
    console.log(`Adding ${tokenAddress} to ETHRegistrarController`)
    await viem.waitForTransactionSuccess(hash)
  }

  // Only attempt to make controller etc changes directly on testnets
  if (network.name === 'mainnet') return

  const referralControllerHash = await refferal.write.addController([
    controller.address,
  ])
  console.log(
    `Adding controller as a controller of Referral (tx: ${referralControllerHash})...`,
  )
  await viem.waitForTransactionSuccess(referralControllerHash)
  const backendHash = await controller.write.setBackend([owner.address])
  console.log(`Adding backend (tx: ${backendHash})...`)
  await viem.waitForTransactionSuccess(backendHash)
  const nameWrapperSetControllerHash = await nameWrapper.write.setController([
    controller.address,
    true,
  ])
  console.log(
    `Adding ETHRegistrarController as a controller of NameWrapper (tx: ${nameWrapperSetControllerHash})...`,
  )
  await viem.waitForTransactionSuccess(nameWrapperSetControllerHash)

  const reverseRegistrarSetControllerHash =
    await reverseRegistrar.write.setController([controller.address, true])
  console.log(
    `Adding ETHRegistrarController as a controller of ReverseRegistrar (tx: ${reverseRegistrarSetControllerHash})...`,
  )
  await viem.waitForTransactionSuccess(reverseRegistrarSetControllerHash)

  const artifact = await deployments.getArtifact('IETHRegistrarController')
  const interfaceId = createInterfaceId(artifact.abi)

  const resolver = await registry.read.resolver([namehash('creator')])
  if (resolver === zeroAddress) {
    console.log(
      `No resolver set for .creator; not setting interface ${interfaceId} for creator Registrar Controller`,
    )
    return
  }

  const ethOwnedResolver = await viem.getContract('OwnedResolver')
  const setInterfaceHash = await ethOwnedResolver.write.setInterface([
    namehash('creator'),
    interfaceId,
    controller.address,
  ])
  console.log(
    `Setting ETHRegistrarController interface ID ${interfaceId} on .creator resolver (tx: ${setInterfaceHash})...`,
  )
  await viem.waitForTransactionSuccess(setInterfaceHash)
}

func.tags = ['ethregistrar', 'ETHRegistrarController']
func.dependencies = [
  'ENSRegistry',
  'BaseRegistrarImplementation',
  'TokenPriceOracle',
  'ReverseRegistrar',
  'NameWrapper',
  'OwnedResolver',
]

export default func
