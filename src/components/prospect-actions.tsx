"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ProspectActionsProps = {
  id: string;
  email: string | null;
  displayName: string | null;
  profileBio: string | null;
  creatorCategory: string | null;
  personalizationHook: string | null;
  notes: string | null;
  status: string;
};

export function ProspectActions({
  id,
  email,
  displayName,
  profileBio,
  creatorCategory,
  personalizationHook,
  notes,
  status,
}: ProspectActionsProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const reviewable = [
    "CAPTURED",
    "NEEDS_REVIEW",
    "REJECTED",
    "NO_EMAIL_FOUND",
  ].includes(status);

  async function action(
    actionName: string,
    extra: Record<string, unknown> = {},
  ) {
    const response = await fetch(`/api/prospects/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: actionName, ...extra }),
    });
    const result = await response.json();
    setMessage(response.ok ? result.message : result.error);
    if (response.ok) {
      setEditing(false);
      router.refresh();
    }
  }

  return (
    <div className="mt-5 border-t border-slate-100 pt-5">
      {editing ? (
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            action("edit", {
              email: data.get("email"),
              displayName: data.get("displayName"),
              profileBio: data.get("profileBio"),
              creatorCategory: data.get("creatorCategory"),
              personalizationHook: data.get("personalizationHook"),
              notes: data.get("notes"),
            });
          }}
        >
          <input
            className="field"
            name="email"
            type="email"
            defaultValue={email || ""}
            placeholder="Email"
          />
          <input
            className="field"
            name="displayName"
            maxLength={120}
            defaultValue={displayName || ""}
            placeholder="Display name"
          />
          <textarea
            className="field"
            name="profileBio"
            maxLength={500}
            defaultValue={profileBio || ""}
            placeholder="Visible profile bio"
          />
          <input
            className="field"
            name="creatorCategory"
            maxLength={120}
            defaultValue={creatorCategory || ""}
            placeholder="Creator category visible in the screenshot"
          />
          <textarea
            className="field"
            name="personalizationHook"
            maxLength={280}
            defaultValue={personalizationHook || ""}
            placeholder="Factual personalization hook supported by the screenshot"
          />
          <textarea
            className="field"
            name="notes"
            maxLength={2000}
            defaultValue={notes || ""}
            placeholder="Review notes"
          />
          <p className="text-xs text-slate-500">
            Keep personalization factual and visibly supported. It will be used
            only after you approve this prospect.
          </p>
          <div className="flex gap-2">
            <button className="button-primary" type="submit">
              Save review edits
            </button>
            <button
              className="button-secondary"
              type="button"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          {reviewable && (
            <button className="button-primary" onClick={() => action("approve")}>
              Approve
            </button>
          )}
          {reviewable && (
            <button
              className="button-secondary"
              onClick={() => setEditing(true)}
            >
              Edit
            </button>
          )}
          {reviewable && (
            <button
              className="button-secondary"
              onClick={() => action("reject")}
            >
              Reject
            </button>
          )}
          {reviewable && (
            <button
              className="button-secondary"
              onClick={() => action("no_email")}
            >
              Mark no email
            </button>
          )}
          <button
            className="button-secondary button-danger"
            disabled={!email}
            onClick={() => action("suppress")}
          >
            Suppress
          </button>
        </div>
      )}
      {message && <p className="notice mt-3">{message}</p>}
    </div>
  );
}
