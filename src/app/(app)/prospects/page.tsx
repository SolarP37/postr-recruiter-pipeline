import Link from "next/link";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/status-badge";
import { ProspectActions } from "@/components/prospect-actions";
import { ProspectOutreachPanel } from "@/components/prospect-outreach-panel";
import { TrackingActions } from "@/components/tracking-actions";

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: Promise<{ selected?: string }>;
}) {
  const { selected } = await searchParams;
  const prospects = await db.prospect.findMany({
    include: {
      outreachMessages: {
        orderBy: [{ followUpNumber: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const normalized = prospects.map((prospect) => prospect.normalizedEmail).filter(Boolean) as string[];
  const [duplicates, suppressed] = await Promise.all([
    db.prospect.groupBy({ by: ["normalizedEmail"], where: { normalizedEmail: { in: normalized } }, _count: true }),
    db.suppressionEntry.findMany({ where: { normalizedEmail: { in: normalized } }, select: { normalizedEmail: true } }),
  ]);
  const duplicateSet = new Set(duplicates.filter((item) => item._count > 1).map((item) => item.normalizedEmail));
  const suppressionSet = new Set(suppressed.map((item) => item.normalizedEmail));
  const pendingDrafts = prospects.filter((prospect) =>
    prospect.outreachMessages.some(
      (message) =>
        !message.sentAt && message.approvalStatus === "PENDING",
    ),
  ).length;
  const sentProspects = prospects.filter((prospect) =>
    prospect.outreachMessages.some((message) => message.sentAt),
  ).length;
  const dueNow = prospects.filter(
    (prospect) =>
      prospect.nextFollowUpAt &&
      prospect.nextFollowUpAt <= new Date(),
  ).length;
  return (
    <main className="page-shell">
      <div className="flex items-end justify-between gap-4">
        <div><h1 className="page-title">Prospect review</h1><p className="page-copy">Review the evidence and qualification. Approval creates a tailored local draft for your review; it never sends email.</p></div>
        <Link href="/capture" className="button-primary">Capture screenshot</Link>
      </div>
      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          ["Drafts to review", pendingDrafts],
          ["Prospects contacted", sentProspects],
          ["Follow-ups due", dueNow],
        ].map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </section>
      <section className="mt-6 grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
        {prospects.map((prospect) => (
          <article
            key={prospect.id}
            className={`card min-w-0 p-5 ${
              selected === prospect.id
                ? "ring-2 ring-blue-500 ring-offset-2"
                : ""
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2"><StatusBadge status={prospect.leadType} /><StatusBadge status={prospect.status} /><StatusBadge status={prospect.qualificationStatus} />{duplicateSet.has(prospect.normalizedEmail) && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">DUPLICATE</span>}{suppressionSet.has(prospect.normalizedEmail || "") && <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800">SUPPRESSED</span>}</div>
                <h2 className="mt-4 text-xl font-semibold">{prospect.leadType === "BRAND" ? prospect.organizationName || prospect.displayName || "Unnamed brand" : prospect.displayName || "Unnamed creator"}</h2>
                <p className="mt-1 font-medium text-slate-700">{prospect.email || "No visible email"}</p>
              </div>
              {prospect.extractionConfidence != null && <p className="text-sm text-slate-500">{Math.round(prospect.extractionConfidence * 100)}% confidence</p>}
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <div><dt className="font-semibold text-slate-500">Platform</dt><dd className="mt-1">{prospect.sourcePlatform}</dd></div>
              <div><dt className="font-semibold text-slate-500">Source</dt><dd className="mt-1 break-all">{prospect.sourceUrl ? <a className="text-blue-600" href={prospect.sourceUrl} target="_blank" rel="noreferrer">{prospect.sourceUrl}</a> : "Not supplied"}</dd></div>
              <div className="sm:col-span-2"><dt className="font-semibold text-slate-500">Visible evidence</dt><dd className="mt-1 rounded-xl bg-slate-50 p-3">{prospect.visibleEmailEvidence || "No evidence recorded"}</dd></div>
              <div><dt className="font-semibold text-slate-500">Creator category</dt><dd className="mt-1">{prospect.creatorCategory || "Not extracted"}</dd></div>
              <div><dt className="font-semibold text-slate-500">Visible bio</dt><dd className="mt-1">{prospect.profileBio || "Not extracted"}</dd></div>
              <div className="sm:col-span-2"><dt className="font-semibold text-slate-500">Personalization hook</dt><dd className="mt-1 rounded-xl bg-blue-50 p-3 text-blue-950">{prospect.personalizationHook || "No screenshot-supported hook extracted"}</dd></div>
              <div><dt className="font-semibold text-slate-500">{prospect.leadType === "BRAND" ? "Business website" : "Follower evidence"}</dt><dd className="mt-1">{prospect.leadType === "BRAND" ? (prospect.businessWebsite ? <a className="text-blue-600" href={prospect.businessWebsite} target="_blank" rel="noreferrer">{prospect.businessWebsite}</a> : "Not recorded") : prospect.followerCount == null ? "Not recorded" : `${prospect.followerCount.toLocaleString()}${prospect.followerCountVerified ? " verified" : " estimated"}`}</dd></div>
              <div><dt className="font-semibold text-slate-500">Qualification source</dt><dd className="mt-1 break-all">{prospect.qualificationEvidenceUrl ? <a className="text-blue-600" href={prospect.qualificationEvidenceUrl} target="_blank" rel="noreferrer">{prospect.qualificationEvidenceUrl}</a> : "Not recorded"}</dd></div>
              <div><dt className="font-semibold text-slate-500">Public location</dt><dd className="mt-1">{prospect.publicLocation || "Not recorded"}{prospect.locationEvidenceUrl ? <> · <a className="text-blue-600" href={prospect.locationEvidenceUrl} target="_blank" rel="noreferrer">source</a></> : null}</dd></div>
              <div><dt className="font-semibold text-slate-500">Time zone</dt><dd className="mt-1">{prospect.timeZone || "Not recorded"}</dd></div>
              <div><dt className="font-semibold text-slate-500">Outreach permission</dt><dd className="mt-1">{prospect.outreachCountryCode ? `${prospect.outreachCountryCode} · ${prospect.outreachPermissionBasis.replaceAll("_", " ").toLowerCase()}` : "Not reviewed"}</dd></div>
              {prospect.screenshotPath && <div><dt className="font-semibold text-slate-500">Screenshot</dt><dd className="mt-1"><a className="text-blue-600" href={`/api/assets/${prospect.id}`} target="_blank">View protected asset</a></dd></div>}
            </dl>
            <ProspectOutreachPanel
              prospectId={prospect.id}
              publicLocation={prospect.publicLocation}
              timeZone={prospect.timeZone}
              stopFollowUps={
                prospect.doNotContact ||
                Boolean(prospect.replyReceivedAt) ||
                Boolean(prospect.hardBouncedAt) ||
                Boolean(prospect.optedOutAt) ||
                Boolean(prospect.joinedAt)
              }
              attempts={prospect.outreachMessages.map((message) => ({
                id: message.id,
                subject: message.subject,
                body: message.body,
                followUpNumber: message.followUpNumber,
                approvalStatus: message.approvalStatus,
                gmailDraftId: message.gmailDraftId,
                scheduledFor: message.scheduledFor?.toISOString() || null,
                sentAt: message.sentAt?.toISOString() || null,
              }))}
            />
            <ProspectActions
              id={prospect.id}
              leadType={prospect.leadType}
              email={prospect.email}
              displayName={prospect.displayName}
              creatorFirstName={prospect.creatorFirstName}
              username={prospect.username}
              organizationName={prospect.organizationName}
              businessWebsite={prospect.businessWebsite}
              emailSourceUrl={prospect.emailSourceUrl}
              emailSourceType={prospect.emailSourceType}
              profileBio={prospect.profileBio}
              creatorCategory={prospect.creatorCategory}
              personalizationHook={prospect.personalizationHook}
              personalizationSourceUrl={prospect.personalizationSourceUrl}
              publicLocation={prospect.publicLocation}
              locationEvidenceUrl={prospect.locationEvidenceUrl}
              timeZone={prospect.timeZone}
              preferredSendHourLocal={prospect.preferredSendHourLocal}
              followerCount={prospect.followerCount}
              followerCountVerified={prospect.followerCountVerified}
              qualificationStatus={prospect.qualificationStatus}
              qualificationEvidenceUrl={prospect.qualificationEvidenceUrl}
              outreachCountryCode={prospect.outreachCountryCode}
              outreachPermissionBasis={prospect.outreachPermissionBasis}
              outreachPermissionEvidence={prospect.outreachPermissionEvidence}
              notes={prospect.notes}
              status={prospect.status}
              hasScreenshot={Boolean(prospect.screenshotPath)}
            />
            <TrackingActions prospectId={prospect.id} status={prospect.status} />
          </article>
        ))}
        {!prospects.length && <div className="card p-10 text-center text-slate-500">No prospects yet. Capture a screenshot to begin.</div>}
      </section>
    </main>
  );
}
