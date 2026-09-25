import Link from "next/link";
import { RECRUITER_CONFIG } from "@/config/recruiter";
import {
  AudienceBridge,
  InvitationCard,
  PublicFooter,
  PublicNav,
  TrustStrip,
} from "@/components/public-site";

export default function Home() {
  return (
    <main className="public-site">
      <PublicNav />
      <section className="public-hero public-container">
        <div className="public-hero-copy">
          <p className="eyebrow">Introductions by {RECRUITER_CONFIG.recruiterName}</p>
          <h1>Where creators and brands find their next collaboration.</h1>
          <p className="public-lead">
            Explore Postr from the side that fits you. Patrick helps creators and
            brands understand the opportunity, prepare for a stronger introduction,
            and join through his recruiter invitation.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link className="button-primary" href="/creators">I am a creator</Link>
            <Link className="button-secondary" href="/brands">I represent a brand</Link>
          </div>
          <p className="mt-5 text-sm leading-6 text-slate-500">
            Creators generally need at least{" "}
            {RECRUITER_CONFIG.minimumFollowerCount.toLocaleString()} followers.
            Signup does not guarantee campaigns, earnings, or business results.
          </p>
        </div>
        <InvitationCard audience="creator" source="home-invitation-card" />
      </section>

      <div className="public-container"><TrustStrip /></div>

      <section className="public-section public-container">
        <div className="public-section-heading">
          <p className="eyebrow">Choose your path</p>
          <h2>One clear starting point for each side.</h2>
          <p>
            Learn what to prepare before you leave this site, then continue to
            Postr through Patrick&apos;s tracked invitation.
          </p>
        </div>
        <div className="audience-grid">
          <article className="audience-card audience-creator">
            <div className="audience-number">01</div>
            <p className="audience-kicker">For creators</p>
            <h3>Turn your niche into a clearer opportunity.</h3>
            <p>
              Understand the minimum requirements, prepare your profile, and review
              creator opportunities available through Postr.
            </p>
            <ul>
              <li>Profile readiness checklist</li>
              <li>What brands look for</li>
              <li>Patrick&apos;s tracked invitation</li>
            </ul>
            <Link className="button-primary mt-7" href="/creators">Explore as a creator</Link>
          </article>
          <article className="audience-card audience-brand">
            <div className="audience-number">02</div>
            <p className="audience-kicker">For brands</p>
            <h3>Turn a campaign idea into a creator-ready brief.</h3>
            <p>
              Define the audience, deliverables, timeline, and budget creators need
              to evaluate a collaboration.
            </p>
            <ul>
              <li>Campaign readiness checklist</li>
              <li>What creators need from brands</li>
              <li>Patrick&apos;s tracked invitation</li>
            </ul>
            <Link className="button-outline-light mt-7" href="/brands">Explore as a brand</Link>
          </article>
        </div>
      </section>

      <div className="public-container"><AudienceBridge /></div>

      <section className="public-container pb-20">
        <div className="final-cta">
          <div>
            <p className="eyebrow eyebrow-dark">A human introduction</p>
            <h2>Prepare first. Join when it feels right.</h2>
            <p>
              Patrick&apos;s role is to introduce qualified creators and interested
              brands. You stay in control of whether you join or participate.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="button-light" href="/creators">Creator guide</Link>
            <Link className="button-outline-light" href="/brands">Brand guide</Link>
          </div>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
