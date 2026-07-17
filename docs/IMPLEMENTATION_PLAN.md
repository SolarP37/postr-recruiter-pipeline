# Implementation plan

## Milestone 1 — Foundation

- Verify Node.js, npm, Git, and local application startup.
- Initialize Git and scaffold Next.js with TypeScript and Tailwind CSS.
- Add environment and safety defaults.
- Run lint, type-check, production build, and a local HTTP smoke test.

## Milestone 2 — Core application

- Build the public pages and protected application shell.
- Add credential-based authentication.
- Add Prisma with SQLite and the prospect, outreach, asset, suppression, and
  audit models.
- Build the initial dashboard metrics and funnel.

## Milestone 3 — Capture and review

- Add validated PNG, JPEG, and WebP uploads with randomized filenames.
- Implement the vision provider interface and a deterministic mock provider.
- Add OpenAI vision extraction behind validated output schemas.
- Build duplicate and suppression checks plus human review actions.

## Milestone 4 — Draft outreach

- Add honest outreach generation with explicit opt-out language.
- Implement Google OAuth with encrypted local token storage.
- Create Gmail drafts only after prospect approval.
- Add send guards, duplicate-send prevention, and audit events.

## Milestone 5 — Referral tracking and deployment

- Track referral link copies, marked sends, and manually confirmed joins.
- Complete end-to-end tests in mock mode.
- Prepare GitHub and Vercel configuration.
- Configure production environment variables, Google redirect URIs, and the
  production database migration path.

Deployment and external integrations pause at credentials or publishing actions
that require owner approval.
