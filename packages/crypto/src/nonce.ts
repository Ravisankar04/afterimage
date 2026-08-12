/**
 * Nonce helpers for EIP-712 replay protection.
 */

export type Address = `0x${string}`;

/** In-memory nonce store keyed by owner address. */
export class NonceManager {
  private readonly nonces = new Map<string, bigint>();

  constructor(initial?: Iterable<[Address, bigint]>) {
    if (initial) {
      for (const [addr, nonce] of initial) {
        this.nonces.set(addr.toLowerCase(), nonce);
      }
    }
  }

  get(owner: Address): bigint {
    return this.nonces.get(owner.toLowerCase()) ?? 0n;
  }

  /**
   * Return current nonce then increment (for building a new signed message).
   */
  consume(owner: Address): bigint {
    const current = this.get(owner);
    this.nonces.set(owner.toLowerCase(), current + 1n);
    return current;
  }

  set(owner: Address, nonce: bigint): void {
    if (nonce < 0n) {
      throw new Error("nonce must be non-negative");
    }
    this.nonces.set(owner.toLowerCase(), nonce);
  }

  /**
   * Sync from on-chain nonce if local is behind.
   */
  syncFromChain(owner: Address, onChainNonce: bigint): void {
    const local = this.get(owner);
    if (onChainNonce > local) {
      this.set(owner, onChainNonce);
    }
  }

  peekNext(owner: Address): bigint {
    return this.get(owner);
  }
}

/**
 * Validate deadline has not passed (unix seconds).
 */
export function isDeadlineValid(deadline: bigint | number, nowSeconds?: number): boolean {
  const now = BigInt(nowSeconds ?? Math.floor(Date.now() / 1000));
  return BigInt(deadline) >= now;
}

/**
 * Default deadline: now + ttlSeconds (default 1 hour).
 */
export function defaultDeadline(ttlSeconds = 3600): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + ttlSeconds);
}
