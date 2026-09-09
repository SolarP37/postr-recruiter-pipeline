"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  captureEmail: string | null;
  gmailConnected: boolean;
  captureScopeGranted: boolean;
};

type ImportItem = {
  messageId: string;
  subject: string;
  filename: string;
  status: "processed" | "skipped" | "failed";
  prospectsCreated: number;
  duplicatesDetected: number;
  optimized: boolean;
  detail: string;
};

type ImportReport = {
  messagesFound: number;
  supportedAttachmentsFound: number;
  attachmentsImported: number;
  prospectsCreated: number;
  optimizedAttachments: number;
  skipped: number;
  duplicatesDetected: number;
  errors: string[];
  prospectIds: string[];
  items: ImportItem[];
};

export function GmailCaptureImporter(props: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [report, setReport] = useState<ImportReport | null>(null);

  async function importCaptures() {
    setBusy(true);
    setMessage("");
    setReport(null);
    const response = await fetch("/api/capture/gmail", { method: "POST" });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(result.error || "Capture inbox import failed.");
      return;
    }
    setReport(result as ImportReport);
    router.refresh();
  }

  if (!props.captureEmail) {
    return (
      <p className="notice mt-5">
        Add <strong>INBOUND_CAPTURE_EMAIL</strong> to the environment, then
        restart the app.
      </p>
    );
  }

  return (
    <div className="mt-5">
      <p className="rounded-2xl bg-slate-50 p-4 font-semibold text-slate-950">
        Send screenshots to: {props.captureEmail}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-500">
        Optional subject tags: [brand], [instagram], [tiktok], or [youtube].
        Untagged messages import as creator leads for manual review.
      </p>
      {!props.gmailConnected || !props.captureScopeGranted ? (
        <a className="button-secondary mt-5" href="/api/auth/google">
          {props.gmailConnected ? "Reconnect Gmail for capture" : "Connect Gmail"}
        </a>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={importCaptures}
          className="button-primary mt-5 disabled:opacity-50"
        >
          {busy ? "Checking capture inbox..." : "Import new screenshots"}
        </button>
      )}
      {message && <p className="notice mt-4">{message}</p>}
      {report && (
        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-slate-950">Capture import report</h3>
              <p className="mt-1 text-sm text-slate-500">
                Checked {report.messagesFound} recent message{report.messagesFound === 1 ? "" : "s"} and found {report.supportedAttachmentsFound} supported image{report.supportedAttachmentsFound === 1 ? "" : "s"}.
              </p>
            </div>
            {report.prospectIds[0] && (
              <Link className="button-secondary" href={`/prospects?selected=${report.prospectIds[0]}`}>
                Review imported prospects
              </Link>
            )}
          </div>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Processed", report.attachmentsImported],
              ["Skipped", report.skipped],
              ["Duplicates", report.duplicatesDetected],
              ["Failed", report.errors.length],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-slate-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
                <dd className="mt-1 text-2xl font-bold text-slate-950">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm text-slate-600">
            {report.prospectsCreated} prospect review record{report.prospectsCreated === 1 ? "" : "s"} created; {report.optimizedAttachments} oversized image{report.optimizedAttachments === 1 ? "" : "s"} optimized before OCR.
          </p>
          {report.items.length > 0 ? (
            <ul className="mt-4 grid gap-3">
              {report.items.map((item) => (
                <li key={`${item.messageId}:${item.filename}`} className="rounded-2xl border border-slate-200 p-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="break-all text-slate-950">{item.filename}</strong>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === "processed" ? "bg-emerald-50 text-emerald-700" : item.status === "skipped" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>
                      {item.status}
                    </span>
                    {item.duplicatesDetected > 0 && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{item.duplicatesDetected} duplicate</span>}
                    {item.optimized && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">optimized</span>}
                  </div>
                  <p className="mt-2 text-slate-500">{item.subject} · {item.detail}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="notice mt-4">No new supported screenshots were found. Attach or paste a PNG, JPEG, or WebP image into a new message and try again.</p>
          )}
        </section>
      )}
    </div>
  );
}
