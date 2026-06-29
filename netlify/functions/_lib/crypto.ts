/**
 * Shared cryptographic primitives for Netlify Functions.
 *
 * Consolidates the constant-time comparison and SHA-256 helpers that were
 * independently reimplemented in admin-auth, platform-health, platform-actions,
 * and the onboarding functions (some via `node:crypto`, some via hand-rolled
 * XOR loops). One audited implementation is safer than five copies.
 */
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Constant-time string comparison. Returns `false` on length mismatch without
 * short-circuiting in a way that leaks length via timing. Use for comparing
 * tokens, password hashes, or signatures.
 */
export function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    // Burn a comparison against self so the rejected path costs the same.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/** Hex-encoded SHA-256 digest of a UTF-8 string. */
export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Constant-time comparison of a plaintext value against an expected SHA-256
 * hex digest. Convenience for the admin-auth password check pattern.
 */
export function verifySha256(plaintext: string, expectedHex: string): boolean {
  return timingSafeEqualStr(sha256Hex(plaintext), expectedHex);
}
