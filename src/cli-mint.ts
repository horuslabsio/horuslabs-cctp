#!/usr/bin/env node
/**
 * CLI for CCTP mint
 */

import { readFile } from 'fs/promises';
import { mint } from './index.js';

async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: (string | Buffer)[] = [];
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (c: string | Buffer) => chunks.push(c));
    process.stdin.on('end', () =>
      resolve(chunks.map((c) => (typeof c === 'string' ? c : c.toString())).join(''))
    );
    process.stdin.on('error', reject);
  });
}

async function main(): Promise<void> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error(`
CCTP Mint

Usage: cctp-mint <attestation.json>
       cctp-mint -   # read from stdin (JSON)

Environment:
  PRIVATE_KEY     (required) Wallet private key
  RPC_URL         (optional) Override destination chain RPC
  PREFER_MAINNET  (optional) 'false' for testnet, default true

Example:
  PRIVATE_KEY=0x... cctp-mint attestation.json
`);
    process.exit(1);
  }

  const preferMainnet = process.env.PREFER_MAINNET !== 'false';
  const rpcUrl = process.env.RPC_URL || undefined;

  const arg = process.argv[2];
  if (!arg) {
    console.error('Error: provide attestation file path or "-" for stdin');
    process.exit(1);
  }

  const raw =
    arg === '-' ? await readStdin() : await readFile(arg, { encoding: 'utf-8' });
  const input = (typeof raw === 'string' ? raw : String(raw)).trim();

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(input) as Record<string, unknown>;
  } catch {
    console.error('Error: invalid JSON input');
    process.exit(1);
  }

  if (data.status === 'complete') {
    data = {
      attestation: data.attestation,
      message: data.message,
      decodedMessage: data.decodedMessage,
    };
  }

  if (!data.attestation || !data.message || !data.decodedMessage) {
    console.error('Error: attestation must have attestation, message, decodedMessage');
    process.exit(1);
  }

  console.log('Minting USDC on destination chain...\n');

  try {
    const result = await mint(data as unknown as Parameters<typeof mint>[0], privateKey, {
      rpcUrl: rpcUrl ?? null,
      preferMainnet,
    });

    if (result.alreadyProcessed) {
      console.log('✓ Message was already minted (no action needed).');
    } else {
      console.log('✓ Mint successful!');
      console.log(`  Tx Hash: ${result.txHash}`);
      console.log(`  Gas Used: ${result.gasUsed}`);
    }
  } catch (err) {
    console.error('✗ Mint failed:', (err as Error).message);
    process.exit(1);
  }
}

main();
