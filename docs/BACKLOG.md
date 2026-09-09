# Project backlog

## Published preview foundation

### Publish the sprint integration branch — completed

The local `agent/sprint-integration` branch contains the completed CI,
PostgreSQL migration, durable screenshot storage, production readiness,
dependency hardening, and hosted preview preparation work.

Acceptance criteria:

- Authenticate GitHub CLI with repository and workflow access.
- Push `agent/sprint-integration` to `origin`.
- Open a draft pull request against `main`.
- Confirm the GitHub Actions `Verify` job passes.
- Review and merge only after the full diff is approved.

The `agent/sprint-integration` branch is published, draft PR #8 is open, and
Vercel is connected to the branch. Merge to `main` remains an explicit owner
decision after final review.

## Preview infrastructure

### Provision persistent PostgreSQL — preview completed

Acceptance criteria:

- Create an owner-controlled PostgreSQL project.
- Add pooled `DATABASE_URL` and direct `DIRECT_URL` values to Preview only.
- Review `prisma/postgresql/migrations/0001_initial/migration.sql`.
- Apply migrations from a trusted environment.
- Test backup and restore procedures.

An owner-controlled Neon PostgreSQL store is connected and migrations through
`0011_agent_job_priority_cleanup` are applied. A documented restore rehearsal
remains before production promotion.

### Provision private screenshot storage — preview completed

Acceptance criteria:

- Create a private Vercel Blob store connected to the Preview project.
- Set `ASSET_STORAGE_PROVIDER=vercel-blob`.
- Configure token or OIDC access without exposing credentials.
- Upload, retrieve, and remove a fixture through authenticated application
  routes.
- Confirm screenshots are never publicly addressable.

The private `postr-capture` Blob store is connected to Preview. A fixture
upload/retrieve/remove acceptance check remains before production promotion.

### Deploy an access-controlled preview — completed

Acceptance criteria:

- Import the approved GitHub branch into Vercel.
- Use the checked-in `vercel.json` PostgreSQL build configuration.
- Configure Preview-scoped variables only.
- Keep the preview access-controlled.
- Complete login, capture, review, draft, tracking, suppression, and opt-out
  smoke tests.

The protected feature-branch Preview is deployed and password authentication,
dashboard counts, Mission Control, database connectivity, and private backup
status have been verified. Production remains unchanged.

## External integrations

### Configure governed research providers

The code now includes disabled-by-default adapters for official Brave Search,
single-page public inspection, and reading one owner-configured Apify dataset.
Research results cannot create or approve prospects. Remaining owner steps are
account terms/payment choices, protected credential creation, Preview variables,
and explicit provider activation.

### Configure OpenAI vision

The mock-first OpenAI vision adapter is implemented. Remaining owner steps are
reviewing current data-handling terms, choosing a usage budget, creating a
project-scoped key, and adding it to Preview. Keep `VISION_PROVIDER=mock` until
those steps are complete.

### Improve phone image compatibility

Acceptance criteria:

- [x] Convert browser-decodable HEIC/HEIF phone images to a validated web image
  before OCR.
- [x] Resize or compress oversized screenshots locally without uploading the
  original.
- [x] Preserve readable email and profile text with a minimum 1,700-pixel
  long edge in the final compression attempt.
- [x] Add automated cross-browser tests for unsupported, oversized, converted,
  and compressed files.
- [x] Keep server-side signature and size validation as the final trust boundary.

The capture page now accepts PNG, JPEG, WebP, HEIC, and HEIF selections up to
20 MB. Files requiring preparation are converted locally to JPEG and must pass
the existing 4 MB MIME/signature validation before OCR. Manual live-browser
checks cover normal and oversized/compressed fixtures. Automated capability
tests exercise Chromium bitmap decoding, Safari image-element fallback, and
unsupported-container guidance. HEIC/HEIF support still
depends on the selecting browser's decoder; unsupported devices receive an
export-to-JPEG instruction.

### Configure Google OAuth and Gmail

Acceptance criteria:

- Enable Gmail API in an owner-controlled Google Cloud project.
- Configure the OAuth consent screen and Preview callback URI.
- Store credentials only in protected Preview variables.
- Confirm the application requests only `gmail.compose` plus `gmail.readonly`
  for recruiter-triggered capture inbox imports.
- Verify draft creation and literal `SEND` confirmation without automatic
  outreach.

Local Google OAuth and Gmail capture are configured and working. Preview still
requires owner-controlled deployment credentials, a hosted callback URI, and
Preview-scoped protected variables.

### Make Gmail delivery crash-safe and reconcilable

Acceptance criteria:

- Add a durable send-attempt state before calling Gmail.
- Prevent concurrent or repeated sends for the same approved message.
- Record the Gmail message ID returned by a successful send.
- Reconcile ambiguous network failures without automatically sending again.
- Add tests for concurrency, Gmail success with database failure, Gmail failure
  before delivery, and retry behavior.

Current blocker: this changes the production delivery state model and requires
a reviewed database migration plus an owner decision about ambiguous-send
reconciliation. Until completed, keep Gmail in draft-only/manual-send mode.

### Activate bounded autonomous outreach — shadow policy completed

The application now records verified contact evidence and versioned autonomy
decisions. It has independent global and recipient-domain budgets, a country
allowlist, a default-on pause control, and deterministic stops for duplicates,
suppression, replies, bounces, opt-outs, conversions, and prior delivery
attempts. Express consent or an existing relationship is required for an
automatic `ALLOW`; public business contact discovery remains review-only.

Remaining activation steps:

- Reconnect Gmail after the Preview token-encryption-key rotation.
- Replace fixture sender email and postal values with approved operational data.
- Add an execution service that consumes an unchanged `ALLOW` decision through
  the durable delivery-attempt lock; keep both autonomy controls off until that
  service and ambiguous-delivery reconciliation are acceptance-tested.
- Run shadow decisions, review false positives, then use an owner-approved
  canary budget before any wider rollout.

### Complete production acceptance and compliance review

Acceptance criteria:

- Review privacy and opt-out language with the owner or counsel.
- Review OpenAI screenshot data handling before enabling real vision.
- Validate suppression, duplicate, authentication, and lifecycle guards in
  Preview.
- Confirm monitoring, backups, recovery, and data-retention procedures.
- Obtain explicit owner approval before any public production release.

Current blocker: owner, legal, and production-release decisions are required.
