"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RECRUITER_CONFIG } from "@/config/recruiter";

export function CreateOutreachButton({ prospectId }: { prospectId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  async function create() {
    const response = await fetch("/api/outreach", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prospectId }),
    });
    const result = await response.json();
    setMessage(
      response.ok ? "Local draft prepared for approval." : result.error,
    );
    if (response.ok) router.refresh();
  }
  return (
    <div>
      <button onClick={create} className="button-secondary">
        Create recruitment draft
      </button>
      {message && <p className="mt-2 text-xs text-slate-500">{message}</p>}
    </div>
  );
}

type OutreachActionsProps = {
  messageId: string;
  prospectId: string;
  leadType: string;
  subject: string;
  body: string;
  htmlBody: string | null;
  approvalStatus: string;
  sent: boolean;
  gmailDraftId: string | null;
  recipientEmail: string | null;
  emailSourceUrl: string | null;
  qualificationStatus: string;
  qualificationEvidenceUrl: string | null;
  personalizationHook: string | null;
  personalizationSourceUrl: string | null;
  followUpNumber: number;
  scheduledFor: string | null;
  timeZone: string | null;
};

export function OutreachActions(props: OutreachActionsProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState(props.subject);
  const [body, setBody] = useState(props.body);
  const [preview, setPreview] = useState<"desktop" | "mobile">("desktop");

  async function action(name: string, extra: Record<string, unknown> = {}) {
    const response = await fetch(`/api/outreach/${props.messageId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: name, ...extra }),
    });
    const result = await response.json();
    setMessage(response.ok ? result.message : result.error);
    if (response.ok) router.refresh();
  }

  async function createGmailDraft() {
    const response = await fetch("/api/gmail/create-draft", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messageId: props.messageId }),
    });
    const result = await response.json();
    setMessage(
      response.ok
        ? "Gmail draft created. Review and send it manually in Gmail."
        : result.error,
    );
    if (response.ok) router.refresh();
  }

  async function suppress() {
    const response = await fetch(`/api/prospects/${props.prospectId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "suppress" }),
    });
    const result = await response.json();
    setMessage(response.ok ? "Contact suppressed. No further outreach is allowed." : result.error);
    if (response.ok) router.refresh();
  }

  async function scheduleFollowUp() {
    const response = await fetch(`/api/prospects/${props.prospectId}/tracking`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "schedule_follow_up" }),
    });
    const result = await response.json();
    setMessage(response.ok ? result.message : result.error);
    if (response.ok) router.refresh();
  }

  return (
    <div className="mt-5 border-t border-slate-100 pt-5">
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-4">
          <label className="field-label">
            Subject
            <input
              className="field"
              value={subject}
              maxLength={180}
              disabled={props.sent}
              onChange={(event) => setSubject(event.target.value)}
            />
          </label>
          <label className="field-label">
            Plain-text email
            <textarea
              className="field min-h-96 font-mono text-sm leading-6"
              value={body}
              disabled={props.sent}
              onChange={(event) => setBody(event.target.value)}
            />
          </label>
          {!props.sent && (
            <div className="flex flex-wrap gap-2">
              <button className="button-primary" onClick={() => action("edit", { subject, body })}>Save edits</button>
              <button className="button-secondary" onClick={() => action("regenerate_subject")}>Regenerate subject</button>
              <button className="button-secondary" onClick={() => action("regenerate_opening")}>Regenerate opening</button>
              <button className="button-secondary" onClick={() => action("regenerate_full")}>Regenerate full email</button>
              <button className="button-secondary" onClick={() => navigator.clipboard.writeText(body)}>Copy plain text</button>
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold">HTML preview</h3>
            <div className="flex rounded-full border border-slate-200 p-1 text-xs font-semibold">
              <button className={`rounded-full px-3 py-1.5 ${preview === "desktop" ? "bg-slate-950 text-white" : ""}`} onClick={() => setPreview("desktop")}>Desktop</button>
              <button className={`rounded-full px-3 py-1.5 ${preview === "mobile" ? "bg-slate-950 text-white" : ""}`} onClick={() => setPreview("mobile")}>Mobile</button>
            </div>
          </div>
          <div className="mt-3 overflow-auto rounded-2xl bg-slate-100 p-4">
            <iframe
              title="Recruitment email preview"
              sandbox=""
              srcDoc={`<!doctype html><meta name="viewport" content="width=device-width"><style>body{font:16px/1.55 Arial,sans-serif;color:#1e293b;padding:20px;margin:auto;max-width:640px}a{color:#2563eb}img{max-width:180px;height:auto}</style>${props.htmlBody || "<p>Save or regenerate this draft to create an HTML preview.</p>"}`}
              className={`mx-auto h-[42rem] rounded-xl bg-white shadow-sm ${preview === "mobile" ? "w-[22rem] max-w-full" : "w-full"}`}
            />
          </div>
          <dl className="mt-4 grid gap-3 rounded-2xl border border-slate-200 p-4 text-sm">
            <div><dt className="font-semibold text-slate-500">Recipient and source</dt><dd>{props.recipientEmail || "Unavailable"} · {props.emailSourceUrl ? <a className="text-blue-600" href={props.emailSourceUrl} target="_blank" rel="noreferrer">public source</a> : "source not recorded"}</dd></div>
            <div><dt className="font-semibold text-slate-500">Lead type</dt><dd>{props.leadType === "BRAND" ? "Brand" : "Creator"}</dd></div>
            <div><dt className="font-semibold text-slate-500">Qualification</dt><dd>{props.qualificationStatus.replaceAll("_", " ")}</dd></div>
            <div><dt className="font-semibold text-slate-500">Qualification evidence</dt><dd>{props.qualificationEvidenceUrl ? <a className="break-all text-blue-600" href={props.qualificationEvidenceUrl} target="_blank" rel="noreferrer">{props.qualificationEvidenceUrl}</a> : "Not recorded"}</dd></div>
            <div><dt className="font-semibold text-slate-500">Personalization evidence</dt><dd>{props.personalizationHook || "Transparent niche-level fallback used"}{props.personalizationSourceUrl ? <> · <a className="text-blue-600" href={props.personalizationSourceUrl} target="_blank" rel="noreferrer">source</a></> : props.personalizationHook ? <> · <a className="text-blue-600" href={`/api/assets/${props.prospectId}`} target="_blank" rel="noreferrer">protected screenshot</a></> : null}</dd></div>
            <div><dt className="font-semibold text-slate-500">Referral invitation</dt><dd><a className="break-all text-blue-600" href={RECRUITER_CONFIG.referralUrl} target="_blank" rel="noreferrer">{RECRUITER_CONFIG.referralUrl}</a></dd></div>
            <div><dt className="font-semibold text-slate-500">Sequence attempt</dt><dd>{props.followUpNumber + 1} of 3</dd></div>
            <div><dt className="font-semibold text-slate-500">Suggested review/send window</dt><dd>{props.scheduledFor ? new Intl.DateTimeFormat("en-US", { timeZone: props.timeZone || undefined, dateStyle: "medium", timeStyle: "short" }).format(new Date(props.scheduledFor)) : "Not scheduled"}{props.timeZone ? ` · ${props.timeZone}` : ""}</dd></div>
          </dl>
          <a href={RECRUITER_CONFIG.referralUrl} className="mt-4 inline-block" target="_blank" rel="noreferrer">
            <Image src={RECRUITER_CONFIG.qrAssetPath} alt={RECRUITER_CONFIG.qrAltText} width={180} height={180} className="rounded-xl border border-slate-200" />
          </a>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {props.approvalStatus === "PENDING" && <button className="button-primary" onClick={() => action("approve")}>Approve reviewed draft</button>}
        {props.approvalStatus === "PENDING" && <button className="button-secondary" onClick={() => action("reject")}>Reject draft</button>}
        {props.approvalStatus === "APPROVED" && !props.sent && <button className="button-secondary" onClick={() => action("mark_sent")}>Mark sent manually</button>}
        {props.approvalStatus === "APPROVED" && !props.sent && !props.gmailDraftId && <button className="button-secondary" onClick={createGmailDraft}>Save as Gmail draft</button>}
        {props.gmailDraftId && !props.sent && <a className="button-secondary" href="https://mail.google.com/mail/u/0/#drafts" target="_blank" rel="noreferrer">Open Gmail drafts</a>}
        {props.sent && <button className="button-secondary" onClick={scheduleFollowUp}>Prepare next attempt</button>}
        <button className="button-secondary button-danger" onClick={suppress}>Mark Do Not Contact</button>
        {props.gmailDraftId && !props.sent && <span className="rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">Gmail draft ready</span>}
        {message && <p className="w-full text-xs text-slate-500">{message}</p>}
      </div>
    </div>
  );
}
