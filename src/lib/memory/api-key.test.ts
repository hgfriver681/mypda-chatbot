import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { generateApiKey, hashApiKey, API_KEY_PREFIX_LEN } from "./api-key";

// These keys are validated by the (unchanged) Python FastMCP server, which
// stores sha256(key) hex and derives prefix = key[:14]. The format must stay
// byte-compatible: "mpda_" + base64url(24 bytes) == 37 chars, sha256 hex hash.
describe("memory api-key", () => {
  describe("generateApiKey", () => {
    it("produces an mpda_-prefixed plaintext of the expected length", () => {
      const { plaintext } = generateApiKey();
      expect(plaintext.startsWith("mpda_")).toBe(true);
      // "mpda_" (5) + base64url(24 bytes) (32, no padding) = 37
      expect(plaintext).toHaveLength(37);
      expect(plaintext).toMatch(/^mpda_[A-Za-z0-9_-]{32}$/);
    });

    it("derives prefix as the first 14 chars (display only)", () => {
      const { plaintext, prefix } = generateApiKey();
      expect(prefix).toBe(plaintext.slice(0, API_KEY_PREFIX_LEN));
      expect(API_KEY_PREFIX_LEN).toBe(14);
    });

    it("stores only the sha256 hex hash, matching hashApiKey(plaintext)", () => {
      const { plaintext, hash } = generateApiKey();
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
      expect(hash).toBe(hashApiKey(plaintext));
    });

    it("is random: two keys differ in plaintext and hash", () => {
      const a = generateApiKey();
      const b = generateApiKey();
      expect(a.plaintext).not.toBe(b.plaintext);
      expect(a.hash).not.toBe(b.hash);
    });
  });

  describe("hashApiKey", () => {
    it("matches a known sha256 vector (parity with Python hashlib.sha256)", () => {
      const known = createHash("sha256").update("mpda_test").digest("hex");
      expect(hashApiKey("mpda_test")).toBe(known);
    });

    it("is deterministic", () => {
      expect(hashApiKey("same")).toBe(hashApiKey("same"));
    });
  });
});
