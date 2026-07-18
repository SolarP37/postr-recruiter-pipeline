"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function TrackingActions({ prospectId, status }: { prospectId: string; status: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  async function action(name: string) {
    const response = await fetch(`/api/prospects/${prospectId}/tracking`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: name }),
    });
    const result = await response.json();
    if (response.ok && result.referralLink && name === "copy_referral") {
      await navigator.clipboard.writeText(result.referralLink);
      setMessage("Referral link copied.");
    } else setMessage(response.ok ? result.message : result.error);
    if (response.ok) router.refresh();
  }
  const eligible = ["SENT", "REPLIED", "INTERESTED", "REFERRAL_SENT", "JOINED"].includes(status);
  if (!eligible) return null;
  return <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
    <button className="button-secondary" onClick={() => action("replied")}>Mark replied</button>
    <button className="button-secondary" onClick={() => action("interested")}>Mark interested</button>
    <button className="button-secondary" onClick={() => action("copy_referral")}>Copy referral link</button>
    <button className="button-secondary" onClick={() => action("referral_sent")}>Mark referral sent</button>
    <button className="button-secondary" onClick={() => action("joined")}>Confirm signup</button>
    {message && <p className="w-full text-xs text-slate-500">{message}</p>}
  </div>;
}
