import { z } from "zod";
import { AgentTaskError, type AgentTask } from "@/lib/agents/types";

export const missionControlTaskSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("qualification.evaluate"), prospectId: z.string().min(1).max(100) }),
  z.object({ type: z.literal("outreach.prepare"), prospectId: z.string().min(1).max(100) }),
  z.object({ type: z.literal("analytics.snapshot") }),
]);

export type MissionControlTaskRequest = z.infer<typeof missionControlTaskSchema>;

export const taskAgentIds: Record<MissionControlTaskRequest["type"], string> = {
  "qualification.evaluate": "creator-qualification",
  "outreach.prepare": "email-generation",
  "analytics.snapshot": "analytics",
};

export function parseAgentTask<TType extends MissionControlTaskRequest["type"]>(
  task: AgentTask,
  type: TType,
): Extract<MissionControlTaskRequest, { type: TType }> {
  const input = task.payload && typeof task.payload === "object"
    ? { type: task.type, ...task.payload }
    : { type: task.type };
  const parsed = missionControlTaskSchema.safeParse(input);
  if (!parsed.success || parsed.data.type !== type) {
    throw new AgentTaskError(`Invalid payload for ${type}.`);
  }
  return parsed.data as Extract<MissionControlTaskRequest, { type: TType }>;
}
