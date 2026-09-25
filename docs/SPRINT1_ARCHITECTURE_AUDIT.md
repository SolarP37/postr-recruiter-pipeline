# Sprint 1 architecture audit and implementation plan

## Current architecture

The application is a Next.js App Router application with four additive layers:

1. **Public acquisition** — the landing page and the creator/brand referral pages route visitors through the configured Postr recruiter identity.
2. **Protected recruiting workspace** — Dashboard, Capture, Prospects, Outreach, and Settings share the authenticated application layout and navigation.
3. **Application services** — capture/OCR, qualification, lifecycle guards, outreach generation and scheduling, Gmail integration, compliance, public-page inspection, storage, backups, and operational reporting live in `src/lib`.
4. **Persistence and integrations** — Prisma uses SQLite locally and PostgreSQL in production. Google/Gmail, OpenAI or Grok vision, Vercel Blob, Postr links, and an optional operations webhook are isolated behind service or provider boundaries.

Requests flow through protected pages and API routes into application services, which persist CRM state in `Prospect`, `OutreachMessage`, `DeliveryAttempt`, `SourceAsset`, `SuppressionEntry`, `AuditEvent`, and `OAuthToken`. `src/proxy.ts` and server-side session checks protect the internal workspace before it renders.

## Reusable services

- `src/lib/db.ts`: shared Prisma client and the persistence entry point.
- `src/lib/audit.ts` and `src/lib/operations.ts`: durable audit records plus operational error reporting and optional alerts.
- `src/lib/capture-processing.ts`, `src/lib/gmail-capture.ts`, and `src/lib/vision/*`: reusable capture pipeline and provider abstraction.
- `src/lib/qualification.ts`, `src/lib/lifecycle.ts`, and `src/lib/prospect-guards.ts`: existing CRM qualification and safe-transition rules.
- `src/lib/outreach.ts`, `src/lib/outreach-schedule.ts`, and `src/lib/outreach-compliance.ts`: existing human-reviewed outreach behavior.
- `src/lib/gmail.ts`, `src/lib/asset-storage.ts`, `src/lib/backup.ts`, and `src/lib/postr.ts`: existing integration boundaries suitable for later agent adapters.
- The protected layout, `AppNav`, `page-shell`, and `card` styles provide the established UI pattern for Mission Control.

## Overlap and duplication to avoid

- Audit events and operational error reporting already provide system-wide visibility. Agent logging should extend and reuse that path, not introduce an unrelated logging system.
- Outreach state transitions currently live across the outreach, prospect tracking, and Gmail routes. Future agents should call these services/routes through adapters instead of reproducing their rules.
- API authorization and same-origin validation recur across route handlers. They remain untouched in this sprint because consolidating them is unrelated and could break compatibility.
- Local and production Prisma schemas intentionally duplicate model definitions. The parity script requires every new agent model and enum to be added identically to both schemas.
- Capture, vision-provider selection, email generation, scheduling, compliance, and suppression already have focused services. Sprint 1 agents are shells only and will not absorb this business logic.

## Sprint 1 implementation plan

1. Add isolated agent job, queue, log, task-history, and execution-metric models to both Prisma schemas, with a PostgreSQL additive migration. Do not alter existing records or relationships.
2. Add a dependency-injected agent logger, base agent, registry, and the eight requested no-op agent shells.
3. Add an orchestrator that only registers agents, creates/prioritizes jobs, dispatches work, records state, and applies bounded retries through a repository interface.
4. Add a protected Mission Control page and one navigation entry, using the existing layout and visual components. Its sections remain status/placeholder views.
5. Add isolated unit tests for registration, startup, queue ordering/creation, centralized logging, execution, and retry behavior; then run the existing quality gates.

Sprint 2 discovery automation, browser automation, business-service adapters, schedules, and autonomous outreach are explicitly out of scope.
