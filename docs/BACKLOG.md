# Project backlog

## Ready to publish

### Publish the sprint integration branch

The local `agent/sprint-integration` branch contains the completed CI,
PostgreSQL migration, durable screenshot storage, production readiness,
dependency hardening, and hosted preview preparation work.

Acceptance criteria:

- Authenticate GitHub CLI with repository and workflow access.
- Push `agent/sprint-integration` to `origin`.
- Open a draft pull request against `main`.
- Confirm the GitHub Actions `Verify` job passes.
- Review and merge only after the full diff is approved.

Current blocker: GitHub CLI authentication reached GitHub's OAuth authorization
screen, which requested repository and workflow permissions. Those new account
permissions were denied under the autonomous-work guardrails. An owner must
explicitly authorize GitHub CLI before the branch can be pushed.

## Preview infrastructure

### Provision persistent PostgreSQL

Acceptance criteria:

- Create an owner-controlled PostgreSQL project.
- Add pooled `DATABASE_URL` and direct `DIRECT_URL` values to Preview only.
- Review `prisma/postgresql/migrations/0001_initial/migration.sql`.
- Apply migrations from a trusted environment.
- Test backup and restore procedures.

Current blocker: owner-controlled database credentials and project approval are
required.

### Provision private screenshot storage

Acceptance criteria:

- Create a private Vercel Blob store connected to the Preview project.
- Set `ASSET_STORAGE_PROVIDER=vercel-blob`.
- Configure token or OIDC access without exposing credentials.
- Upload, retrieve, and remove a fixture through authenticated application
  routes.
- Confirm screenshots are never publicly addressable.

Current blocker: an owner-controlled Vercel project and private Blob store are
required.

### Deploy an access-controlled preview

Acceptance criteria:

- Import the approved GitHub branch into Vercel.
- Use the checked-in `vercel.json` PostgreSQL build configuration.
- Configure Preview-scoped variables only.
- Keep the preview access-controlled.
- Complete login, capture, review, draft, tracking, suppression, and opt-out
  smoke tests.

Current blocker: the integration branch must be published and Preview
infrastructure must exist.

## External integrations

### Configure Google OAuth and Gmail

Acceptance criteria:

- Enable Gmail API in an owner-controlled Google Cloud project.
- Configure the OAuth consent screen and Preview callback URI.
- Store credentials only in protected Preview variables.
- Confirm the application requests only `gmail.compose`.
- Verify draft creation and literal `SEND` confirmation without automatic
  outreach.

Current blocker: owner-controlled Google Cloud access and OAuth approval are
required.

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

### Complete production acceptance and compliance review

Acceptance criteria:

- Review privacy and opt-out language with the owner or counsel.
- Review OpenAI screenshot data handling before enabling real vision.
- Validate suppression, duplicate, authentication, and lifecycle guards in
  Preview.
- Confirm monitoring, backups, recovery, and data-retention procedures.
- Obtain explicit owner approval before any public production release.

Current blocker: owner, legal, and production-release decisions are required.
