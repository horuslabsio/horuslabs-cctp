/**
 * @horuslabs/cctp - Framework-agnostic CCTP attestation fetch and mint
 */

export { fetchAttestation, pollAttestation } from './fetch.js';
export { mint } from './mint.js';
export { mintStarknet } from './mint-starknet.js';
export {
  CCTP_API_URLS,
  DEFAULT_POLL_INTERVAL_MS,
  DOMAIN_CONFIG,
  REQUEST_TIMEOUT_MS,
} from './config.js';

export type {
  AttestationData,
  AttestationResult,
  AttestationResultComplete,
  AttestationResultFailed,
  AttestationResultPending,
  ChainConfig,
  DomainConfig,
  DomainConfigMap,
  FetchOptions,
  MintOptions,
  PollAttestationOptions,
  MintResult,
  Network,
} from './types.js';
