/**
 * EIP-712 Typed Data Signing — core logic for BNB Smart Chain (BSC).
 * Hashes, encodes, and verifies EIP-712 typed structured data.
 */

import {
  TypedDataEncoder,
  verifyTypedData,
  type TypedDataDomain,
  type TypedDataField,
} from "ethers";

/** BSC mainnet chain ID (BNB Smart Chain). */
export const BSC_CHAIN_ID = 56;

/** EIP-712 typed data shape: domain, types, primaryType, message. */
export interface EIP712TypedData {
  domain: TypedDataDomain;
  types: Record<string, TypedDataField[]>;
  primaryType: string;
  message: Record<string, unknown>;
}

/**
 * Returns a BSC-scoped EIP-712 example (Mail-style struct).
 * Uses chainId 56 and a sample verifying contract for demo purposes.
 */
export function getBscMailTypedData(): EIP712TypedData {
  return {
    domain: {
      name: "BNB Cookbook",
      version: "1",
      chainId: BSC_CHAIN_ID,
      verifyingContract: "0x0000000000000000000000000000000000000000",
    },
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      Mail: [
        { name: "from", type: "Person" },
        { name: "to", type: "Person" },
        { name: "contents", type: "string" },
      ],
      Person: [
        { name: "name", type: "string" },
        { name: "wallet", type: "address" },
      ],
    },
    primaryType: "Mail",
    message: {
      from: {
        name: "Alice",
        wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
      },
      to: {
        name: "Bob",
        wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
      },
      contents: "Hello from BSC EIP-712!",
    },
  };
}

/**
 * Hashes the full EIP-712 digest (\\x19\\x01 ‖ domainSeparator ‖ hashStruct(message)).
 */
export function hashTypedData(data: EIP712TypedData): string {
  const { domain, types, message } = data;
  return TypedDataEncoder.hash(domain, _typesWithoutEIP712Domain(types), message);
}

/**
 * Returns the domain separator hash (hashStruct(EIP712Domain)).
 */
export function hashDomain(domain: TypedDataDomain): string {
  return TypedDataEncoder.hashDomain(domain);
}

/**
 * Returns the hashStruct of the message for the given primary type.
 */
export function hashStruct(
  primaryType: string,
  types: Record<string, TypedDataField[]>,
  message: Record<string, unknown>
): string {
  return TypedDataEncoder.hashStruct(
    primaryType,
    _typesWithoutEIP712Domain(types),
    message
  );
}

/**
 * Recovers the signer address from an EIP-712 signature.
 */
export function verifyTypedDataSignature(
  data: EIP712TypedData,
  signature: string
): string {
  const { domain, types, message } = data;
  return verifyTypedData(
    domain,
    _typesWithoutEIP712Domain(types),
    message,
    signature
  );
}

/**
 * Returns the JSON payload for eth_signTypedData_v4.
 * Use this with wallet request `eth_signTypedData_v4`.
 */
export function getSignPayload(data: EIP712TypedData): unknown {
  const { domain, types, primaryType, message } = data;
  return { domain, types, primaryType, message };
}

function _typesWithoutEIP712Domain(
  types: Record<string, TypedDataField[]>
): Record<string, TypedDataField[]> {
  const out: Record<string, TypedDataField[]> = {};
  for (const [k, v] of Object.entries(types)) {
    if (k !== "EIP712Domain") out[k] = v;
  }
  return out;
}
