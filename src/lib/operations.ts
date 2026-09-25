import { audit } from "@/lib/audit";

export const REDACTED_OPERATIONAL_ERROR =
  "Operational failure detail redacted; review provider diagnostics in the protected service console.";

export async function reportOperationalError(
  operation: string,
  _error: unknown,
) {
  void _error;
  console.error(`[operations] ${operation}: ${REDACTED_OPERATIONAL_ERROR}`);

  await audit("OPERATIONAL_ERROR", "Operation", operation, {
    detail: REDACTED_OPERATIONAL_ERROR,
  }).catch(() => undefined);

  const webhook = process.env.OPERATIONS_ALERT_WEBHOOK_URL;
  if (!webhook) return;
  await fetch(webhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      application: "postr-recruit-pipeline",
      operation,
      status: "failed",
      occurredAt: new Date().toISOString(),
      detail: REDACTED_OPERATIONAL_ERROR,
    }),
    signal: AbortSignal.timeout(5_000),
  }).catch(() => undefined);
}
