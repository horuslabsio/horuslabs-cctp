#!/usr/bin/env node
/**
 * CLI for CCTP attestation fetch
 */

import {
  fetchAttestation,
  pollAttestation,
  mint,
  DEFAULT_POLL_INTERVAL_MS,
} from './index.js';
import type { Network } from './types.js';

function parseArgs(): {
  txHash: string;
  sourceDomain: number;
  network: Network;
  poll: boolean;
  intervalMs: number;
  shouldMint: boolean;
  jsonOnly: boolean;
} {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error(`
CCTP Attestation Fetch

Usage: cctp-fetch <txHash> <sourceDomain> [mainnet|testnet] [--poll] [--interval <ms>] [--mint] [--json]

Arguments:
  txHash         Transaction hash of the CCTP burn (depositForBurn)
  sourceDomain   Circle domain of source chain (0-7)
  mainnet|testnet Optional, defaults to mainnet
  --poll        Poll at fixed interval until complete (default: 30s)
  --interval N  Poll interval in ms (default: 30000)
  --mint        Mint USDC when attestation ready (requires PRIVATE_KEY)
  --json        Output only attestation JSON when complete

Example:
  cctp-fetch 0xabc123... 6 testnet --mint
  cctp-fetch 0xabc123... 6 mainnet --poll --mint
`);
    process.exit(1);
  }

  const doMint = args.includes('--mint');
  const jsonOnly = args.includes('--json');
  const poll = args.includes('--poll');
  const intervalIdx = args.indexOf('--interval');
  const intervalMs =
    intervalIdx >= 0 && args[intervalIdx + 1]
      ? parseInt(args[intervalIdx + 1], 10)
      : DEFAULT_POLL_INTERVAL_MS;
  const filtered = args.filter((a, i) => {
    if (['--mint', '--json', '--poll'].includes(a)) return false;
    if (a === '--interval' || (i > 0 && args[i - 1] === '--interval')) return false;
    return true;
  });
  const [txHash, domainStr, network = 'mainnet'] = filtered;

  const sourceDomain = parseInt(domainStr, 10);
  if (isNaN(sourceDomain) || sourceDomain < 0) {
    console.error('Error: sourceDomain must be a non-negative integer');
    process.exit(1);
  }
  if (network !== 'mainnet' && network !== 'testnet') {
    console.error('Error: network must be "mainnet" or "testnet"');
    process.exit(1);
  }

  if (poll && (isNaN(intervalMs) || intervalMs < 1000)) {
    console.error('Error: --interval must be at least 1000 ms');
    process.exit(1);
  }

  return {
    txHash,
    sourceDomain,
    network,
    poll,
    intervalMs: poll ? intervalMs : DEFAULT_POLL_INTERVAL_MS,
    shouldMint: doMint,
    jsonOnly,
  };
}

function printResult(
  result: Awaited<ReturnType<typeof fetchAttestation>>,
  jsonOnly: boolean
): void {
  if (jsonOnly && result.status === 'complete') {
    const mintable = {
      attestation: result.attestation,
      message: result.message,
      decodedMessage: result.decodedMessage,
    };
    console.log(JSON.stringify(mintable, null, 2));
    return;
  }

  console.log('Result:', JSON.stringify(result, null, 2));
  console.log();

  switch (result.status) {
    case 'complete':
      console.log('✓ Attestation is ready! This can be used to mint USDC on the destination chain.');
      break;
    case 'pending':
      console.log('⏳ Attestation is still pending. CCTP attestations typically take 10-20 minutes on mainnet.');
      console.log('   Run this script again to check status.');
      break;
    case 'failed':
      console.log('✗ Failed to fetch attestation.');
      break;
  }
}

async function doMint(
  attestationData: { attestation: string; message: string; decodedMessage: unknown },
  network: Network
): Promise<void> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('\n✗ --mint requires PRIVATE_KEY environment variable');
    process.exit(1);
  }

  const destDomain = (attestationData.decodedMessage as { destinationDomain?: number })
    ?.destinationDomain;
  const accountAddress = process.env.STARKNET_ACCOUNT_ADDRESS || undefined;
  if (destDomain === 25 && !accountAddress) {
    console.error('\n✗ Starknet mint requires STARKNET_ACCOUNT_ADDRESS');
    process.exit(1);
  }

  try {
    const result = await mint(
      attestationData as Parameters<typeof mint>[0],
      privateKey,
      {
        preferMainnet: network === 'mainnet',
        accountAddress: destDomain === 25 ? accountAddress : undefined,
      }
    );
    if (result.alreadyProcessed) {
      console.log('\n✓ Message was already minted on destination chain (no action needed).');
    } else {
      console.log('\n✓ Mint successful!');
      console.log(`  Tx Hash: ${result.txHash}`);
      console.log(`  Gas Used: ${result.gasUsed}`);
    }
  } catch (err) {
    console.error('\n✗ Mint failed:', (err as Error).message);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const { txHash, sourceDomain, network, poll, intervalMs, shouldMint, jsonOnly } =
    parseArgs();

  console.log(`CCTP Attestation (${network})\n`);
  console.log(`Tx Hash:       ${txHash}`);
  console.log(`Source Domain: ${sourceDomain}`);
  if (poll) console.log(`Mode:          Poll every ${intervalMs / 1000}s`);
  if (shouldMint) console.log(`Mint:          Enabled`);
  console.log();

  const result = poll
    ? await pollAttestation(txHash, sourceDomain, network, {
        intervalMs,
        quiet: false,
      })
    : await fetchAttestation(txHash, sourceDomain, network);

  if (result.status === 'complete' && shouldMint) {
    await doMint(result, network);
  } else {
    printResult(result, jsonOnly);
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
