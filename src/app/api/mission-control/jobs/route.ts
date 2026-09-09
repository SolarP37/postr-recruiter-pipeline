import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/api-auth";
import { audit } from "@/lib/audit";
import { missionControlTaskSchema, taskAgentIds } from "@/lib/agents/task-contracts";
import { db } from "@/lib/db";
import { createMissionControl } from "@/lib/mission-control";
import { requireSameOrigin } from "@/lib/request-security";
import { getAgentExecutionPolicy, getAgentWorkerConfig } from "@/lib/orchestrator/worker-config";

const requestSchema = z.object({
  task: missionControlTaskSchema,
  priority: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]).default("NORMAL"),
  scheduledFor: z.coerce.date().optional(),
});

export async function POST(request: Request) {
  const crossSite = requireSameOrigin(request);
  if (crossSite) return crossSite;
  const unauthorized = await requireApiSession();
  if (unauthorized) return unauthorized;

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose a supported Mission Control task and valid prospect." }, { status: 400 });
  }
  const { type, ...payload } = parsed.data.task;
  const agentId = taskAgentIds[type];
  const now = new Date();
  if (parsed.data.scheduledFor && (parsed.data.scheduledFor < now || parsed.data.scheduledFor > new Date(now.getTime() + 30 * 24 * 60 * 60_000))) {
    return NextResponse.json({ error: "Schedule tasks between now and 30 days from now." }, { status: 400 });
  }
  const activeCount = await db.agentJob.count({
    where: { status: { in: ["QUEUED", "RUNNING", "RETRY_SCHEDULED"] } },
  });
  if (activeCount >= getAgentWorkerConfig().queueLimit) {
    return NextResponse.json({ error: "Mission Control queue limit reached. Run or review existing tasks first." }, { status: 429 });
  }
  const agentActiveCount = await db.agentJob.count({
    where: { agentId, status: { in: ["QUEUED", "RUNNING", "RETRY_SCHEDULED"] } },
  });
  if (agentActiveCount >= getAgentExecutionPolicy(agentId).activeQueueLimit) {
    return NextResponse.json({ error: "This agent's execution queue is full. Run or review its existing tasks first." }, { status: 429 });
  }
  const serializedPayload = Object.keys(payload).length === 0 ? null : JSON.stringify(payload);
  const existing = await db.agentJob.findFirst({
    where: {
      agentId,
      taskType: type,
      payload: serializedPayload,
      status: { in: ["QUEUED", "RUNNING", "RETRY_SCHEDULED"] },
    },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "An equivalent task is already active.", jobId: existing.id }, { status: 409 });
  }

  const missionControl = createMissionControl();
  const job = await missionControl.enqueue({
    agentId,
    taskType: type,
    payload: serializedPayload ? payload : undefined,
    priority: parsed.data.priority,
    scheduledFor: parsed.data.scheduledFor,
    maxAttempts: 3,
    requiresApproval: true,
    approvedAt: new Date(),
    approvalSource: "AUTHENTICATED_RECRUITER",
  });
  await audit("AGENT_JOB_QUEUED", "AgentJob", job.id, {
    agentId,
    taskType: type,
    priority: job.priority,
    humanTriggered: true,
    approved: true,
    approvalSource: job.approvalSource,
    scheduledFor: job.scheduledFor.toISOString(),
  });
  return NextResponse.json({ id: job.id, status: job.status }, { status: 201 });
}
