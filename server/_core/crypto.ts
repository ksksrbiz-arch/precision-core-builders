/**
 * AES-256-GCM symmetric encryption for secrets at rest.
 *
 * Used by the Blueprint integration to store OAuth tokens and API keys in
 * `blueprint_connections.access_token_enc` / `refresh_token_enc` / `api_key_enc`
 * without ever holding them in plaintext in the database.
 *
 * The key is read from `BLUEPRINT_ENCRYPTION_KEY` and must be a 32-byte value
 * encoded as 64 hex characters.  Generate one with:
 *
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * and store the result in the Netlify dashboard — never in the repo.
 *
 * Output format: base64( iv (12 bytes) || authTag (16 bytes) || ciphertext )
 */
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { ENV } from "./env";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;

function getKey(): Buffer {
  // Read from process.env directly so tests can override at runtime. Fall
  // back to the captured ENV value for consistency with other modules.
  const hex =
    process.env.BLUEPRINT_ENCRYPTION_KEY ?? ENV.blueprintEncryptionKey;
  if (!hex) {
    throw new Error(
      "BLUEPRINT_ENCRYPTION_KEY is not configured. Generate a 32-byte hex key and add it to Netlify environment variables."
    );
  }
  const key = Buffer.from(hex, "hex");
  if (key.length !== KEY_LEN) {
    throw new Error(
      `BLUEPRINT_ENCRYPTION_KEY must decode to ${KEY_LEN} bytes (got ${key.length}). Use 64 hex characters.`
    );
  }
  return key;
}

/** Encrypt a UTF-8 string, returning a base64 payload safe for database storage. */
export function encryptSecret(plaintext: string): string {
  if (typeof plaintext !== "string") {
    throw new TypeError("encryptSecret requires a string input");
  }
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

/** Decrypt a payload produced by `encryptSecret`.  Throws on tampering. */
export function decryptSecret(payload: string): string {
  if (typeof payload !== "string" || !payload) {
    throw new TypeError("decryptSecret requires a non-empty string payload");
  }
  const buf = Buffer.from(payload, "base64");
  if (buf.length < IV_LEN + TAG_LEN + 1) {
    throw new Error("Encrypted payload is malformed or truncated");
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc = buf.subarray(IV_LEN + TAG_LEN);
  const key = getKey();
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}

/**
 * Constant-time HMAC-SHA256 signature for OAuth `state` parameters.
 *
 * We derive a key from the same encryption secret so CSRF signing doesn't
 * require a second configured value.  Not used for secret storage — only for
 * detecting tampering with round-tripped OAuth state blobs.
 */
export function signState(value: string): string {
  if (!value) throw new TypeError("signState requires a value");
  const { createHmac } = require("node:crypto") as typeof import("node:crypto");
  const key = getKey();
  return createHmac("sha256", key).update(value).digest("hex");
}

export function verifyState(value: string, signature: string): boolean {
  if (!value || !signature) return false;
  const expected = signState(value);
  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** True when an encryption key is configured — useful for feature gating. */
export function isCryptoConfigured(): boolean {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}
