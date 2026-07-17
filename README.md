# Postr Recruiter Pipeline

A human-approved creator recruiting workflow built with Next.js, TypeScript,
Tailwind CSS, and a mock-first integration architecture.

## Milestone 1 status

- Next.js App Router project initialized
- TypeScript, Tailwind CSS, and ESLint configured
- Git repository and baseline checkpoint created
- Environment variable template added without secrets
- Local lint, type-check, build, and smoke-test commands available

No external credentials are needed for this milestone.

## Local Windows setup

Requirements:

- Node.js 20.9 or newer
- npm
- Git

From PowerShell in this project folder:

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Open <http://localhost:3000>.

## Verification

```powershell
npm run lint
npm run typecheck
npm run build
```

## Safety defaults

- `.env.local` and all other secret-bearing environment files are ignored.
- `.env.example` contains placeholders only.
- `VISION_PROVIDER=mock` makes credential-free development possible.
- No prospect outreach is sent automatically.
- Gmail integration will create drafts first and require a separate send action.

See [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) for the staged
delivery plan.
