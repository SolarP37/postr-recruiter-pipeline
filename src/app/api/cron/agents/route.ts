import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { createMissionControl } from "@/lib/mission-control";
import { reportOperationalError } from "@/lib/operations";
import { getAgentWorkerConfig, getPerAgentExecutionLimits } from "@/lib/orchestrator/worker-config";
import { queueDueFollowUpDrafts } from "@/lib/follow-up-automation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const startedAt = Date.now();
  const config = getAgentWorkerConfig();
  const now = new Date();
  const staleCutoff = new Date(now.getTime() - config.staleLockMinutes * 60_000);

  try {
    const missionControl = createMissionControl();
    const recovery = await missionControl.recoverStale(staleCutoff, now);
    const followUps = await queueDueFollowUpDrafts(missionControl, now);
    const perAgentLimits = getPerAgentExecutionLimits(missionControl.registry.list().map((agent) => agent.id));
    const jobs = await missionControl.runAvailable(config.maxJobsPerRun, now, perAgentLimits);
    await audit("AGENT_WORKER_COMPLETED", "AgentWorker", now.toISOString(), {
      processed: jobs.length,
      recovered: recovery.recovered,
      failedRecovery: recovery.failed,
      followUpDraftsQueued: followUps.queued,
      perAgentLimits,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({
      ok: true,
      processed: jobs.length,
      recovered: recovery.recovered,
      failedRecovery: recovery.failed,
      followUpAutomationEnabled: followUps.enabled,
      followUpDraftsQueued: followUps.queued,
      jobs: jobs.map((job) => ({ id: job.id, taskType: job.taskType, status: job.status })),
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    await reportOperationalError("scheduled_agent_worker", error);
    return NextResponse.json({ error: "Agent worker failed and was recorded for review." }, { status: 500 });
  }
}
