import type { Metadata } from "next";
import { getTrackedReferralPath, RECRUITER_CONFIG } from "@/config/recruiter";
import {
  InvitationCard,
  PublicFooter,
  PublicNav,
} from "@/components/public-site";

export const metadata: Metadata = {
  title: "Join Postr as a Creator",
  description:
    "Review creator readiness and join Postr through Patrick Conlon's recruiter invitation.",
  alternates: { canonical: "/creators" },
  openGraph: {
    title: "Join Postr as a Creator",
    description:
      "Review creator readiness and join Postr through Patrick Conlon's recruiter invitation.",
    url: "/creators",
  },
};

export default function CreatorsPage() {
  const primaryLink = getTrackedReferralPath("creator", "creator-landing-primary");
  return (
    <main className="public-site creator-site">
      <PublicNav />
      <section className="public-hero public-container">
        <div className="public-hero-copy">
          <p className="eyebrow">For creators</p>
          <h1>Put your audience in front of more brand opportunities.</h1>
          <p className="public-lead">
            Postr helps eligible creators review brand opportunities in one place.
            Prepare a clear profile, understand what makes a strong fit, and join
            through Patrick&apos;s recruiter invitation when you are ready.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a className="button-primary" href={primaryLink}>Continue to Postr</a>
            <span className="text-sm text-slate-500">
              Generally {RECRUITER_CONFIG.minimumFollowerCount.toLocaleString()}+ followers
            </span>
          </div>
        </div>
        <InvitationCard audience="creator" source="creator-landing-card" />
      </section>

      <section className="public-section public-container">
        <div className="public-section-heading">
          <p className="eyebrow">Creator value</p>
          <h2>Make it easier to recognize the right fit.</h2>
          <p>
            A strong creator profile helps brands understand your audience, style,
            and the kind of work you want to make.
          </p>
        </div>
        <div className="feature-grid">
          <article><span>01</span><h3>Show your niche</h3><p>Describe the topic, community, and point of view your audience follows you for.</p></article>
          <article><span>02</span><h3>Review opportunities</h3><p>Assess campaign details and decide whether the brand and brief suit your content.</p></article>
          <article><span>03</span><h3>Choose your fit</h3><p>You decide what to pursue. Joining never obligates you to accept a campaign.</p></article>
        </div>
      </section>

      <section className="public-section public-container">
        <div className="readiness-panel">
          <div>
            <p className="eyebrow">Before you join</p>
            <h2>Your creator readiness checklist.</h2>
            <p>Have these details ready so a brand can quickly understand your value.</p>
          </div>
          <ul className="check-list">
            <li><span>✓</span>A clear niche and short profile description</li>
            <li><span>✓</span>Current audience size and primary channels</li>
            <li><span>✓</span>Audience location or demographics, if available</li>
            <li><span>✓</span>Recent examples that show your content style</li>
            <li><span>✓</span>A reliable email for campaign communication</li>
          </ul>
        </div>
      </section>

      <section className="public-section public-container">
        <div className="split-section">
          <div>
            <p className="eyebrow">The journey</p>
            <h2>From invitation to opportunity.</h2>
          </div>
          <ol className="journey-list">
            <li><span>1</span><div><strong>Join through Patrick</strong><p>Use the tracked invitation so your introduction stays connected to his recruiter code.</p></div></li>
            <li><span>2</span><div><strong>Complete your profile</strong><p>Give brands enough context to understand your audience and creative strengths.</p></div></li>
            <li><span>3</span><div><strong>Review and decide</strong><p>Consider available opportunities and choose only the work that suits you.</p></div></li>
          </ol>
        </div>
      </section>

      <section className="public-section public-container pb-20">
        <div className="faq-grid">
          <div className="public-section-heading">
            <p className="eyebrow">Good to know</p>
            <h2>Creator questions.</h2>
          </div>
          <div className="faq-list">
            <article><h3>Does joining guarantee paid work?</h3><p>No. Campaign availability, selection, and earnings are not guaranteed.</p></article>
            <article><h3>Do I have to accept opportunities?</h3><p>No. Review the opportunity and its terms, then decide whether it is right for you.</p></article>
            <article><h3>How is my information used here?</h3><p>This recruitment site stores relevant public business-contact evidence and honors suppression and opt-out requests.</p></article>
            <article><h3>Does Patrick receive a referral benefit?</h3><p>{RECRUITER_CONFIG.referralCompensation} This does not add a fee for you.</p></article>
          </div>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
