import { db } from "@/lib/db";

const metricDefinitions = [
  ["Screenshots processed", "assets"],
  ["Visible emails found", "emails"],
  ["Awaiting review", "review"],
  ["Approved prospects", "approved"],
  ["Drafts created", "drafts"],
  ["Messages sent", "sent"],
  ["Replies", "replied"],
  ["Interested", "interested"],
  ["Referral links sent", "referrals"],
  ["Confirmed joins", "joined"],
  ["Opt-outs", "optedOut"],
  ["Suppressed contacts", "suppressed"],
] as const;

export default async function DashboardPage() {
  const [
    assets, emails, review, approved, drafts, sent, replied, interested,
    referrals, joined, optedOut, suppressed, total,
  ] = await Promise.all([
    db.sourceAsset.count(),
    db.prospect.count({ where: { email: { not: null } } }),
    db.prospect.count({ where: { status: "NEEDS_REVIEW" } }),
    db.prospect.count({ where: { status: "APPROVED" } }),
    db.outreachMessage.count(),
    db.prospect.count({ where: { status: "SENT" } }),
    db.prospect.count({ where: { status: "REPLIED" } }),
    db.prospect.count({ where: { status: "INTERESTED" } }),
    db.prospect.count({ where: { referralLinkSentAt: { not: null } } }),
    db.prospect.count({ where: { joinedAt: { not: null } } }),
    db.prospect.count({ where: { status: "OPTED_OUT" } }),
    db.suppressionEntry.count(),
    db.prospect.count(),
  ]);
  const values = { assets, emails, review, approved, drafts, sent, replied, interested, referrals, joined, optedOut, suppressed };
  const funnel = [
    ["Captured", total],
    ["Reviewed", Math.max(total - review, 0)],
    ["Approved", approved + drafts + sent + replied + interested + referrals + joined],
    ["Drafted", drafts],
    ["Sent", sent + replied + interested + referrals + joined],
    ["Replied", replied + interested + referrals + joined],
    ["Referral sent", referrals],
    ["Joined", joined],
  ];

  return (
    <main className="page-shell">
      <h1 className="page-title">Recruiting dashboard</h1>
      <p className="page-copy">A human-approved view of capture, outreach, and referral progress.</p>
      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricDefinitions.map(([label, key]) => (
          <article key={key} className="card p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{values[key]}</p>
          </article>
        ))}
      </section>
      <section className="card mt-8 p-6">
        <h2 className="text-lg font-semibold">Funnel</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {funnel.map(([label, value], index) => (
            <div key={label} className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{index + 1}</p>
              <p className="mt-2 text-sm text-slate-600">{label}</p>
              <p className="mt-1 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
