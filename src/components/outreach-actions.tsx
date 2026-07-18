"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateOutreachButton({ prospectId }: { prospectId: string }) {
  const router = useRouter(); const [message, setMessage] = useState("");
  async function create() {
    const response = await fetch("/api/outreach", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prospectId }) });
    const result = await response.json(); setMessage(response.ok ? "Local draft prepared for approval." : result.error); if (response.ok) router.refresh();
  }
  return <div><button onClick={create} className="button-secondary">Prepare outreach</button>{message && <p className="mt-2 text-xs text-slate-500">{message}</p>}</div>;
}

export function OutreachActions({ messageId, approvalStatus, sent, gmailDraftId }: { messageId: string; approvalStatus: string; sent: boolean; gmailDraftId: string | null }) {
  const router = useRouter(); const [message, setMessage] = useState("");
  async function action(name: string) {
    const response = await fetch(`/api/outreach/${messageId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: name }) });
    const result = await response.json(); setMessage(response.ok ? result.message : result.error); if (response.ok) router.refresh();
  }
  async function createGmailDraft() {
    const response = await fetch("/api/gmail/create-draft", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messageId }),
    });
    const result = await response.json();
    setMessage(response.ok ? "Gmail draft created. Review and send it manually in Gmail." : result.error);
    if (response.ok) router.refresh();
  }
  return <div className="mt-4 flex flex-wrap items-center gap-2">
    {approvalStatus === "PENDING" && <button className="button-primary" onClick={() => action("approve")}>Approve draft</button>}
    {approvalStatus === "PENDING" && <button className="button-secondary" onClick={() => action("reject")}>Reject</button>}
    {approvalStatus === "APPROVED" && !sent && <button className="button-secondary" onClick={() => action("mark_sent")}>Mark sent manually</button>}
    {approvalStatus === "APPROVED" && !sent && !gmailDraftId && <button className="button-secondary" onClick={createGmailDraft}>Create Gmail draft</button>}
    {gmailDraftId && !sent && <span className="rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">Gmail draft ready</span>}
    {message && <p className="w-full text-xs text-slate-500">{message}</p>}
  </div>;
}
