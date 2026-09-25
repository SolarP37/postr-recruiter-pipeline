import { google } from "googleapis";
import { db } from "@/lib/db";
import { decryptToken, encryptToken } from "@/lib/token-crypto";

export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.compose";
export const GMAIL_CAPTURE_SCOPE =
  "https://www.googleapis.com/auth/gmail.readonly";
export const GMAIL_SCOPES = [GMAIL_SCOPE, GMAIL_CAPTURE_SCOPE] as const;

export function hasGmailCaptureScope(scope: string | null | undefined) {
  return Boolean(scope?.split(/\s+/).includes(GMAIL_CAPTURE_SCOPE));
}

export function googleOAuthClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new Error("Google OAuth credentials are not configured.");
  }
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

export async function connectedGoogleClient() {
  const record = await db.oAuthToken.findUnique({ where: { provider: "google" } });
  if (!record) throw new Error("Gmail is not connected.");
  const client = googleOAuthClient();
  client.setCredentials({
    access_token: record.encryptedAccessToken ? decryptToken(record.encryptedAccessToken) : undefined,
    refresh_token: record.encryptedRefreshToken ? decryptToken(record.encryptedRefreshToken) : undefined,
    scope: record.scope || undefined,
    token_type: record.tokenType || undefined,
    expiry_date: record.expiryDate?.getTime(),
  });
  client.on("tokens", async (tokens) => {
    await db.oAuthToken.update({
      where: { provider: "google" },
      data: {
        encryptedAccessToken: tokens.access_token ? encryptToken(tokens.access_token) : undefined,
        encryptedRefreshToken: tokens.refresh_token ? encryptToken(tokens.refresh_token) : undefined,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      },
    });
  });
  return client;
}

export function gmailRawMessage(
  to: string,
  subject: string,
  body: string,
  htmlBody?: string | null,
): string {
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`;
  if (!htmlBody) {
    const lines = [
      `To: ${to}`,
      `Subject: ${encodedSubject}`,
      "MIME-Version: 1.0",
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      body,
    ];
    return Buffer.from(lines.join("\r\n")).toString("base64url");
  }

  const boundary = "postr-recruiter-alternative";
  const lines = [
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    body,
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    htmlBody,
    `--${boundary}--`,
  ];
  return Buffer.from(lines.join("\r\n")).toString("base64url");
}
