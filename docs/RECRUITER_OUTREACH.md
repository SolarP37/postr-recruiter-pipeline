# Patrick Conlon recruiter outreach

## Canonical configuration

Patrick's recruiter identity is defined once in
`src/config/recruiter.ts`. Application pages, outreach generation, Gmail
drafts, referral actions, tests, and QR presentation import that module.

- Recruiter: Patrick Conlon
- Role: Postr Recruiter
- Referral code: `PostrPatCon`
- Canonical destination: `https://u.postr.com/postrpatcon`
- General creator threshold: 1,000 followers
- Default delivery mode: `draft_only`

`OUTREACH_SENDING_MODE` supports `draft_only`, `review_and_approve`,
`approved_batch_send`, `manual_send`, and `paused`. Missing or unknown values
fall back to `draft_only`. A Gmail draft can be created after message approval
in draft-only mode, but the guarded Gmail send endpoint refuses delivery unless
the mode is explicitly `manual_send` or `approved_batch_send` and the caller
also supplies the literal `SEND` confirmation. No discovery or capture action
creates or sends Gmail automatically.

## Official QR asset

The official QR was supplied as a Postr phone screenshot on 2026-07-19. The
deterministic crop script extracts only the original 756-by-756 QR panel without
resampling, recoloring, or generative editing:

```powershell
npm run qr:crop -- "PATH_TO_OFFICIAL_SCREENSHOT.png"
npm run qr:verify
```

The final project asset is
`public/assets/postr/postrpatcon-qr.png`. Both the script and Vitest decode the
asset and require the result to equal the canonical destination exactly. Every
current use presents the canonical text link alongside the QR.

## Qualification and evidence

The existing capture and enrichment stages remain unchanged. New prospects
start in `NEEDS_REVIEW`. A standard recruitment draft requires:

- pipeline approval;
- `QUALIFIED` or `LIKELY_QUALIFIED`;
- no suppression or Do Not Contact state;
- no duplicate normalized business email;
- no previously sent outreach.

A verified follower count is classified automatically: 1,000 or more is
`QUALIFIED`; below 1,000 is `NOT_YET_QUALIFIED`. An unverified record cannot be
marked `QUALIFIED`; it stays in review or may be marked `LIKELY_QUALIFIED` with
public evidence. Qualification and personalization store their source URL and
review timestamp.

A reviewer may also record a broad city, region, or country only when it is
explicitly displayed on the public source. OCR may extract that broad label but
must never infer it from language, appearance, scenery, metadata, or other
indirect clues. Street addresses and precise locations are excluded. An IANA
time zone can be entered separately to produce a weekday local-time planning
window; this is a scheduling aid, not a claim that the recipient is online.

Brand leads use the same suppression, duplicate, provenance, evidence, and
human-approval controls but do not use the creator follower threshold. A
reviewer must verify the organization, business relevance, public contact
basis, and evidence URL before marking a brand `QUALIFIED` or
`LIKELY_QUALIFIED`.

Approving an eligible prospect creates a local `PENDING` outreach draft in the
same transaction. Creator and brand drafts use separate templates and tailor
the subject, greeting, and opening from the prospect's reviewed name,
organization, category, and factual personalization hook. Approval never
creates a Gmail draft or sends mail; the recruiter must review or edit the
local draft and approve it separately.

Review-stage prospects with a protected screenshot expose a guarded `Re-run
OCR` action. It refreshes only extracted fields, preserves existing review
notes, respects suppression, and records an audit event. Prospects that have
entered outreach cannot be reprocessed.

Search-engine and direct research leads can be entered through the authenticated
manual lead form. It requires a public business email and source URL, records
the source type, and routes the record to review. This path does not invoke OCR,
create a Gmail draft, or send a message.

## Gmail OAuth and token handling

The Gmail integration requests `gmail.compose` for reviewed drafts and
`gmail.readonly` for recruiter-triggered screenshot-inbox imports. OAuth client configuration is
read from environment variables. Access and refresh tokens are encrypted with
`TOKEN_ENCRYPTION_KEY` before database storage; refreshed tokens are encrypted
again by the OAuth client's token event. No OAuth secret, Gmail credential, or
token is committed to source.

Drafts use `multipart/alternative` with a plain-text fallback and an HTML body.
The HTML references the HTTPS-hosted QR asset and repeats the visible canonical
URL, so the invitation still works when an email client blocks images. Gmail
provider errors are returned to the reviewer; the app does not retry by sending
automatically.

Creator and brand drafts use separate templates. Brand drafts describe Postr's
creator campaign tools without applying creator follower eligibility to the
brand, avoid results guarantees, disclose the referral relationship, and use
the same canonical Patrick invitation.

## Follow-ups and tracking limits

The app records at most three total attempts. After the initial message, it can
prepare follow-up one no earlier than four days after the last sent message and
the final follow-up no earlier than seven additional days later. Scheduling
creates a new `PENDING` local draft; it never sends. When a valid IANA time zone
is recorded, the suggestion moves to the reviewed local hour on a weekday.

Every attempt has its own subject, body, approval state, Gmail draft ID,
suggested time, and sent timestamp. A reply, hard bounce, opt-out, confirmed
registration, or suppression blocks scheduling and clears pending follow-up
dates. The final template explicitly says it is the final reminder.

The dashboard reports only stored facts. Referral-link and QR scan analytics
remain labeled unavailable because the official general QR points directly to
Postr and the application has no Postr attribution API. Registrations, campaign
outcomes, and commissions are manual or unavailable until Postr supplies a
report or API. Email-open tracking is not implemented.
