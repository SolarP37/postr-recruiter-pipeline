import { db } from "@/lib/db";
import { followUpEligibility } from "@/lib/prospect-guards";
import type { Orchestrator } from "@/lib/orchestrator/orchestrator";

const DEFAULT_LIMIT = 3;
const MAX_LIMIT = 10;

export function getFollowUpAutomationConfig(
  env: Readonly<Record<string, string | undefined>> = process.env,
) {
  const requested = Number(env.AUTO_FOLLOWUP_PREP_LIMIT);
  return {
    enabled: env.AUTO_PREPARE_FOLLOWUPS === "true",
    limit:
      Number.isInteger(requested) && requested >= 1 && requested <= MAX_LIMIT
        ? requested
        : DEFAULT_LIMIT,
  };
}

export function isFollowUpDue(input: {
  sentAt: Date | null;
  replyReceivedAt: Date | null;
  hardBouncedAt: Date | null;
  optedOutAt: Date | null;
  joinedAt: Date | null;
  suppressed: boolean;
  duplicate: boolean;
  followUpStage: number;
  hasActiveDraft: boolean;
  now: Date;
}) {
  if (input.hasActiveDraft) return false;
  const eligibility = followUpEligibility(input);
  return Boolean(
    eligibility.allowed &&
      eligibility.earliestAt &&
      eligibility.earliestAt <= input.now,
  );
}

export async function queueDueFollowUpDrafts(
  missionControl: Orchestrator,
  now = new Date(),
) {
  const config = getFollowUpAutomationConfig();
  if (!config.enabled) return { enabled: false, queued: 0 };

  const prospects = await db.prospect.findMany({
    where: {
      status: "SENT",
      doNotContact: false,
      replyReceivedAt: null,
      hardBouncedAt: null,
      optedOutAt: null,
      joinedAt: null,
      outreachMessages: { some: { sentAt: { not: null } } },
    },
    include: {
      outreachMessages: {
        orderBy: [{ followUpNumber: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: { updatedAt: "asc" },
    take: 100,
  });

  let queued = 0;
  for (const prospect of prospects) {
    if (queued >= config.limit) break;
    const activeDraft = prospect.outreachMessages.some(
      (message) =>
        !message.sentAt && message.approvalStatus !== "REJECTED",
    );
    const sentMessages = prospect.outreachMessages.filter(
      (message) => message.sentAt,
    );
    const lastSent = [...sentMessages].sort(
      (left, right) =>
        (right.sentAt?.getTime() || 0) - (left.sentAt?.getTime() || 0),
    )[0];
    const followUpStage = sentMessages.reduce(
      (highest, message) => Math.max(highest, message.followUpNumber),
      0,
    );
    const [suppression, duplicateCount, existingJob] = await Promise.all([
      prospect.normalizedEmail
        ? db.suppressionEntry.findUnique({
            where: { normalizedEmail: prospect.normalizedEmail },
          })
        : null,
      prospect.normalizedEmail
        ? db.prospect.count({
            where: { normalizedEmail: prospect.normalizedEmail },
          })
        : 0,
      db.agentJob.findFirst({
        where: {
          agentId: "followup",
          taskType: "followup.prepare",
          status: { in: ["QUEUED", "RUNNING", "RETRY_SCHEDULED"] },
          payload: JSON.stringify({ prospectId: prospect.id }),
        },
        select: { id: true },
      }),
    ]);
    if (
      existingJob ||
      !isFollowUpDue({
        sentAt: lastSent?.sentAt || null,
        replyReceivedAt: prospect.replyReceivedAt,
        hardBouncedAt: prospect.hardBouncedAt,
        optedOutAt: prospect.optedOutAt,
        joinedAt: prospect.joinedAt,
        suppressed: prospect.doNotContact || Boolean(suppression),
        duplicate: duplicateCount > 1,
        followUpStage,
        hasActiveDraft: activeDraft,
        now,
      })
    ) {
      continue;
    }

    await missionControl.enqueue({
      agentId: "followup",
      taskType: "followup.prepare",
      payload: { prospectId: prospect.id },
      priority: "NORMAL",
      requiresApproval: false,
      approvalSource: "SCHEDULED_DRAFT_ONLY",
      scheduledFor: now,
    });
    queued += 1;
  }

  return { enabled: true, queued };
}
