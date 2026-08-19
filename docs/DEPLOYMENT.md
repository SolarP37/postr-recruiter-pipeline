# Deployment and external setup

Publishing and connecting external accounts require owner approval. Do not put
secrets in Git, screenshots, issues, or chat.

## 1. Local production check

```powershell
Copy-Item .env.example .env.local
npm install
npm run db:generate
npm run db:push
npm test
npm run build
npm start
```

Replace all development placeholders before using real prospect data.

## 2. Production database

SQLite is appropriate for the local MVP but not for durable Vercel serverless
storage. Before public deployment:

1. Select the owner-controlled Supabase Postgres project or another supported
   persistent Postgres database.
2. Review the production schema and migrations in `prisma/postgresql`. The
   default `prisma/schema.prisma` remains SQLite-only for local development.
3. In Supabase Dashboard, open the project and select **Connect**.
4. Set the transaction-pooler connection as `DATABASE_URL` and the direct
   connection as `DIRECT_URL`. These values contain credentials and must be
   entered only in the ignored local `.env.local` file or the deployment
   provider's protected environment-variable UI. Never paste them into chat.
5. On Vercel, scope both values to **Preview** while validating the deployment.
   Do not add them to Production until the owner separately approves a
   production release.
6. The application does not use Supabase Auth or the Supabase JavaScript
   client. Do not configure an anon key, publishable key, service-role key, or
   Supabase Auth redirects for this deployment.
7. Validate and generate the PostgreSQL client:

   ```powershell
   npm run db:schemas:check
   npm run db:postgres:validate
   npm run db:postgres:generate
   ```

8. Review the SQL in `prisma/postgresql/migrations`, then apply it from a
   trusted deployment environment:

   ```powershell
   npm run db:postgres:migrate:deploy
   ```

   Never run this command against production from an unreviewed branch.
9. Back up the database and test restore procedures.

Use the detailed rehearsal, cutover, validation, and rollback procedure in
[`POSTGRESQL_MIGRATION_RUNBOOK.md`](POSTGRESQL_MIGRATION_RUNBOOK.md). The
repository deliberately does not automate copying personal data between
databases.

Do not create paid cloud resources automatically.

## 3. Private screenshot storage

Local development stores screenshots under `storage/uploads`. Vercel Functions
do not provide durable local storage, so hosted environments must use a private
Vercel Blob store:

1. Create a private Blob store from the owner-controlled Vercel project.
2. Connect it to the Preview environment.
3. Set `ASSET_STORAGE_PROVIDER=vercel-blob`.
4. Confirm Vercel supplies `BLOB_READ_WRITE_TOKEN`, or configure the store ID
   and Vercel OIDC access.
5. Upload and retrieve a fixture screenshot through the protected asset route.

Never use a public Blob store for prospect screenshots. The application stores
only private Blob pathnames and serves content through its authenticated API.
Server uploads are limited to 4 MB to remain below the Vercel Function request
limit.

## 4. Google OAuth and Gmail

In Google Cloud Console:

1. Create or select an owner-controlled project.
2. Enable the Gmail API.
3. Configure the OAuth consent screen.
4. Create a Web application OAuth client.
5. Add the exact redirect URIs:
   - Local: `http://localhost:3000/api/auth/google/callback`
   - Preview: `https://YOUR_VERCEL_PREVIEW_DOMAIN/api/auth/google/callback`
   - Production (only after separate approval):
     `https://YOUR_PRODUCTION_DOMAIN/api/auth/google/callback`
6. Place the client ID and secret in local or deployment environment variables.

The application requests `gmail.compose` for reviewed drafts and
`gmail.readonly` for the recruiter-triggered screenshot inbox importer. The
importer searches only the configured `INBOUND_CAPTURE_EMAIL`, only the last
30 days, and at most 10 messages per import. It accepts ordinary image
attachments and inline image MIME parts, ignores non-image messages, and shows
a persistent processed/skipped/duplicate/failed report. Gmail's OAuth consent
screen still describes the full read-only scope. Existing Gmail connections
must be reconnected after this scope is added.

Set `INBOUND_CAPTURE_EMAIL` to a dedicated mailbox or Gmail plus-address such
as `yourname+postr-capture@gmail.com`. From a phone, share a screenshot to that
address. Optional subject tags are `[brand]`, `[instagram]`, `[tiktok]`, and
`[youtube]`. The importer validates each image, prevents repeat imports using
the Gmail message and attachment IDs, and sends it through the same protected
OCR workflow as a direct upload. It never creates or sends outreach.

Draft sending still requires the separate literal confirmation `SEND`; the UI
intentionally defaults to manual sending from Gmail.

## 5. Required production environment

- `NEXT_PUBLIC_APP_URL`
- `DATABASE_URL`
- `DIRECT_URL`
- `ASSET_STORAGE_PROVIDER=vercel-blob`
- `BLOB_READ_WRITE_TOKEN` or Vercel OIDC access to `BLOB_STORE_ID`
- `AUTH_MODE=password`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`
- `AUTH_SECRET` — at least 32 random characters
- `VISION_PROVIDER=mock` or `openai`
- `OPENAI_API_KEY` when using OpenAI
- `OPENAI_VISION_MODEL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `INBOUND_CAPTURE_EMAIL`
- `TOKEN_ENCRYPTION_KEY` — 32 random bytes encoded as base64
- `OUTREACH_SENDING_MODE=draft_only` (keep this safe default until the owner
  explicitly approves another mode)
- `OUTREACH_CONTACT_EMAIL`
- `OUTREACH_POSTAL_ADDRESS` - a real sender postal address; Gmail outreach
  draft creation is blocked when absent
- `CRON_SECRET` - at least 16 random characters; authorizes the daily backup
- `AGENT_MAX_JOBS_PER_RUN` - bounded from 1 to 10; defaults to 3
- `AGENT_STALE_LOCK_MINUTES` - bounded from 5 to 120; defaults to 15
- `AGENT_QUEUE_LIMIT` - bounded from 10 to 1000; defaults to 100
- `AGENT_<NORMALIZED_ID>_MAX_PER_RUN` - optional per-agent worker cap from 1
  to 10; defaults to 1 (for example `AGENT_ANALYTICS_MAX_PER_RUN`)
- `AGENT_<NORMALIZED_ID>_QUEUE_LIMIT` - optional per-agent active queue cap
  from 1 to 250; defaults to 25
- `OPERATIONS_ALERT_WEBHOOK_URL` - optional generic alert receiver; alerts do
  not contain prospect data
- `GOOGLE_SITE_VERIFICATION` - after Search Console issues a verification token

When storing a bcrypt hash in a Next.js `.env` file, escape each `$` as `\$`.
Use the unescaped value in Vercel’s environment-variable UI.

## 6. Backups, monitoring, and recovery

- `/api/health` performs a no-secret database/configuration check and returns
  HTTP 503 when unhealthy. Connect an external uptime monitor to this route.
- Vercel invokes `/api/cron/backup` daily. The route creates a private,
  compressed snapshot in the connected Blob store, immediately downloads and
  validates it as a recovery test, retains 30 days, and records an audit event.
- The snapshot excludes OAuth tokens. Restoring production is deliberately a
  supervised operation: provision a clean database, validate the snapshot,
  import parent tables before dependent tables, compare counts, then switch
  traffic only after an application smoke test.
- Vercel invokes `/api/cron/agents` daily. It recovers expired worker locks,
  processes only explicitly approved jobs, and handles at most the configured
  batch size. It cannot create discovery jobs or send email.
- Configure `OPERATIONS_ALERT_WEBHOOK_URL` for capture/backup failure alerts.
  The Settings page shows the latest successful backup and recent errors.
- Once per quarter, restore the latest backup into a temporary database and
  verify login, capture, prospect review, suppression, and outreach history.

Do not treat a successful backup upload as a recovery test unless the stored
object was read back and validated.

## 7. GitHub

1. Replace the repository-local placeholder Git author identity.
2. Review `git status`, the full diff, and test output.
3. Create a private repository under the owner’s chosen account.
4. Push a feature branch, not directly to an unreviewed production branch.
5. Confirm `.env.local`, database files, OAuth tokens, and uploads are absent.

## 8. Vercel

1. Import the owner-approved GitHub repository.
2. Configure the database, private Blob store, and other environment variables
   for the **Preview** environment only.
3. Use the repository Vercel configuration, which runs
   `npm run build:postgres` so Prisma generates a PostgreSQL client before the
   Next.js build.
4. Deploy a preview first.
5. Test login, suppression, capture, review, draft creation, and referral
   tracking with fixture data.
6. Obtain owner approval before adding Production-scoped secrets or promoting
   the deployment publicly.

## Production readiness checklist

The authenticated Settings page performs a non-secret preflight against these
requirements. It reports variable names and corrective actions without
displaying configured values.

- [ ] Demo authentication is disabled in production.
- [ ] Strong password hash and random auth/token keys are configured.
- [ ] Persistent Postgres database and backups are configured.
- [ ] Private durable screenshot storage is configured and access-controlled.
- [ ] Real recruiter link replaces the placeholder.
- [ ] Privacy and opt-out copy has owner/legal review.
- [ ] Google OAuth consent and redirects are verified.
- [ ] OpenAI data handling is reviewed before real screenshot processing.
- [ ] Suppression and duplicate guards pass in production.
- [ ] `NEXT_PUBLIC_APP_URL` exactly matches the production origin so mutation
      protection accepts legitimate requests.
- [ ] Login throttling and lifecycle-transition tests pass.
- [ ] No secrets, uploads, local database files, or OAuth tokens are tracked.
- [ ] Preview deployment passes the full workflow.
- [ ] Owner explicitly approves public production deployment.
