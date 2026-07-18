import { normalizeEmail } from "@/lib/email";

export function isDuplicateEmail(
  candidate: string,
  existingNormalizedEmails: readonly string[],
): boolean {
  const normalized = normalizeEmail(candidate);
  return existingNormalizedEmails.some((email) => email === normalized);
}

export function isSuppressedEmail(
  candidate: string,
  suppressedNormalizedEmails: readonly string[],
): boolean {
  const normalized = normalizeEmail(candidate);
  return suppressedNormalizedEmails.some((email) => email === normalized);
}
