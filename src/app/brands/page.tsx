import type { Metadata } from "next";
import { getTrackedReferralPath, RECRUITER_CONFIG } from "@/config/recruiter";
import {
  InvitationCard,
  PublicFooter,
  PublicNav,
} from "@/components/public-site";

export const metadata: Metadata = {
  title: "Join Postr as a Brand",
  description:
    "Prepare a creator-ready campaign and review Postr through Patrick Conlon's recruiter invitation.",
};

export default function BrandsPage() {
  const primaryLink = getTrackedReferralPath("brand", "brand-landing-primary");
  return (
    <main className="public-site brand-site">
      <PublicNav />
      <section className="public-hero public-container">
        <div className="public-hero-copy">
          <p className="eyebrow">For brands</p>
          <h1>Build creator campaigns people want to be part of.</h1>
          <p className="public-lead">
            Postr gives brands a place to build campaigns and connect with creators.
            Start with a clear, creator-ready brief, then review the platform through
            Patrick&apos;s recruiter invitation.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a className="button-primary" href={primaryLink}>Continue to Postr</a>
            <span className="text-sm text-slate-500">Campaign results vary</span>
          </div>
        </div>
        <InvitationCard audience="brand" source="brand-landing-card" />
      </section>

      <section className="public-section public-container">
        <div className="public-section-heading">
          <p className="eyebrow">Brand value</p>
          <h2>Give the right creators a reason to respond.</h2>
          <p>
            Clear goals and practical campaign details help creators decide whether
            their audience and style suit the opportunity.
          </p>
        </div>
        <div className="feature-grid">
          <article><span>01</span><h3>Structure the campaign</h3><p>Define the objective, audience, content needs, timing, and available budget.</p></article>
          <article><span>02</span><h3>Find creator fit</h3><p>Look beyond follower count to audience relevance, voice, and content quality.</p></article>
          <article><span>03</span><h3>Set clear expectations</h3><p>Make deliverables, approvals, usage, and compensation understandable from the start.</p></article>
        </div>
      </section>

      <section className="public-section public-container">
        <div className="readiness-panel brand-readiness">
          <div>
            <p className="eyebrow">Before you join</p>
            <h2>Your campaign readiness checklist.</h2>
            <p>Bring enough clarity for creators to make a confident decision.</p>
          </div>
          <ul className="check-list">
            <li><span>✓</span>A single campaign goal and target audience</li>
            <li><span>✓</span>Required deliverables and creative boundaries</li>
            <li><span>✓</span>A realistic timeline and approval process</li>
            <li><span>✓</span>Compensation or campaign budget</li>
            <li><span>✓</span>Usage rights and measurement expectations</li>
          </ul>
        </div>
      </section>

      <section className="public-section public-container">
        <div className="split-section">
          <div>
            <p className="eyebrow">The journey</p>
            <h2>From campaign idea to creator conversation.</h2>
          </div>
          <ol className="journey-list">
            <li><span>1</span><div><strong>Join through Patrick</strong><p>Use the tracked invitation to review Postr from the brand side.</p></div></li>
            <li><span>2</span><div><strong>Build a useful brief</strong><p>Share the context creators need to assess audience fit and creative scope.</p></div></li>
            <li><span>3</span><div><strong>Review creator fit</strong><p>Evaluate relevance and agree on terms before a campaign moves forward.</p></div></li>
          </ol>
        </div>
      </section>

      <section className="public-section public-container pb-20">
        <div className="faq-grid">
          <div className="public-section-heading">
            <p className="eyebrow">Good to know</p>
            <h2>Brand questions.</h2>
          </div>
          <div className="faq-list">
            <article><h3>Does signup guarantee campaign results?</h3><p>No. Results depend on the campaign, creators, audience, offer, and other factors.</p></article>
            <article><h3>Is Patrick an agency for my brand?</h3><p>No. Patrick is a Postr recruiter providing an invitation to review the platform.</p></article>
            <article><h3>What makes a stronger creator brief?</h3><p>State the goal, audience, deliverables, timeline, compensation, approval process, and content usage clearly.</p></article>
            <article><h3>Does Patrick receive a referral benefit?</h3><p>{RECRUITER_CONFIG.referralCompensation} This does not add a separate fee for your brand.</p></article>
          </div>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
