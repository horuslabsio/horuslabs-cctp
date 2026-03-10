# @horuslabs/cctp

Framework-agnostic package for **Circle's CCTP (Cross-Chain Transfer Protocol)** — fetch attestations and mint USDC on destination chains.

## Install

```bash
npm install @horuslabs/cctp
```

## What is CCTP?

CCTP enables **native USDC** to move between EVM chains (Ethereum, Base, Arbitrum, Avalanche, Polygon, etc.) by:

1. **Burn** – USDC is burned on the source chain
2. **Attest** – Circle's attestation service signs the burn (proves it happened)
3. **Mint** – USDC is minted on the destination chain using the attestation

Unlike wrapped bridges, CCTP moves **native** USDC—no synthetic tokens.

## API

```ts
import {
    fetchAttestation,
    pollAttestation,
    mint,
    DOMAIN_CONFIG
} from "@horuslabs/cctp";

// Single fetch (no retry)
const result = await fetchAttestation(txHash, sourceDomain, "testnet");

// Fixed-interval polling until complete (suitable for 4+ hour attestations)
const attested = await pollAttestation(txHash, sourceDomain, "mainnet", {
    intervalMs: 30000, // poll every 30s
    signal: abortController.signal // optional: cancel polling
});

// Mint on destination chain (EVM)
const mintResult = await mint(attestationData, privateKey, {
    preferMainnet: false,
    rpcUrl: "https://sepolia.base.org" // optional override
});

// Mint on Starknet (domain 25) – requires accountAddress
const starknetResult = await mint(attestationData, privateKey, {
    preferMainnet: false,
    accountAddress: "0x...", // deployed Starknet account contract
});
```

### Exports

| Export                                                            | Description                                             |
| ----------------------------------------------------------------- | ------------------------------------------------------- |
| `fetchAttestation`                                                | One API call to Circle, returns status                  |
| `pollAttestation`                                                 | Poll at fixed interval until complete or failed         |
| `mint`                                                            | Call `receiveMessage` / `receive_message` on destination (EVM or Starknet) |
| `mintStarknet`                                                    | Mint directly on Starknet (domain 25)                   |
| `DOMAIN_CONFIG`                                                   | Domain → RPC + transmitter address mapping              |
| `CCTP_API_URLS`, `DEFAULT_POLL_INTERVAL_MS`, `REQUEST_TIMEOUT_MS` | Config constants                                        |

### Types

```ts
import type {
    AttestationResult,
    AttestationData,
    MintResult,
    MintOptions,
    PollAttestationOptions
} from "@horuslabs/cctp";
```

## CLI

After `npm install`, use the `cctp-fetch` and `cctp-mint` binaries:

```bash
# Fetch attestation (single call)
npx cctp-fetch <txHash> <sourceDomain> [mainnet|testnet] [--poll] [--interval <ms>] [--mint] [--json]

# Mint from attestation JSON
PRIVATE_KEY=0x... npx cctp-mint <attestation.json>
PRIVATE_KEY=0x... npx cctp-mint -   # read from stdin
```

**Examples:**

```bash
# Single fetch
npx cctp-fetch 0x1234... 6 testnet

# Poll at fixed interval until complete (every 30s by default)
npx cctp-fetch 0x1234... 6 mainnet --poll

# Poll then mint
PRIVATE_KEY=0x... npx cctp-fetch 0x1234... 6 mainnet --poll --mint

# Pipe attestation to mint
npx cctp-fetch 0x... 6 testnet --json 2>/dev/null | PRIVATE_KEY=0x... npx cctp-mint -
```

**Environment:** `PRIVATE_KEY` (required for mint), `RPC_URL` (optional), `PREFER_MAINNET` (default `true`), `STARKNET_ACCOUNT_ADDRESS` (required for Starknet mint).

## Starknet (domain 25)

Minting to Starknet requires a **deployed account** (ArgentX, Braavos, or compatible) and its private key. The `accountAddress` must match the CCTP burn recipient.

**API:**

```ts
import { mint, mintStarknet } from "@horuslabs/cctp";

// Use mint() – automatically routes to Starknet when destinationDomain is 25
const result = await mint(attestationData, privateKey, {
    preferMainnet: false,
    accountAddress: "0x...", // your deployed Starknet account
});

// Or use mintStarknet directly
const result = await mintStarknet(attestationData, privateKey, {
    accountAddress: "0x...",
    preferMainnet: false,
});
```

**CLI:**

```bash
# Mint to Starknet
PRIVATE_KEY=0x... STARKNET_ACCOUNT_ADDRESS=0x... npx cctp-mint attestation.json

# Fetch attestation then mint to Starknet
PRIVATE_KEY=0x... STARKNET_ACCOUNT_ADDRESS=0x... npx cctp-fetch <txHash> 6 mainnet --poll --mint
```

## Domain IDs

| Domain | Chains                     |
| ------ | -------------------------- |
| 0      | Ethereum Mainnet / Sepolia |
| 1      | Avalanche C-Chain / Fuji   |
| 2      | Optimism / OP Sepolia      |
| 3      | Arbitrum One / Arb Sepolia |
| 6      | Base / Base Sepolia        |
| 7      | Polygon                    |
| 25     | Starknet Mainnet / Sepolia |

## References

-   [Circle CCTP Documentation](https://developers.circle.com/stablecoins/docs/cctp-getting-started)
-   [CCTP API Reference](https://developers.circle.com/api-reference/cctp/all/get-messages-v-2)
