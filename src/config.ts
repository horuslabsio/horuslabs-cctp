/**
 * CCTP configuration: API URLs and domain -> chain mapping
 */

import type { DomainConfigMap } from './types.js';

export const CCTP_API_URLS = {
  mainnet: 'https://iris-api.circle.com/v2',
  testnet: 'https://iris-api-sandbox.circle.com/v2',
} as const;

/** Per-request timeout for attestation fetch */
export const REQUEST_TIMEOUT_MS = 10000;

/** Default polling interval for pollAttestation (30 seconds) */
export const DEFAULT_POLL_INTERVAL_MS = 30000;

/** Circle MessageTransmitter addresses and public RPCs per domain */
export const DOMAIN_CONFIG: DomainConfigMap = {
  0: {
    mainnet: {
      rpc: 'https://eth.llamarpc.com',
      transmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    },
    testnet: {
      rpc: 'https://ethereum-sepolia-rpc.publicnode.com',
      transmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
    },
  },
  1: {
    mainnet: {
      rpc: 'https://api.avax.network/ext/bc/C/rpc',
      transmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    },
    testnet: {
      rpc: 'https://api.avax-test.network/ext/bc/C/rpc',
      transmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
    },
  },
  2: {
    mainnet: {
      rpc: 'https://mainnet.optimism.io',
      transmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    },
    testnet: {
      rpc: 'https://sepolia.optimism.io',
      transmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
    },
  },
  3: {
    mainnet: {
      rpc: 'https://arb1.arbitrum.io/rpc',
      transmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    },
    testnet: {
      rpc: 'https://sepolia-rollup.arbitrum.io/rpc',
      transmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
    },
  },
  6: {
    mainnet: {
      rpc: 'https://mainnet.base.org',
      transmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    },
    testnet: {
      rpc: 'https://sepolia.base.org',
      transmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
    },
  },
  7: {
    mainnet: {
      rpc: 'https://polygon-rpc.com',
      transmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    },
    testnet: {
      rpc: 'https://rpc-amoy.polygon.technology',
      transmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
    },
  },
};
