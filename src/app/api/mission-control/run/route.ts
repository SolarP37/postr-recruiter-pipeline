import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { audit } from "@/lib/audit";
import { createMissionControl } from "@/lib/mission-control";
import { requireSameOrigin } from "@/lib/request-security";

export async function POST(request: Request) {
  const crossSite = requireSameOrigin(request);
  if (crossSite) return crossSite;
  const unauthorized = await requireApiSession();
  if (unauthorized) return unauthorized;

  const job = await createMissionControl().runNext();
  if (!job) return NextResponse.json({ message: "No queued task is ready." });
  await audit("AGENT_JOB_RUN", "AgentJob", job.id, {
    agentId: job.agentId,
    taskType: job.taskType,
    status: job.status,
    humanTriggered: true,
  });
  return NextResponse.json({
    id: job.id,
    agentId: job.agentId,
    taskType: job.taskType,
    status: job.status,
  });
}
