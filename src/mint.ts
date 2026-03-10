/**
 * CCTP mint - receiveMessage on Circle MessageTransmitter (EVM) or receive_message (Starknet)
 */

import { ethers } from 'ethers';
import { DOMAIN_CONFIG } from './config.js';
import { mintStarknet } from './mint-starknet.js';
import type { AttestationData, MintOptions, MintResult } from './types.js';

const STARKNET_DOMAIN = 25;

const TRANSMITTER_ABI = [
  'function receiveMessage(bytes message, bytes attestation) returns (bool)',
  'function usedNonces(bytes32 messageHash) view returns (uint256)',
  'function hashMessage(bytes message) pure returns (bytes32)',
];

function ensureHex(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error(`Expected hex string, got ${typeof value}`);
  }
  return value.startsWith('0x') ? value : '0x' + value;
}

/**
 * Mint USDC on destination chain using CCTP attestation
 */
export async function mint(
  attestationData: AttestationData,
  privateKey: string,
  options: MintOptions = {}
): Promise<MintResult> {
  const { rpcUrl = null, preferMainnet = true } = options;
  const { attestation, message, decodedMessage } = attestationData;

  const destinationDomain = decodedMessage?.destinationDomain;
  if (destinationDomain === undefined || destinationDomain === null) {
    throw new Error('Attestation data missing decodedMessage.destinationDomain');
  }

  if (destinationDomain === STARKNET_DOMAIN) {
    const accountAddress = options.accountAddress;
    if (!accountAddress) {
      throw new Error(
        'Minting to Starknet (domain 25) requires accountAddress in options'
      );
    }
    return mintStarknet(attestationData, privateKey, {
      ...options,
      accountAddress,
    });
  }

  const config = DOMAIN_CONFIG[destinationDomain];
  if (!config) {
    throw new Error(
      `Domain ${destinationDomain} not supported. Supported: ${Object.keys(DOMAIN_CONFIG).join(', ')}`
    );
  }

  const env = preferMainnet ? 'mainnet' : 'testnet';
  const { rpc, transmitter } = config[env];
  const endpoint = rpcUrl ?? rpc;

  const provider = new ethers.JsonRpcProvider(endpoint);
  const signer = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(transmitter, TRANSMITTER_ABI, signer);

  const messageHex = ensureHex(message);
  const attestationHex = ensureHex(attestation);

  const messageHash = await contract.hashMessage(messageHex);
  const usedNonce = await contract.usedNonces(messageHash);

  if (usedNonce > 0n) {
    return { success: true, alreadyProcessed: true, txHash: null };
  }

  const tx = await contract.receiveMessage(messageHex, attestationHex);
  const receipt = await tx.wait();

  if (receipt.status === 1) {
    return {
      success: true,
      txHash: tx.hash,
      gasUsed: receipt.gasUsed.toString(),
    };
  }

  throw new Error('Transaction reverted');
}
