import { describe, expect, it } from "vitest";
import {
  productionReadinessIssues,
  type ProductionEnvironment,
} from "@/lib/production-readiness";

const readyEnvironment: ProductionEnvironment = {
  NEXT_PUBLIC_APP_URL: "https://preview.example.com",
  DATABASE_URL: "postgresql://pooler.example.com/postr",
  DIRECT_URL: "postgresql://direct.example.com/postr",
  ASSET_STORAGE_PROVIDER: "vercel-blob",
  BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_example",
  AUTH_MODE: "password",
  ADMIN_EMAIL: "recruiter@example.com",
  ADMIN_PASSWORD_HASH:
    "$2b$12$01234567890123456789012345678901234567890123456789012",
  AUTH_SECRET: "01234567890123456789012345678901",
  VISION_PROVIDER: "openai",
  OPENAI_API_KEY: "test-key",
  GOOGLE_CLIENT_ID: "test-client",
  GOOGLE_CLIENT_SECRET: "test-secret",
  GOOGLE_REDIRECT_URI:
    "https://preview.example.com/api/auth/google/callback",
  TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
};

describe("production readiness", () => {
  it("accepts a complete production configuration", () => {
    expect(productionReadinessIssues(readyEnvironment)).toEqual([]);
  });

  it("reports unsafe development defaults without exposing values", () => {
    const issues = productionReadinessIssues({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      DATABASE_URL: "file:./dev.db",
      ASSET_STORAGE_PROVIDER: "local",
      AUTH_MODE: "demo",
      VISION_PROVIDER: "grok",
    });

    expect(issues.map((issue) => issue.key)).toEqual(
      expect.arrayContaining([
        "NEXT_PUBLIC_APP_URL",
        "DATABASE_URL",
        "DIRECT_URL",
        "ASSET_STORAGE_PROVIDER",
        "BLOB_AUTH",
        "AUTH_MODE",
        "VISION_PROVIDER",
        "GOOGLE_REDIRECT_URI",
        "TOKEN_ENCRYPTION_KEY",
      ]),
    );
    expect(JSON.stringify(issues)).not.toContain("file:./dev.db");
  });

  it("requires the Google callback to match the application origin", () => {
    const issues = productionReadinessIssues({
      ...readyEnvironment,
      GOOGLE_REDIRECT_URI:
        "https://attacker.example.com/api/auth/google/callback",
    });

    expect(issues).toContainEqual(
      expect.objectContaining({ key: "GOOGLE_REDIRECT_URI" }),
    );
  });

  it("accepts private Blob OIDC authentication without a static token", () => {
    const issues = productionReadinessIssues({
      ...readyEnvironment,
      BLOB_READ_WRITE_TOKEN: "",
      BLOB_STORE_ID: "store_example",
      VERCEL_OIDC_TOKEN: "oidc-example",
    });

    expect(issues).toEqual([]);
  });
});
