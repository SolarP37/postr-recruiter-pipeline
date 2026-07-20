"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ProspectActionsProps = {
  id: string;
  leadType: string;
  email: string | null;
  displayName: string | null;
  creatorFirstName: string | null;
  username: string | null;
  organizationName: string | null;
  businessWebsite: string | null;
  emailSourceUrl: string | null;
  emailSourceType: string | null;
  profileBio: string | null;
  creatorCategory: string | null;
  personalizationHook: string | null;
  personalizationSourceUrl: string | null;
  publicLocation: string | null;
  locationEvidenceUrl: string | null;
  timeZone: string | null;
  preferredSendHourLocal: number;
  followerCount: number | null;
  followerCountVerified: boolean;
  qualificationStatus: string;
  qualificationEvidenceUrl: string | null;
  notes: string | null;
  status: string;
  hasScreenshot: boolean;
};

export function ProspectActions({
  id,
  leadType,
  email,
  displayName,
  creatorFirstName,
  username,
  organizationName,
  businessWebsite,
  emailSourceUrl,
  emailSourceType,
  profileBio,
  creatorCategory,
  personalizationHook,
  personalizationSourceUrl,
  publicLocation,
  locationEvidenceUrl,
  timeZone,
  preferredSendHourLocal,
  followerCount,
  followerCountVerified,
  qualificationStatus,
  qualificationEvidenceUrl,
  notes,
  status,
  hasScreenshot,
}: ProspectActionsProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
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
    setBusyAction(actionName);
    setMessage("");
    try {
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
    } finally {
      setBusyAction(null);
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
              leadType: data.get("leadType"),
              displayName: data.get("displayName"),
              creatorFirstName: data.get("creatorFirstName"),
              username: data.get("username"),
              organizationName: data.get("organizationName"),
              businessWebsite: data.get("businessWebsite"),
              emailSourceUrl: data.get("emailSourceUrl"),
              emailSourceType: data.get("emailSourceType"),
              profileBio: data.get("profileBio"),
              creatorCategory: data.get("creatorCategory"),
              personalizationHook: data.get("personalizationHook"),
              personalizationSourceUrl: data.get("personalizationSourceUrl"),
              publicLocation: data.get("publicLocation"),
              locationEvidenceUrl: data.get("locationEvidenceUrl"),
              timeZone: data.get("timeZone"),
              preferredSendHourLocal: data.get("preferredSendHourLocal"),
              followerCount: data.get("followerCount"),
              followerCountVerified: data.get("followerCountVerified") === "on",
              qualificationStatus: data.get("qualificationStatus"),
              qualificationEvidenceUrl: data.get("qualificationEvidenceUrl"),
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
          <select className="field" name="leadType" defaultValue={leadType}>
            <option value="CREATOR">Creator lead</option>
            <option value="BRAND">Brand lead</option>
          </select>
          <input
            className="field"
            name="displayName"
            maxLength={120}
            defaultValue={displayName || ""}
            placeholder="Display name"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="field" name="creatorFirstName" maxLength={60} defaultValue={creatorFirstName || ""} placeholder="Contact first name" />
            <input className="field" name="username" maxLength={120} defaultValue={username || ""} placeholder="Public username" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="field" name="organizationName" maxLength={120} defaultValue={organizationName || ""} placeholder="Organization name (brands)" />
            <input className="field" name="businessWebsite" maxLength={2048} defaultValue={businessWebsite || ""} placeholder="Business website" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="field" name="emailSourceUrl" maxLength={2048} defaultValue={emailSourceUrl || ""} placeholder="Public business-email source URL" />
            <input className="field" name="emailSourceType" maxLength={120} defaultValue={emailSourceType || ""} placeholder="Source type (profile, website…)" />
          </div>
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
          <input className="field" name="personalizationSourceUrl" maxLength={2048} defaultValue={personalizationSourceUrl || ""} placeholder="Personalization evidence URL" />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="field"
              name="publicLocation"
              maxLength={120}
              defaultValue={publicLocation || ""}
              placeholder="Broad public location (city/region/country)"
            />
            <input
              className="field"
              name="locationEvidenceUrl"
              maxLength={2048}
              defaultValue={locationEvidenceUrl || ""}
              placeholder="Public location evidence URL"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="field"
              name="timeZone"
              maxLength={100}
              defaultValue={timeZone || ""}
              placeholder="IANA time zone, e.g. America/New_York"
            />
            <label className="field-label">
              Suggested local send hour
              <select
                className="field"
                name="preferredSendHourLocal"
                defaultValue={preferredSendHourLocal}
              >
                <option value="8">8:00</option>
                <option value="9">9:00</option>
                <option value="10">10:00</option>
                <option value="11">11:00</option>
                <option value="12">12:00</option>
                <option value="13">13:00</option>
                <option value="14">14:00</option>
                <option value="15">15:00</option>
                <option value="16">16:00</option>
              </select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="field" name="followerCount" type="number" min={0} step={1} defaultValue={followerCount ?? ""} placeholder="Public follower count" />
            <select className="field" name="qualificationStatus" defaultValue={qualificationStatus}>
              <option value="QUALIFIED">Qualified</option>
              <option value="LIKELY_QUALIFIED">Likely Qualified</option>
              <option value="NEEDS_REVIEW">Needs Review</option>
              <option value="NOT_YET_QUALIFIED">Not Yet Qualified</option>
              <option value="DO_NOT_CONTACT">Do Not Contact</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input name="followerCountVerified" type="checkbox" defaultChecked={followerCountVerified} />
            Exact follower count verified from the public source
          </label>
          <input className="field" name="qualificationEvidenceUrl" maxLength={2048} defaultValue={qualificationEvidenceUrl || ""} placeholder="Qualification evidence URL" />
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
          <p className="text-xs text-slate-500">
            Record only a broad location explicitly shown on a public profile
            or business page. The time zone creates a suggested weekday review
            window; it does not claim the person is online.
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
            <button
              className="button-primary"
              disabled={busyAction !== null}
              onClick={() => action("approve")}
            >
              {busyAction === "approve"
                ? "Preparing draft…"
                : "Approve & create tailored draft"}
            </button>
          )}
          {reviewable && (
            <button
              className="button-secondary"
              disabled={busyAction !== null}
              onClick={() => setEditing(true)}
            >
              Edit
            </button>
          )}
          {reviewable && (
            <button
              className="button-secondary"
              disabled={busyAction !== null}
              onClick={() => action("reject")}
            >
              Reject
            </button>
          )}
          {reviewable && (
            <button
              className="button-secondary"
              disabled={busyAction !== null}
              onClick={() => action("no_email")}
            >
              Mark no email
            </button>
          )}
          {reviewable && hasScreenshot && (
            <button
              className="button-secondary"
              disabled={busyAction !== null}
              onClick={() => action("reprocess")}
            >
              {busyAction === "reprocess" ? "Running OCR…" : "Re-run OCR"}
            </button>
          )}
          <button
            className="button-secondary button-danger"
            disabled={!email || busyAction !== null}
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
