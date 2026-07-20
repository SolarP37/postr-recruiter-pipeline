"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Attempt = {
  id: string;
  subject: string;
  body: string;
  followUpNumber: number;
  approvalStatus: string;
  gmailDraftId: string | null;
  scheduledFor: string | null;
  sentAt: string | null;
};

type Props = {
  prospectId: string;
  timeZone: string | null;
  publicLocation: string | null;
  attempts: Attempt[];
  stopFollowUps: boolean;
};

function attemptStatus(attempt: Attempt | undefined) {
  if (!attempt) return "Not prepared";
  if (attempt.sentAt) {
    return `Sent ${new Date(attempt.sentAt).toLocaleString()}`;
  }
  if (attempt.approvalStatus === "REJECTED") return "Canceled";
  if (attempt.gmailDraftId) return "Gmail draft ready";
  if (attempt.approvalStatus === "APPROVED") return "Approved";
  return "Review needed";
}

function scheduledLabel(attempt: Attempt, timeZone: string | null) {
  if (!attempt.scheduledFor || attempt.sentAt) return null;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timeZone || undefined,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(attempt.scheduledFor));
}

export function ProspectOutreachPanel({
  prospectId,
  timeZone,
  publicLocation,
  attempts,
  stopFollowUps,
}: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const activeDraft = attempts
    .filter(
      (attempt) =>
        !attempt.sentAt && attempt.approvalStatus !== "REJECTED",
    )
    .sort((left, right) => right.followUpNumber - left.followUpNumber)[0];
  const sentCount = attempts.filter((attempt) => attempt.sentAt).length;
  const canPrepareNext =
    sentCount > 0 &&
    sentCount < 3 &&
    !activeDraft &&
    !stopFollowUps;
  const canCancel =
    Boolean(activeDraft) && (activeDraft?.followUpNumber || 0) > 0;

  async function trackingAction(action: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/prospects/${prospectId}/tracking`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      const result = await response.json();
      setMessage(response.ok ? result.message : result.error);
      if (response.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-5 border-t border-slate-200 pt-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-950">Outreach sequence</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Three attempts maximum. Each draft requires review.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {sentCount}/3 sent
        </span>
      </div>

      <div className="mt-4 grid gap-2">
        {[0, 1, 2].map((number) => {
          const attempt = attempts
            .filter((item) => item.followUpNumber === number)
            .sort((left, right) =>
              right.id.localeCompare(left.id),
            )[0];
          const schedule = attempt
            ? scheduledLabel(attempt, timeZone)
            : null;
          return (
            <div
              key={number}
              className="rounded-xl border border-slate-200 bg-white p-3 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <strong>Attempt {number + 1}</strong>
                <span className="text-right text-slate-500">
                  {attemptStatus(attempt)}
                </span>
              </div>
              {schedule && (
                <p className="mt-1 text-blue-700">
                  Suggested: {schedule}
                  {timeZone ? ` · ${timeZone}` : ""}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl bg-slate-950 p-4 text-slate-100">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-300">
            {activeDraft ? "Current draft" : "Latest email"}
          </p>
          {activeDraft && (
            <Link
              href={`/outreach#message-${activeDraft.id}`}
              className="text-xs font-semibold text-sky-300"
            >
              Review and edit
            </Link>
          )}
        </div>
        {activeDraft ? (
          <>
            <p className="mt-2 text-sm font-semibold">
              {activeDraft.subject}
            </p>
            <pre className="mt-3 max-h-52 overflow-auto whitespace-pre-wrap font-sans text-xs leading-5 text-slate-300">
              {activeDraft.body}
            </pre>
          </>
        ) : (
          <p className="mt-2 text-xs leading-5 text-slate-400">
            {sentCount
              ? "No pending draft. Prepare the next attempt when appropriate."
              : "A tailored draft appears here after qualification and approval."}
          </p>
        )}
      </div>

      <div className="mt-4 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-950">
        <strong>Timing aid:</strong>{" "}
        {publicLocation || timeZone
          ? `${publicLocation || "Location not recorded"} · ${timeZone || "time zone needed"}`
          : "Add a publicly evidenced broad location and IANA time zone during review."}
        <br />
        Suggested weekday times are planning aids, not proof the recipient is
        online.
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {canPrepareNext && (
          <button
            className="button-secondary"
            disabled={busy}
            onClick={() => trackingAction("schedule_follow_up")}
          >
            {busy ? "Preparing…" : "Prepare next attempt"}
          </button>
        )}
        {canCancel && (
          <button
            className="button-secondary"
            disabled={busy}
            onClick={() => trackingAction("cancel_follow_up")}
          >
            Cancel planned follow-up
          </button>
        )}
      </div>
      {message && (
        <p className="notice mt-3 text-xs">{message}</p>
      )}
    </section>
  );
}
