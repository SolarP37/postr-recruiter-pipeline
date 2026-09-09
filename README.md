# Postr Recruiter Pipeline

A human-approved creator recruiting workflow built with Next.js, TypeScript,
Tailwind CSS, and a mock-first integration architecture.

## Current status

- Next.js App Router project initialized
- TypeScript, Tailwind CSS, and ESLint configured
- Prisma/SQLite data model initialized
- Public landing, creator, brand, privacy, and opt-out pages
- Protected dashboard, capture, prospect review, outreach, and settings pages
- Signed recruiter sessions with local demo mode and production password hashes
- Validated private screenshot storage for PNG, JPEG, and WebP files
- Browser-side preparation for large phone screenshots and browser-decodable
  HEIC/HEIF selections, with the original retained on the device
- Mock and OpenAI vision providers plus a guarded Grok placeholder
- Screenshot-visible bio, creator category, and personalization evidence extraction
- Human review and editing of personalization evidence before draft creation
- Evidence-based outreach drafting with safe category and generic fallbacks
- Duplicate, suppression, review, draft approval, and send guards
- Same-origin protection, login throttling, and guarded lifecycle transitions
- Atomic capture persistence with failed-upload cleanup
- Gmail OAuth, encrypted token storage, draft creation, and confirmed-send endpoints
- Referral link lifecycle and manual signup tracking
- Patrick Conlon recruiter identity, canonical `PostrPatCon` referral
  configuration, and decoder-verified official QR asset
- Qualification evidence, follower eligibility, contact provenance, and
  follow-up stop-state fields
- Editable desktop/mobile recruitment-email previews with HTML and plain-text
  Gmail draft alternatives
- First-class creator and brand lead types with separate evidence-based
  outreach templates and dashboard metrics
- Responsive three-column prospect board with inline draft previews, delivery
  history, broad public-location evidence, and local-time planning aids
- Human-reviewed three-attempt outreach sequences with four-day and seven-day
  minimum follow-up spacing and automatic stop conditions
- Public invitation calls-to-action route through Patrick's canonical
  `PostrPatCon` recruiter link, with creator/brand click totals on the
  protected dashboard
- Manual public-business-contact intake for search-engine and website research
- Recruiter-triggered Gmail screenshot inbox import for phone sharing, using
  read-only mailbox access, image validation, duplicate prevention, and the
  same protected OCR review workflow as direct uploads
- Draft-only delivery default with explicit manual/batch send mode guards
- Automated unit and end-to-end mock workflow tests
- Governed Mission Control with approval records, per-agent limits, schedules,
  stale-lock recovery, health indicators, and execution analytics
- Disabled-by-default read-only Brave, public-page, and owner-configured Apify
  dataset research adapters that never create or approve prospects
- Controlled follow-up preparation that enforces stop conditions and creates
  pending internal drafts only
- Optional daily preparation of due follow-up drafts with duplicate-job,
  suppression, reply, bounce, opt-out, and batch-limit safeguards
- Environment variable template added without secrets
- Local lint, type-check, test, build, and smoke-test commands available

No paid API credentials are needed in mock mode.

## Phone screenshot workflow

Once the application is running on an access-controlled hosted Preview, a
recruiter can open the capture page on a phone and choose a PNG, JPEG, WebP,
HEIC, or HEIF screenshot from Photos or Screenshots. Images that need
conversion or compression are prepared as JPEG files in the browser before
upload; the original large image is not transmitted. Browser HEIC/HEIF decoding
varies by device, so the UI provides an export-to-JPEG fallback when conversion
is unavailable.

Only a validated PNG, JPEG, or WebP result of 4 MB or less reaches the capture
API. The application extracts visible contact details and profile context,
stores the prepared image privately, and creates a prospect for review.
Existing review-stage screenshots can be reprocessed after a real vision
provider is enabled. After the recruiter verifies the evidence, qualification,
and public contact basis, approval automatically creates a tailored local
creator or brand draft on the outreach page. Every draft remains pending human
review. Nothing is emailed automatically.

For non-demo authentication, generate a password hash with
`npm run auth:hash -- "your-long-password"`. When placing the bcrypt hash in a
Next.js environment file, escape each dollar sign as `\$`. Managed deployment
environment variables should receive the unescaped hash.

## Local Windows setup

Requirements:

- Node.js 20.9 or newer
- npm
- Git

From PowerShell in this project folder:

```powershell
Copy-Item .env.example .env.local
npm install
npm run db:generate
npm run db:push
npm run dev
```

Open <http://localhost:3000>.

## Verification

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

Pull requests and pushes to `main` run the same checks in GitHub Actions using
mock integrations and CI-only placeholder credentials.

## Safety defaults

- `.env.local` and all other secret-bearing environment files are ignored.
- `.env.example` contains placeholders only.
- `VISION_PROVIDER=mock` makes credential-free development possible.
- No prospect outreach is sent automatically.
- Gmail integration will create drafts first and require a separate send action.
- State-changing API requests must originate from `NEXT_PUBLIC_APP_URL`.
- Public opt-out audits use one-way email hashes instead of storing addresses in
  audit metadata.

See [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) for the staged
delivery plan and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for external setup
and production readiness. The PostgreSQL rehearsal and rollback procedure is in
[docs/POSTGRESQL_MIGRATION_RUNBOOK.md](docs/POSTGRESQL_MIGRATION_RUNBOOK.md).
Remaining owner-controlled work is tracked in [docs/BACKLOG.md](docs/BACKLOG.md).
Patrick's outreach configuration, official QR provenance, Gmail behavior, and
tracking limitations are documented in
[docs/RECRUITER_OUTREACH.md](docs/RECRUITER_OUTREACH.md).
