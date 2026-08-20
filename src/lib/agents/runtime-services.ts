import { db } from "@/lib/db";
import { OutreachPreparationError, prepareOutreachDraft } from "@/lib/outreach-preparation";
import { qualificationFromEvidence } from "@/lib/qualification";
import { AgentTaskError } from "@/lib/agents/types";
import { FollowUpPreparationError, prepareFollowUpDraft } from "@/lib/follow-up-preparation";
import { inspectPublicPage } from "@/lib/public-page-inspection";
import { configuredResearchCapabilities, createApifyDatasetReader, createBraveDiscoveryAdapter, ResearchAdapterError } from "@/lib/research";

export interface AgentRuntimeServices {
  discover(query: string, limit: number): Promise<Record<string, unknown>>;
  inspectResearchUrl(url: string): Promise<Record<string, unknown>>;
  readApifyDataset(limit: number): Promise<Record<string, unknown>>;
  evaluateQualification(prospectId: string): Promise<Record<string, unknown>>;
  prepareOutreach(prospectId: string): Promise<Record<string, unknown>>;
  prepareFollowUp(prospectId: string): Promise<Record<string, unknown>>;
  analyticsSnapshot(): Promise<Record<string, unknown>>;
}

export class PrismaAgentRuntimeServices implements AgentRuntimeServices {
  async discover(query: string, limit: number): Promise<Record<string, unknown>> {
    try {
      const results = await createBraveDiscoveryAdapter().search(query, limit);
      return { provider: "brave", query, results, resultCount: results.length, crmChanged: false, reviewRequired: true };
    } catch (error) {
      if (error instanceof ResearchAdapterError) throw new AgentTaskError(error.message, error.retryable);
      throw error;
    }
  }

  async inspectResearchUrl(url: string): Promise<Record<string, unknown>> {
    if (!configuredResearchCapabilities().publicPage) throw new AgentTaskError("Public-page research is disabled.");
    try {
      const result = await inspectPublicPage(url);
      return { provider: "public-page", result, crmChanged: false, reviewRequired: true };
    } catch (error) {
      throw new AgentTaskError(error instanceof Error ? error.message : "Unable to inspect the public page.");
    }
  }

  async readApifyDataset(limit: number): Promise<Record<string, unknown>> {
    try {
      const results = await createApifyDatasetReader().latest(limit);
      return { provider: "apify", results, resultCount: results.length, crmChanged: false, reviewRequired: true };
    } catch (error) {
      if (error instanceof ResearchAdapterError) throw new AgentTaskError(error.message, error.retryable);
      throw error;
    }
  }

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

  async prepareFollowUp(prospectId: string): Promise<Record<string, unknown>> {
    try {
      const result = await prepareFollowUpDraft(prospectId);
      return {
        prospectId,
        outreachMessageId: result.draft.id,
        followUpNumber: result.followUpNumber,
        scheduledFor: result.scheduledFor.toISOString(),
        approvalStatus: result.draft.approvalStatus,
        gmailDraftCreated: false,
        sent: false,
        reviewRequired: true,
      };
    } catch (error) {
      if (error instanceof FollowUpPreparationError) throw new AgentTaskError(error.message, error.status >= 500);
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
