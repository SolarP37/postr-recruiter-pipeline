import { db } from "@/lib/db";

export const BACKUP_FORMAT = "postr-recruit-pipeline-v1";

export type BackupSnapshot = {
  format: typeof BACKUP_FORMAT;
  createdAt: string;
  counts: Record<string, number>;
  data: {
    prospects: unknown[];
    outreachMessages: unknown[];
    deliveryAttempts: unknown[];
    sourceAssets: unknown[];
    suppressionEntries: unknown[];
    auditEvents: unknown[];
  };
};

export async function buildBackupSnapshot(): Promise<BackupSnapshot> {
  const [
    prospects,
    outreachMessages,
    deliveryAttempts,
    sourceAssets,
    suppressionEntries,
    auditEvents,
  ] = await Promise.all([
    db.prospect.findMany({ orderBy: { createdAt: "asc" } }),
    db.outreachMessage.findMany({ orderBy: { createdAt: "asc" } }),
    db.deliveryAttempt.findMany({ orderBy: { startedAt: "asc" } }),
    db.sourceAsset.findMany({ orderBy: { createdAt: "asc" } }),
    db.suppressionEntry.findMany({ orderBy: { createdAt: "asc" } }),
    db.auditEvent.findMany({ orderBy: { createdAt: "asc" } }),
  ]);
  const data = {
    prospects,
    outreachMessages,
    deliveryAttempts,
    sourceAssets,
    suppressionEntries,
    auditEvents,
  };
  return {
    format: BACKUP_FORMAT,
    createdAt: new Date().toISOString(),
    counts: Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, value.length]),
    ),
    data,
  };
}

export function validateBackupSnapshot(value: unknown): string[] {
  const errors: string[] = [];
  if (!value || typeof value !== "object") return ["Backup is not an object."];
  const snapshot = value as Partial<BackupSnapshot>;
  if (snapshot.format !== BACKUP_FORMAT) errors.push("Backup format is unsupported.");
  if (!snapshot.createdAt || Number.isNaN(Date.parse(snapshot.createdAt))) {
    errors.push("Backup timestamp is invalid.");
  }
  const expected = [
    "prospects",
    "outreachMessages",
    "deliveryAttempts",
    "sourceAssets",
    "suppressionEntries",
    "auditEvents",
  ] as const;
  for (const key of expected) {
    const rows = snapshot.data?.[key];
    if (!Array.isArray(rows)) {
      errors.push(`${key} is missing.`);
      continue;
    }
    if (snapshot.counts?.[key] !== rows.length) {
      errors.push(`${key} count does not match its data.`);
    }
  }
  return errors;
}
