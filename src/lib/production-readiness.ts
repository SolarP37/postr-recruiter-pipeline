export type ProductionReadinessIssue = {
  key: string;
  message: string;
};

export type ProductionEnvironment = Readonly<
  Record<string, string | undefined>
>;

function nonEmpty(value: string | undefined): value is string {
  return Boolean(value?.trim());
}

function httpsUrl(value: string | undefined): URL | null {
  if (!nonEmpty(value)) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" ? parsed : null;
  } catch {
    return null;
  }
}

function postgresUrl(value: string | undefined): boolean {
  return Boolean(value && /^postgres(ql)?:\/\//i.test(value));
}

function isThirtyTwoByteBase64(value: string | undefined): boolean {
  if (!nonEmpty(value) || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    return false;
  }
  try {
    return Buffer.from(value, "base64").length === 32;
  } catch {
    return false;
  }
}

export function productionReadinessIssues(
  env: ProductionEnvironment = process.env,
): ProductionReadinessIssue[] {
  const issues: ProductionReadinessIssue[] = [];
  const add = (key: string, message: string) => issues.push({ key, message });

  const appUrl = httpsUrl(env.NEXT_PUBLIC_APP_URL);
  if (!appUrl) {
    add("NEXT_PUBLIC_APP_URL", "Use the exact HTTPS deployment origin.");
  }

  if (!postgresUrl(env.DATABASE_URL)) {
    add("DATABASE_URL", "Use the PostgreSQL transaction-pooler URL.");
  }
  if (!postgresUrl(env.DIRECT_URL)) {
    add("DIRECT_URL", "Use the direct PostgreSQL migration URL.");
  }

  if (env.ASSET_STORAGE_PROVIDER !== "vercel-blob") {
    add(
      "ASSET_STORAGE_PROVIDER",
      "Use vercel-blob so screenshots are not written to ephemeral storage.",
    );
  }
  const hasBlobToken = nonEmpty(env.BLOB_READ_WRITE_TOKEN);
  const hasBlobOidc =
    nonEmpty(env.BLOB_STORE_ID) && nonEmpty(env.VERCEL_OIDC_TOKEN);
  if (!hasBlobToken && !hasBlobOidc) {
    add(
      "BLOB_AUTH",
      "Connect a private Blob store using a token or Vercel OIDC.",
    );
  }

  if (env.AUTH_MODE !== "password") {
    add("AUTH_MODE", "Disable demo authentication with AUTH_MODE=password.");
  }
  if (
    !nonEmpty(env.ADMIN_EMAIL) ||
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(env.ADMIN_EMAIL)
  ) {
    add("ADMIN_EMAIL", "Configure a valid recruiter administrator email.");
  }
  if (!nonEmpty(env.CRON_SECRET) || env.CRON_SECRET.length < 16) {
    add(
      "CRON_SECRET",
      "Configure at least 16 random characters to protect scheduled backups.",
    );
  }
  if (
    !nonEmpty(env.ADMIN_PASSWORD_HASH) ||
    !/^\$2[aby]\$\d{2}\$.{53}$/.test(env.ADMIN_PASSWORD_HASH)
  ) {
    add("ADMIN_PASSWORD_HASH", "Configure a bcrypt administrator password hash.");
  }
  if (!nonEmpty(env.AUTH_SECRET) || env.AUTH_SECRET.length < 32) {
    add("AUTH_SECRET", "Configure at least 32 random characters.");
  }

  const visionProvider = env.VISION_PROVIDER || "mock";
  if (!["mock", "openai"].includes(visionProvider)) {
    add("VISION_PROVIDER", "Use the supported mock or openai provider.");
  } else if (visionProvider === "openai" && !nonEmpty(env.OPENAI_API_KEY)) {
    add("OPENAI_API_KEY", "Configure an OpenAI key for vision extraction.");
  }

  const googleKeys = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
  ] as const;
  for (const key of googleKeys) {
    if (!nonEmpty(env[key])) {
      add(key, "Configure the Google OAuth application credential.");
    }
  }

  const googleRedirect = httpsUrl(env.GOOGLE_REDIRECT_URI);
  if (
    !googleRedirect ||
    !appUrl ||
    googleRedirect.origin !== appUrl.origin ||
    googleRedirect.pathname !== "/api/auth/google/callback" ||
    googleRedirect.search ||
    googleRedirect.hash
  ) {
    add(
      "GOOGLE_REDIRECT_URI",
      "Use the deployment origin followed by /api/auth/google/callback.",
    );
  }

  if (!isThirtyTwoByteBase64(env.TOKEN_ENCRYPTION_KEY)) {
    add(
      "TOKEN_ENCRYPTION_KEY",
      "Configure exactly 32 random bytes encoded as base64.",
    );
  }

  if (!nonEmpty(env.OUTREACH_POSTAL_ADDRESS)) {
    add(
      "OUTREACH_POSTAL_ADDRESS",
      "Configure a valid sender postal address before creating or sending outreach drafts.",
    );
  }
  if (
    !nonEmpty(env.OUTREACH_CONTACT_EMAIL) ||
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(env.OUTREACH_CONTACT_EMAIL)
  ) {
    add(
      "OUTREACH_CONTACT_EMAIL",
      "Configure a monitored sender contact email for outreach disclosures.",
    );
  }

  return issues;
}
