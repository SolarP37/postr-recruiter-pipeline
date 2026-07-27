# Production roadmap

## Phase 1 - Safe drafting and administration

- Add a pre-render authentication barrier for every private page.
- Rotate the administrator password without placing the replacement in chat.
- Configure a valid sender postal address and monitored contact email.
- Confirm Gmail OAuth and capture scopes in production.
- Keep `OUTREACH_SENDING_MODE=draft_only`.
- Create one controlled Gmail draft to an address owned by the recruiter.
- Require production health to return HTTP 200.

Done when an unauthenticated request contains no protected page content, the
old password no longer works, health is green, and a reviewed test draft exists
in Gmail without sending.

## Phase 2 - Three-attempt acceptance test

- Create controlled creator and brand test prospects.
- Exercise qualification, permission evidence, tailored drafts, scheduling,
  Gmail draft creation, suppression, public opt-out, reply/bounce stops, and
  the attempt limit.
- Verify ambiguous delivery attempts require manual reconciliation.

Done when the full workflow passes against production without contacting a
real prospect.

## Phase 3 - Faster prospect intake

- Improve the public-URL inspector and source-evidence presentation.
- Add a review queue for missing email, qualification, country, or permission.
- Keep deterministic extraction and drafting as the no-token default.
- Offer optional AI refinement only behind an explicit action and usage cap.

Done when a URL can become a complete, evidence-backed review record with
minimal copying and no automatic outreach.

## Phase 4 - Operations and compliance

- Connect an external uptime monitor and error-alert destination.
- Verify daily private backups and complete a temporary-database restore drill.
- Define screenshot, prospect, audit, and suppression retention periods.
- Complete jurisdiction-specific outreach and privacy review.

Done when failures alert the owner, recovery is rehearsed, retention is
documented, and sender/opt-out requirements are approved.

## Phase 5 - Public launch and measurement

- Attach an owner-controlled custom domain.
- Verify the domain in Search Console and submit the sitemap.
- Enable and validate analytics and conversion events.
- Complete mobile and desktop checks in current Chrome, Safari, Firefox, and
  Edge.

Done when the custom domain is indexed, attribution is measurable, and the
public journey passes the browser/device checklist.

## Phase 6 - Optional controlled sending

- Consider `manual_send` only after Phases 1-5 pass.
- Add daily caps, quiet hours, rate limits, approval queues, and delivery
  reconciliation before any batch mode.

Automatic prospecting or sending is out of scope. Every recipient and message
continues to require documented eligibility and human review.
