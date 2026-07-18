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
- Mock and OpenAI vision providers plus a guarded Grok placeholder
- Duplicate, suppression, review, draft approval, and send guards
- Same-origin protection, login throttling, and guarded lifecycle transitions
- Atomic capture persistence with failed-upload cleanup
- Gmail OAuth, encrypted token storage, draft creation, and confirmed-send endpoints
- Referral link lifecycle and manual signup tracking
- Automated unit and end-to-end mock workflow tests
- Environment variable template added without secrets
- Local lint, type-check, test, build, and smoke-test commands available

No paid API credentials are needed in mock mode.

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
and production readiness.
