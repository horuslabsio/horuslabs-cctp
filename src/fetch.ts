/**
 * CCTP attestation fetch from Circle API
 */

import {
  CCTP_API_URLS,
  DEFAULT_POLL_INTERVAL_MS,
  REQUEST_TIMEOUT_MS,
} from './config.js';
import type {
  AttestationResult,
  FetchOptions,
  Network,
  PollAttestationOptions,
} from './types.js';

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(resolve, ms);
    if (signal) {
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timeoutId);
          reject(new DOMException('Aborted', 'AbortError'));
        },
        { once: true }
      );
    }
  });
}

/**
 * Fetch attestation status from Circle's CCTP API (single call, no retry)
 */
export async function fetchAttestation(
  txHash: string,
  sourceDomain: number,
  network: Network,
  options: FetchOptions = {}
): Promise<AttestationResult> {
  const { timeoutMs = REQUEST_TIMEOUT_MS, quiet = false } = options;
  const baseUrl = CCTP_API_URLS[network];
  const url = `${baseUrl}/messages/${sourceDomain}?transactionHash=${encodeURIComponent(txHash)}`;

  if (!quiet) {
    console.log(`Fetching: ${url}\n`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        return {
          status: 'pending',
          message: 'Message not indexed yet. Poll again in a few minutes.',
        };
      }
      const text = await response.text();
      return { status: 'failed', error: `HTTP ${response.status}: ${text}` };
    }

    const data = (await response.json()) as { messages?: Array<{
      status?: string;
      attestation?: string;
      message?: string;
      decodedMessage?: { destinationDomain: number; [k: string]: unknown };
    }> };

    if (!data.messages || data.messages.length === 0) {
      return { status: 'pending', message: 'No messages in response yet.' };
    }

    const firstMessage = data.messages[0];
    if (firstMessage.status === 'complete' && firstMessage.attestation) {
      return {
        status: 'complete',
        attestation: firstMessage.attestation,
        message: firstMessage.message!,
        decodedMessage: firstMessage.decodedMessage!,
      };
    }

    return {
      status: 'pending',
      messageStatus: firstMessage.status ?? 'unknown',
      message: 'Attestation not ready yet. Poll again.',
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const error = err as Error;
    if (error.name === 'AbortError') {
      return {
        status: 'pending',
        retriable: true,
        error: `Request timed out after ${timeoutMs / 1000}s`,
      };
    }
    return { status: 'pending', retriable: true, error: error.message };
  }
}

/**
 * Poll for attestation at a fixed interval until complete or failed.
 * Suitable for long-running attestations (e.g. 4+ hours).
 */
export async function pollAttestation(
  txHash: string,
  sourceDomain: number,
  network: Network,
  options: PollAttestationOptions = {}
): Promise<AttestationResult> {
  const {
    intervalMs = DEFAULT_POLL_INTERVAL_MS,
    signal,
    timeoutMs = REQUEST_TIMEOUT_MS,
    quiet = true,
  } = options;

  let attempt = 0;
  for (;;) {
    const result = await fetchAttestation(txHash, sourceDomain, network, {
      timeoutMs,
      quiet,
    });

    if (result.status === 'complete' || result.status === 'failed') {
      return result;
    }

    attempt += 1;
    try {
      await sleep(intervalMs, signal);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return {
          status: 'pending',
          message: 'Polling aborted',
          error: err.message,
        };
      }
      throw err;
    }
  }
}
