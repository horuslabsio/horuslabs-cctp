/**
 * CCTP mint on Starknet - receive_message on Circle MessageTransmitter
 */

import { Account, RpcProvider, Contract, CairoByteArray, CallData } from 'starknet';
import { DOMAIN_CONFIG } from './config.js';
import type { AttestationData, MintOptions, MintResult } from './types.js';

const STARKNET_DOMAIN = 25;

/** Minimal ABI for receive_message and is_nonce_used */
const TRANSMITTER_ABI = [
  {
    type: 'function',
    name: 'receive_message',
    inputs: [
      { name: 'message', type: 'core::byte_array::ByteArray' },
      { name: 'attestation', type: 'core::byte_array::ByteArray' },
    ],
    outputs: [{ type: 'core::bool' }],
    state_mutability: 'external',
  },
  {
    type: 'function',
    name: 'is_nonce_used',
    inputs: [{ name: 'nonce', type: 'core::integer::u256' }],
    outputs: [{ type: 'core::bool' }],
    state_mutability: 'view',
  },
] as const;

function ensureHex(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error(`Expected hex string, got ${typeof value}`);
  }
  return value.startsWith('0x') ? value : '0x' + value;
}

export interface MintStarknetOptions extends MintOptions {
  /** Starknet account (deployed contract) address - required for signing */
  accountAddress: string;
}

/**
 * Mint USDC on Starknet using CCTP attestation.
 * Requires accountAddress (deployed ArgentX/Braavos account) and privateKey.
 */
export async function mintStarknet(
  attestationData: AttestationData,
  privateKey: string,
  options: MintStarknetOptions
): Promise<MintResult> {
  const { accountAddress, rpcUrl = null, preferMainnet = true } = options;
  const { attestation, message, decodedMessage } = attestationData;

  const destinationDomain = decodedMessage?.destinationDomain;
  if (destinationDomain !== STARKNET_DOMAIN) {
    throw new Error(
      `mintStarknet requires destinationDomain ${STARKNET_DOMAIN}, got ${destinationDomain}`
    );
  }

  const config = DOMAIN_CONFIG[STARKNET_DOMAIN];
  if (!config) {
    throw new Error('Starknet (domain 25) not configured');
  }

  const env = preferMainnet ? 'mainnet' : 'testnet';
  const { rpc, transmitter } = config[env];
  const nodeUrl = rpcUrl ?? rpc;

  const nonce = decodedMessage?.nonce;
  if (nonce === undefined || nonce === null) {
    throw new Error('Attestation data missing decodedMessage.nonce');
  }

  const provider = new RpcProvider({ nodeUrl });
  const account = new Account({
    provider,
    address: accountAddress,
    signer: privateKey,
  });
  const contract = new Contract({
    abi: TRANSMITTER_ABI,
    address: transmitter,
    providerOrAccount: account,
  });

  const alreadyUsed = await contract.is_nonce_used(nonce);
  if (alreadyUsed) {
    return { success: true, alreadyProcessed: true, txHash: null };
  }

  const messageHex = ensureHex(message);
  const attestationHex = ensureHex(attestation);

  const messageBytes = new CairoByteArray(messageHex);
  const attestationBytes = new CairoByteArray(attestationHex);
  const calldata = CallData.compile([
    ...messageBytes.toApiRequest(),
    ...attestationBytes.toApiRequest(),
  ]);

  const tx = await contract.receive_message(calldata);
  await provider.waitForTransaction(tx.transaction_hash);

  return {
    success: true,
    txHash: tx.transaction_hash,
  };
}
