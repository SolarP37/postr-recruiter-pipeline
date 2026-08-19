# Sprint 2 implementation plan — controlled service integration

## Goal

Turn the Sprint 1 agent shells into a useful, human-triggered workflow without bypassing the existing CRM, qualification, suppression, outreach, or Gmail safety rules.

## First increment

Sprint 2 begins with three allowlisted tasks:

- `qualification.evaluate` reads existing creator evidence and returns a recommendation. It does not approve or modify the prospect.
- `outreach.prepare` reuses the existing outreach guard and deterministic template service to create one internal, pending-review draft. It does not create a Gmail draft or send email.
- `analytics.snapshot` reads aggregate CRM counts and returns a system snapshot. It does not modify data.

Authenticated Mission Control controls can enqueue these tasks and manually run the next queued job. Task payloads are validated, agent IDs are mapped server-side, and callers cannot request arbitrary agent execution.

## Safety boundaries

- No browser automation or automatic prospect discovery.
- No automatic qualification approval or CRM status override.
- No Gmail draft creation and no email sending.
- Existing suppression, duplicate, eligibility, approval, and active-draft checks remain authoritative.
- Non-retryable validation or policy failures stop immediately; only transient execution failures receive bounded retries.
- Every task continues through the Sprint 1 job, history, metric, and centralized log records.

## Later Sprint 2 increments

- Stale worker-lock recovery and scheduled worker invocation. **Completed in increment 2.**
- Human approval records for executable agent jobs. **Completed in increment 2.**
- Read-only research adapters using owner-approved providers.
- Agent limits, schedules, per-agent health, and expanded analytics. **Completed in increment 3.**
- Controlled follow-up preparation that reuses the existing three-attempt and stop-condition rules.

Automated sending remains out of scope.

## Increment 3 controls

- Each registered agent has a bounded per-worker execution limit and a bounded
  active-queue limit. The global worker and queue caps remain authoritative.
- Authenticated recruiters can schedule an approved allowlisted task up to 30
  days ahead. The durable queue does not claim it before its scheduled time.
- Mission Control reports ready, healthy, degraded, or placeholder health per
  agent from real execution metrics, plus run totals, success rate, average
  duration, retries, active tasks, and scheduled tasks.
- Browser-capability tests cover Chromium bitmap decoding, Safari's image
  element fallback, and actionable failure behavior when a browser cannot
  decode a phone image container.
- Schedules still prepare work only. No worker creates jobs and no task sends
  email.

## Increment 2 controls

- Jobs require approval by default. Authenticated recruiter-created jobs record
  their approval time and source; pre-existing active Sprint 1 jobs are
  backfilled as migration-approved so the change remains backward compatible.
- Queue claiming ignores unapproved work.
- The protected scheduled worker recovers expired locks, records retry/failure
  history, and processes a maximum of 1–10 jobs per invocation.
- Queue size, batch size, and stale-lock duration have bounded environment
  configuration with safe defaults.
- The worker never creates jobs. It can only execute previously approved,
  allowlisted tasks, none of which send email.
