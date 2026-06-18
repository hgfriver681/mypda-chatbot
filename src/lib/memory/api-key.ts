import { createHash, randomBytes } from "node:crypto";

// API keys identify a memory account to the Python FastMCP server. The server
// (server/db.py, server/make_key.py) stores only sha256(key) hex and derives a
// 14-char display prefix. We MUST keep this format byte-compatible so keys
// minted here authenticate against the unchanged server.
//   plaintext = "mpda_" + base64url(24 random bytes)   (== 37 chars)
//   hash      = sha256(plaintext) hex
//   prefix    = plaintext[:14]
const KEY_BYTES = 24;
export const API_KEY_PREFIX_LEN = 14;

export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export interface GeneratedApiKey {
  plaintext: string; // shown to the user exactly once
  hash: string; // stored in api_keys.key_hash
  prefix: string; // stored in api_keys.prefix (display only)
}

export function generateApiKey(): GeneratedApiKey {
  const plaintext = "mpda_" + randomBytes(KEY_BYTES).toString("base64url");
  return {
    plaintext,
    hash: hashApiKey(plaintext),
    prefix: plaintext.slice(0, API_KEY_PREFIX_LEN),
  };
}
