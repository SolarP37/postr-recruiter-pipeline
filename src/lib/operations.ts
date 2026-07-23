import { audit } from "@/lib/audit";

export async function reportOperationalError(
  operation: string,
  error: unknown,
) {
  const detail = error instanceof Error ? error.message : "Unknown error";
  console.error(`[operations] ${operation}: ${detail}`);

  await audit("OPERATIONAL_ERROR", "Operation", operation, {
    detail: detail.slice(0, 500),
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
      detail: detail.slice(0, 500),
    }),
    signal: AbortSignal.timeout(5_000),
  }).catch(() => undefined);
}
