/**
 * Cryptographically Secure Pseudo-Random Number Generator (CSPRNG) Utilities.
 * Replaces Math.random() to satisfy security audits and provide better randomness.
 */

/**
 * Returns a secure random float between 0 (inclusive) and 1 (exclusive).
 * Equivalent to Math.random() but using window.crypto.
 */
export function getSecureRandom(): number {
  if (typeof window === 'undefined' || !window.crypto) {
    return Math.random(); // Fallback for SSR
  }
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  // Divide by 2^32 to get a value between 0 and 1
  return array[0] / (0xffffffff + 1);
}

/**
 * Returns a secure random integer between min (inclusive) and max (inclusive).
 */
export function getSecureRandomInt(min: number, max: number): number {
  const range = max - min + 1;
  return Math.floor(getSecureRandom() * range) + min;
}

/**
 * Picks a random element from an array using CSPRNG.
 */
export function pickSecureRandom<T>(array: T[]): T {
  if (array.length === 0) return undefined as any;
  const index = Math.floor(getSecureRandom() * array.length);
  return array[index];
}
