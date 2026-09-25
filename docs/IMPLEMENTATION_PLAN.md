# Implementation plan

## Milestone 1 — Foundation

- [x] Verify Node.js, npm, Git, and local application startup.
- [x] Initialize Git and scaffold Next.js with TypeScript and Tailwind CSS.
- [x] Add environment and safety defaults.
- [x] Run lint, type-check, production build, and a local HTTP smoke test.

## Milestone 2 — Core application

- [x] Build the public pages and protected application shell.
- [x] Add credential-based authentication.
- [x] Add Prisma with SQLite and the prospect, outreach, asset, suppression, and
  audit models.
- [x] Build the initial dashboard metrics and funnel.

## Milestone 3 — Capture and review

- [x] Add validated PNG, JPEG, and WebP uploads with randomized filenames.
- [x] Implement the vision provider interface and a deterministic mock provider.
- [x] Add OpenAI vision extraction behind validated output schemas.
- [x] Build duplicate and suppression checks plus human review actions.

## Milestone 4 — Draft outreach

- [x] Add honest outreach generation with explicit opt-out language.
- [x] Implement Google OAuth with encrypted local token storage.
- [x] Create Gmail drafts only after prospect approval.
- [x] Add send guards, duplicate-send prevention, and audit events.

## Milestone 5 — Referral tracking and deployment

- [x] Track referral link copies, marked sends, and manually confirmed joins.
- [x] Complete end-to-end tests in mock mode.
- [x] Prepare the GitHub, Vercel, OAuth, and environment checklists.
- [x] Create the owner-approved GitHub repository.
- [x] Add GitHub Actions checks for lint, type-check, tests, and production builds.
- [ ] Create the owner-approved Vercel project.
- [ ] Configure production environment variables, Google redirect URIs, and the
  production database migration path.

Deployment and external integrations pause at credentials or publishing actions
that require owner approval.

## Security hardening — complete

- [x] Enforce same-origin checks on state-changing routes.
- [x] Throttle repeated failed recruiter login attempts.
- [x] Prevent review and tracking status regressions.
- [x] Persist captures atomically and clean up files after provider/database
  failures.
- [x] Hash opt-out identifiers in audit metadata.
- [x] Hide demo credentials whenever demo mode is not active.

## Patrick Conlon recruiter integration

- [x] Centralize Patrick's recruiter identity, referral code, canonical URL,
  creator threshold, QR metadata, and safe sending mode.
- [x] Crop the official Postr QR without resampling and verify its decoded URL.
- [x] Add qualification, contact-source, personalization-source, follow-up, and
  outcome fields through additive local and PostgreSQL schema changes.
- [x] Require eligible qualification, duplicate checks, and suppression checks
  before standard recruitment drafting.
- [x] Add concise HTML and plain-text Postr email templates with editable
  desktop/mobile previews and a Gmail multipart draft.
- [x] Add recruiter dashboard identity/actions and clearly mark unavailable
  Postr/QR attribution metrics.
- [x] Enforce draft-only delivery by default and stop follow-ups on reply,
  bounce, opt-out, registration, or suppression.
- [x] Add first-class creator and brand lead types without changing existing
  creator records.
- [x] Add separate brand review context and concise brand outreach templates.
- [x] Add manual public-business-contact intake for search and website research.
- [x] Split dashboard lead and qualification metrics by creator and brand.
- [x] Add a three-column prospect board with inline draft and delivery history.
- [x] Add broad public-location evidence, IANA time-zone planning, and a
  human-reviewed three-attempt outreach sequence.
