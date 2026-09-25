import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { productionReadinessIssues } from "@/lib/production-readiness";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  let database = false;
  try {
    await db.$queryRaw`SELECT 1`;
    database = true;
  } catch {
    database = false;
  }
  const configuration = productionReadinessIssues().length === 0;
  const healthy = database && configuration;
  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      checks: { database, configuration },
      responseTimeMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
    },
    {
      status: healthy ? 200 : 503,
      headers: { "cache-control": "no-store" },
    },
  );
}
