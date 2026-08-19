import { db } from "@/lib/db";
import { OutreachPreparationError, prepareOutreachDraft } from "@/lib/outreach-preparation";
import { qualificationFromEvidence } from "@/lib/qualification";
import { AgentTaskError } from "@/lib/agents/types";

export interface AgentRuntimeServices {
  evaluateQualification(prospectId: string): Promise<Record<string, unknown>>;
  prepareOutreach(prospectId: string): Promise<Record<string, unknown>>;
  analyticsSnapshot(): Promise<Record<string, unknown>>;
}

export class PrismaAgentRuntimeServices implements AgentRuntimeServices {
  async evaluateQualification(prospectId: string): Promise<Record<string, unknown>> {
    const prospect = await db.prospect.findUnique({
      where: { id: prospectId },
      select: {
        id: true,
        leadType: true,
        followerCount: true,
        followerCountVerified: true,
        qualificationStatus: true,
        qualificationEvidenceUrl: true,
      },
    });
    if (!prospect) throw new AgentTaskError("Prospect not found.");
    if (prospect.leadType !== "CREATOR") {
      throw new AgentTaskError("Creator qualification tasks require a creator prospect.");
    }
    const recommendation = qualificationFromEvidence({
      leadType: prospect.leadType,
      followerCount: prospect.followerCount,
      followerCountVerified: prospect.followerCountVerified,
      requestedStatus: prospect.qualificationStatus,
    });
    return {
      prospectId: prospect.id,
      currentStatus: prospect.qualificationStatus,
      recommendation,
      evidencePresent: Boolean(prospect.qualificationEvidenceUrl),
      applied: false,
      reviewRequired: true,
    };
  }

  async prepareOutreach(prospectId: string): Promise<Record<string, unknown>> {
    try {
      const message = await prepareOutreachDraft(prospectId);
      return {
        prospectId,
        outreachMessageId: message.id,
        approvalStatus: message.approvalStatus,
        gmailDraftCreated: false,
        sent: false,
        reviewRequired: true,
      };
    } catch (error) {
      if (error instanceof OutreachPreparationError) {
        throw new AgentTaskError(error.message, error.status >= 500);
      }
      throw error;
    }
  }

  async analyticsSnapshot(): Promise<Record<string, unknown>> {
    const [prospects, creators, brands, awaitingReview, drafts, sent, suppressed] = await Promise.all([
      db.prospect.count(),
      db.prospect.count({ where: { leadType: "CREATOR" } }),
      db.prospect.count({ where: { leadType: "BRAND" } }),
      db.prospect.count({ where: { qualificationStatus: "NEEDS_REVIEW" } }),
      db.outreachMessage.count({ where: { sentAt: null } }),
      db.outreachMessage.count({ where: { sentAt: { not: null } } }),
      db.suppressionEntry.count(),
    ]);
    return { prospects, creators, brands, awaitingReview, drafts, sent, suppressed, capturedAt: new Date().toISOString() };
  }
}
