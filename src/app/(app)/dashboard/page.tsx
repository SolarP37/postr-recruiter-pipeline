import Image from "next/image";
import { db } from "@/lib/db";
import { RECRUITER_CONFIG, getSendingMode } from "@/config/recruiter";
import { RecruiterCardActions } from "@/components/recruiter-card-actions";

const metricDefinitions = [
  ["Screenshots processed", "assets"],
  ["Visible emails found", "emails"],
  ["Awaiting review", "review"],
  ["Qualified leads", "qualified"],
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
    assets, emails, review, qualified, approved, drafts, sent, replied, interested,
    referrals, joined, optedOut, suppressed, total, followUps, campaignStarts,
    campaignCompletions, commission,
    creatorLeads, brandLeads, qualifiedCreators, qualifiedBrands,
    creatorReferralClicks, brandReferralClicks,
  ] = await Promise.all([
    db.sourceAsset.count(),
    db.prospect.count({ where: { email: { not: null } } }),
    db.prospect.count({ where: { qualificationStatus: "NEEDS_REVIEW" } }),
    db.prospect.count({ where: { qualificationStatus: { in: ["QUALIFIED", "LIKELY_QUALIFIED"] } } }),
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
    db.prospect.count({ where: { nextFollowUpAt: { not: null } } }),
    db.prospect.count({ where: { campaignStartedAt: { not: null } } }),
    db.prospect.count({ where: { campaignCompletedAt: { not: null } } }),
    db.prospect.aggregate({ _sum: { commissionAmount: true } }),
    db.prospect.count({ where: { leadType: "CREATOR" } }),
    db.prospect.count({ where: { leadType: "BRAND" } }),
    db.prospect.count({ where: { leadType: "CREATOR", qualificationStatus: { in: ["QUALIFIED", "LIKELY_QUALIFIED"] } } }),
    db.prospect.count({ where: { leadType: "BRAND", qualificationStatus: { in: ["QUALIFIED", "LIKELY_QUALIFIED"] } } }),
    db.auditEvent.count({ where: { action: "REFERRAL_CLICK_CREATOR" } }),
    db.auditEvent.count({ where: { action: "REFERRAL_CLICK_BRAND" } }),
  ]);
  const values = { assets, emails, review, qualified, approved, drafts, sent, replied, interested, referrals, joined, optedOut, suppressed };
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
      <section className="card mt-8 grid gap-6 p-6 lg:grid-cols-[auto_1fr]">
        <a href={RECRUITER_CONFIG.referralUrl} target="_blank" rel="noreferrer">
          <Image src={RECRUITER_CONFIG.qrAssetPath} alt={RECRUITER_CONFIG.qrAltText} width={190} height={190} className="rounded-2xl border border-slate-200" />
        </a>
        <div className="min-w-0">
          <p className="eyebrow">Official recruiter identity</p>
          <h2 className="mt-4 text-2xl font-semibold">{RECRUITER_CONFIG.recruiterName}</h2>
          <p className="mt-1 text-slate-500">{RECRUITER_CONFIG.recruiterRole} · Referral code: {RECRUITER_CONFIG.referralCode}</p>
          <a className="mt-3 block break-all text-blue-600 underline" href={RECRUITER_CONFIG.referralUrl}>{RECRUITER_CONFIG.referralUrl}</a>
          <p className="mt-3 text-sm text-slate-500">{RECRUITER_CONFIG.referralCompensation}</p>
          <p className="mt-2 text-sm font-semibold text-blue-700">Outreach mode: {getSendingMode().replaceAll("_", " ")}</p>
          <div className="mt-5"><RecruiterCardActions /></div>
        </div>
      </section>
      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Creator leads", creatorLeads],
          ["Qualified creators", qualifiedCreators],
          ["Brand leads", brandLeads],
          ["Qualified brands", qualifiedBrands],
        ].map(([label, value]) => (
          <article key={label} className="card p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
          </article>
        ))}
      </section>
      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricDefinitions.map(([label, key]) => (
          <article key={key} className="card p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{values[key]}</p>
          </article>
        ))}
      </section>
      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Follow-ups due", String(followUps)],
          ["Creator landing click-throughs", String(creatorReferralClicks)],
          ["Brand landing click-throughs", String(brandReferralClicks)],
          ["Referral-link performance", `${referrals} marked sent`],
          ["QR-code performance", "Unavailable — no scan endpoint"],
          ["Registrations", `${joined} manually confirmed`],
          ["Campaign starts", String(campaignStarts)],
          ["Campaign completions", String(campaignCompletions)],
          ["Commission earned", commission._sum.commissionAmount == null ? "Unavailable" : `$${commission._sum.commissionAmount.toFixed(2)}`],
          ["Postr attribution feed", "Unavailable — API/report needed"],
        ].map(([label, value]) => (
          <article key={label} className="card p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-3 text-lg font-semibold text-slate-950">{value}</p>
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
