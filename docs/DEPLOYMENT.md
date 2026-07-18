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

1. Create an owner-approved Supabase Postgres project or another supported
   persistent Postgres database.
2. Change the Prisma provider from `sqlite` to `postgresql` on a deployment
   branch.
3. Set the production `DATABASE_URL` in the deployment platform.
4. Generate and review the first production migration.
5. Back up the database and test restore procedures.

Do not create paid cloud resources automatically.

## 3. Google OAuth and Gmail

In Google Cloud Console:

1. Create or select an owner-controlled project.
2. Enable the Gmail API.
3. Configure the OAuth consent screen.
4. Create a Web application OAuth client.
5. Add the exact redirect URIs:
   - Local: `http://localhost:3000/api/auth/google/callback`
   - Production: `https://YOUR_DOMAIN/api/auth/google/callback`
6. Place the client ID and secret in local or deployment environment variables.

The application requests only `gmail.compose`. It creates a Gmail draft after
prospect and message approval. Sending requires the separate literal
confirmation `SEND`; the UI intentionally defaults to manual sending from
Gmail.

## 4. Required production environment

- `NEXT_PUBLIC_APP_URL`
- `DATABASE_URL`
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
- `TOKEN_ENCRYPTION_KEY` — 32 random bytes encoded as base64
- `POSTR_RECRUITER_LINK`

When storing a bcrypt hash in a Next.js `.env` file, escape each `$` as `\$`.
Use the unescaped value in Vercel’s environment-variable UI.

## 5. GitHub

1. Replace the repository-local placeholder Git author identity.
2. Review `git status`, the full diff, and test output.
3. Create a private repository under the owner’s chosen account.
4. Push a feature branch, not directly to an unreviewed production branch.
5. Confirm `.env.local`, database files, OAuth tokens, and uploads are absent.

## 6. Vercel

1. Import the owner-approved GitHub repository.
2. Configure the production database and all environment variables.
3. Use the standard Next.js build command: `npm run build`.
4. Deploy a preview first.
5. Test login, suppression, capture, review, draft creation, and referral
   tracking with fixture data.
6. Obtain owner approval before promoting the deployment publicly.

## Production readiness checklist

- [ ] Demo authentication is disabled in production.
- [ ] Strong password hash and random auth/token keys are configured.
- [ ] Persistent Postgres database and backups are configured.
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
