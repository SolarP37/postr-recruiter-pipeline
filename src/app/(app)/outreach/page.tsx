import { db } from "@/lib/db";
import { CreateOutreachButton, OutreachActions } from "@/components/outreach-actions";
import { StatusBadge } from "@/components/status-badge";

export default async function OutreachPage() {
  const [approved, messages] = await Promise.all([
    db.prospect.findMany({ where: { status: "APPROVED", doNotContact: false }, orderBy: { updatedAt: "desc" } }),
    db.outreachMessage.findMany({ include: { prospect: true }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  return (
    <main className="page-shell">
      <h1 className="page-title">Outreach approval</h1>
      <p className="page-copy">Each approved creator or brand receives an evidence-based tailored draft here. Review and edit every message before creating a Gmail draft.</p>
      {approved.length > 0 && <section className="card mt-8 p-6"><h2 className="font-semibold">Approved leads ready for a draft</h2><div className="mt-4 grid gap-3">{approved.map((prospect) => <div key={prospect.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4"><div className="flex items-center gap-3"><StatusBadge status={prospect.leadType} /><div><p className="font-medium">{prospect.leadType === "BRAND" ? prospect.organizationName || prospect.displayName || prospect.email : prospect.displayName || prospect.email}</p><p className="text-sm text-slate-500">{prospect.email}</p></div></div><CreateOutreachButton prospectId={prospect.id} /></div>)}</div></section>}
      <section className="mt-8 grid gap-5">
        {messages.map((message) => <article id={`message-${message.id}`} className="card scroll-mt-6 p-6" key={message.id}>
          <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><StatusBadge status={message.prospect.leadType} /><p className="text-sm text-slate-500">To: {message.prospect.email}</p></div><h2 className="mt-1 text-lg font-semibold">{message.subject}</h2></div><StatusBadge status={message.approvalStatus} /></div>
          <OutreachActions
            messageId={message.id}
            prospectId={message.prospectId}
            leadType={message.prospect.leadType}
            subject={message.subject}
            body={message.body}
            htmlBody={message.htmlBody}
            approvalStatus={message.approvalStatus}
            sent={Boolean(message.sentAt)}
            gmailDraftId={message.gmailDraftId}
            recipientEmail={message.prospect.email}
            emailSourceUrl={message.prospect.emailSourceUrl || message.prospect.sourceUrl}
            qualificationStatus={message.prospect.qualificationStatus}
            qualificationEvidenceUrl={message.prospect.qualificationEvidenceUrl}
            personalizationHook={message.prospect.personalizationHook}
            personalizationSourceUrl={message.prospect.personalizationSourceUrl || message.prospect.sourceUrl}
            followUpNumber={message.followUpNumber}
            scheduledFor={message.scheduledFor?.toISOString() || null}
            timeZone={message.prospect.timeZone}
          />
        </article>)}
        {!messages.length && <div className="card p-10 text-center text-slate-500">No outreach drafts yet.</div>}
      </section>
    </main>
  );
}
