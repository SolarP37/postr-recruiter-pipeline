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
      <p className="page-copy">Prepare and approve messages here. Gmail sending remains a separate, guarded action.</p>
      {approved.length > 0 && <section className="card mt-8 p-6"><h2 className="font-semibold">Approved prospects ready for a draft</h2><div className="mt-4 grid gap-3">{approved.map((prospect) => <div key={prospect.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4"><div><p className="font-medium">{prospect.displayName || prospect.email}</p><p className="text-sm text-slate-500">{prospect.email}</p></div><CreateOutreachButton prospectId={prospect.id} /></div>)}</div></section>}
      <section className="mt-8 grid gap-5">
        {messages.map((message) => <article className="card p-6" key={message.id}>
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-slate-500">To: {message.prospect.email}</p><h2 className="mt-1 text-lg font-semibold">{message.subject}</h2></div><StatusBadge status={message.approvalStatus} /></div>
          <pre className="mt-5 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 font-sans text-sm leading-6 text-slate-700">{message.body}</pre>
          <OutreachActions messageId={message.id} approvalStatus={message.approvalStatus} sent={Boolean(message.sentAt)} gmailDraftId={message.gmailDraftId} />
        </article>)}
        {!messages.length && <div className="card p-10 text-center text-slate-500">No outreach drafts yet.</div>}
      </section>
    </main>
  );
}
