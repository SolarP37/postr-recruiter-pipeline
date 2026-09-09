import Image from "next/image";
import Link from "next/link";
import {
  getTrackedReferralPath,
  RECRUITER_CONFIG,
  type ReferralAudience,
} from "@/config/recruiter";

export function PublicNav() {
  return (
    <header className="public-header">
      <nav className="public-nav" aria-label="Primary navigation">
        <Link href="/" className="public-brand">
          <span className="public-brand-mark" aria-hidden="true">P</span>
          <span>
            <strong>Postr with Patrick</strong>
            <small>Creator and brand introductions</small>
          </span>
        </Link>
        <div className="public-nav-links">
          <Link href="/creators">For creators</Link>
          <Link href="/brands">For brands</Link>
          <Link href="/#how-it-connects">How it connects</Link>
          <Link href="/login" className="public-login">Recruiter login</Link>
        </div>
      </nav>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-container public-footer-inner">
        <div>
          <p className="font-semibold text-slate-950">Postr with Patrick</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            An independent recruitment landing page from {RECRUITER_CONFIG.recruiterName},{" "}
            {RECRUITER_CONFIG.recruiterRole}. Postr controls its platform, account approval,
            campaign availability, and campaign terms.
          </p>
        </div>
        <div className="public-footer-links">
          <Link href="/creators">Creators</Link>
          <Link href="/brands">Brands</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/opt-out">Opt out</Link>
        </div>
      </div>
    </footer>
  );
}

export function InvitationCard({
  audience,
  source,
}: {
  audience: ReferralAudience;
  source: string;
}) {
  const trackedLink = getTrackedReferralPath(audience, source);
  const label = audience === "creator" ? "creator" : "brand";

  return (
    <aside className="invitation-card">
      <div className="invitation-glow" />
      <div className="relative">
        <p className="invitation-label">Verified recruiter invitation</p>
        <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <a href={trackedLink} aria-label={`Open Patrick's Postr ${label} invitation`}>
            <Image
              src={RECRUITER_CONFIG.qrAssetPath}
              alt={RECRUITER_CONFIG.qrAltText}
              width={176}
              height={176}
              className="invitation-qr"
              priority
            />
          </a>
          <div className="min-w-0 text-center sm:text-left">
            <p className="text-2xl font-semibold">{RECRUITER_CONFIG.recruiterName}</p>
            <p className="mt-1 text-slate-300">{RECRUITER_CONFIG.recruiterRole}</p>
            <p className="mt-3 text-sm text-slate-400">Code: {RECRUITER_CONFIG.referralCode}</p>
            <a className="button-light mt-5" href={trackedLink}>
              Continue to Postr <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
        <p className="mt-6 border-t border-white/10 pt-5 text-xs leading-5 text-slate-400">
          This tracked link records which public page led to the invitation. It does
          not guarantee acceptance, campaigns, earnings, or results.
        </p>
      </div>
    </aside>
  );
}

export function AudienceBridge() {
  return (
    <section id="how-it-connects" className="public-section">
      <div className="public-section-heading">
        <p className="eyebrow">One network, two sides</p>
        <h2>Better introductions start with better preparation.</h2>
        <p>
          Patrick introduces both audiences to Postr. Creators bring an audience and
          a clear point of view; brands bring a useful brief and a fair opportunity.
          Postr provides the platform where campaign participation can happen.
        </p>
      </div>
      <div className="bridge-grid">
        <article className="bridge-card">
          <span className="bridge-icon" aria-hidden="true">◎</span>
          <p className="bridge-kicker">Creators</p>
          <h3>Show what makes your audience care.</h3>
          <p>Build a complete profile, define your niche, and review opportunities that fit.</p>
          <Link href="/creators">Creator guide <span aria-hidden="true">→</span></Link>
        </article>
        <div className="bridge-center" aria-label="Postr connection">
          <span>Patrick introduces</span>
          <strong>Postr</strong>
          <span>Campaigns connect</span>
        </div>
        <article className="bridge-card">
          <span className="bridge-icon" aria-hidden="true">◇</span>
          <p className="bridge-kicker">Brands</p>
          <h3>Give creators a brief worth responding to.</h3>
          <p>Set a clear goal, audience, deliverables, timeline, and campaign budget.</p>
          <Link href="/brands">Brand guide <span aria-hidden="true">→</span></Link>
        </article>
      </div>
    </section>
  );
}

export function TrustStrip() {
  const items = [
    ["01", "Review the fit", "See what Postr offers before you decide."],
    ["02", "Use Patrick's link", "Attribution stays connected to the invitation."],
    ["03", "Choose for yourself", "Participation is optional and outcomes vary."],
  ];

  return (
    <div className="trust-strip">
      {items.map(([number, title, copy]) => (
        <div key={number} className="trust-item">
          <span>{number}</span>
          <div>
            <strong>{title}</strong>
            <p>{copy}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
