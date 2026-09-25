import { Address, isAddress } from 'viem';

const singletonAddress = process.env.NEXT_PUBLIC_SINGLETON_ADDRESS;

if (
    !singletonAddress ||
    !isAddress(singletonAddress) ||
    singletonAddress === '0x0000000000000000000000000000000000000000'
) {
    throw new Error(
        'NEXT_PUBLIC_SINGLETON_ADDRESS must be set to the deployed Singleton contract address.'
    );
}

export const SINGLETON_ADDRESS = singletonAddress as Address;
