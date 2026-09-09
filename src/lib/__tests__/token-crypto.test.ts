import { afterEach, describe, expect, it } from "vitest";
import { decryptToken, encryptToken } from "@/lib/token-crypto";

const original = process.env.TOKEN_ENCRYPTION_KEY;
afterEach(() => { process.env.TOKEN_ENCRYPTION_KEY = original; });

describe("encrypted token storage", () => {
  it("encrypts and decrypts without exposing plaintext", () => {
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    const encrypted = encryptToken("refresh-token-value");
    expect(encrypted).not.toContain("refresh-token-value");
    expect(decryptToken(encrypted)).toBe("refresh-token-value");
  });

  it.each([
    "weak-passphrase",
    Buffer.alloc(31, 7).toString("base64"),
    Buffer.alloc(33, 7).toString("base64"),
  ])("rejects invalid encryption keys", (key) => {
    process.env.TOKEN_ENCRYPTION_KEY = key;
    expect(() => encryptToken("refresh-token-value")).toThrow(
      "TOKEN_ENCRYPTION_KEY must be exactly 32 random bytes encoded as base64.",
    );
  });
});
