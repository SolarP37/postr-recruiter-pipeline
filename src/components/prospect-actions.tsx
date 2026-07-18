"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProspectActions({ id, email, displayName, notes }: { id: string; email: string | null; displayName: string | null; notes: string | null }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(false);
  async function action(actionName: string, extra: Record<string, unknown> = {}) {
    const response = await fetch(`/api/prospects/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: actionName, ...extra }),
    });
    const result = await response.json();
    setMessage(response.ok ? result.message : result.error);
    if (response.ok) { setEditing(false); router.refresh(); }
  }
  return (
    <div className="mt-5 border-t border-slate-100 pt-5">
      {editing ? (
        <form className="grid gap-3" onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          action("edit", { email: data.get("email"), displayName: data.get("displayName"), notes: data.get("notes") });
        }}>
          <input className="field" name="email" type="email" defaultValue={email || ""} placeholder="Email" />
          <input className="field" name="displayName" defaultValue={displayName || ""} placeholder="Display name" />
          <textarea className="field" name="notes" defaultValue={notes || ""} placeholder="Notes" />
          <div className="flex gap-2"><button className="button-primary" type="submit">Save review edits</button><button className="button-secondary" type="button" onClick={() => setEditing(false)}>Cancel</button></div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button className="button-primary" onClick={() => action("approve")}>Approve</button>
          <button className="button-secondary" onClick={() => setEditing(true)}>Edit</button>
          <button className="button-secondary" onClick={() => action("reject")}>Reject</button>
          <button className="button-secondary" onClick={() => action("no_email")}>Mark no email</button>
          <button className="button-secondary button-danger" disabled={!email} onClick={() => action("suppress")}>Suppress</button>
        </div>
      )}
      {message && <p className="notice mt-3">{message}</p>}
    </div>
  );
}
