/**
 * CCTP types for attestation and minting
 */

export type Network = 'mainnet' | 'testnet';

export interface AttestationData {
  attestation: string;
  message: string;
  decodedMessage: {
    destinationDomain: number;
    [key: string]: unknown;
  };
}

export interface AttestationResultComplete extends AttestationData {
  status: 'complete';
}

export interface AttestationResultPending {
  status: 'pending';
  message?: string;
  messageStatus?: string;
  retriable?: boolean;
  error?: string;
}

export interface AttestationResultFailed {
  status: 'failed';
  error: string;
}

export type AttestationResult =
  | AttestationResultComplete
  | AttestationResultPending
  | AttestationResultFailed;

export interface MintResult {
  success: boolean;
  txHash?: string | null;
  gasUsed?: string;
  alreadyProcessed?: boolean;
}

export interface MintOptions {
  rpcUrl?: string | null;
  preferMainnet?: boolean;
  /** Starknet account address (required when destinationDomain is 25) */
  accountAddress?: string;
}

export interface FetchOptions {
  timeoutMs?: number;
  quiet?: boolean;
}

export interface PollAttestationOptions extends FetchOptions {
  /** Interval in ms between polling attempts (default: 30000) */
  intervalMs?: number;
  /** AbortSignal to cancel polling */
  signal?: AbortSignal;
}


export interface ChainConfig {
  rpc: string;
  transmitter: string;
}

export interface DomainConfig {
  mainnet: ChainConfig;
  testnet: ChainConfig;
}

export type DomainConfigMap = Record<number, DomainConfig>;
