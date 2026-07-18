import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function encryptionKey(): Buffer {
  const configured = process.env.TOKEN_ENCRYPTION_KEY?.trim();
  if (!configured) {
    throw new Error("TOKEN_ENCRYPTION_KEY is not configured.");
  }
  const decoded = Buffer.from(configured, "base64");
  if (decoded.length !== 32 || decoded.toString("base64") !== configured) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must be exactly 32 random bytes encoded as base64.",
    );
  }
  return decoded;
}

export function encryptToken(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((item) => item.toString("base64url")).join(".");
}

export function decryptToken(value: string): string {
  const [iv, tag, encrypted] = value.split(".").map((item) => Buffer.from(item, "base64url"));
  if (!iv || !tag || !encrypted) throw new Error("Stored OAuth token is invalid.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
