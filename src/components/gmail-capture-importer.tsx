"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  captureEmail: string | null;
  gmailConnected: boolean;
  captureScopeGranted: boolean;
};

export function GmailCaptureImporter(props: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function importCaptures() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/capture/gmail", { method: "POST" });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(result.error || "Capture inbox import failed.");
      return;
    }
    const summary = `${result.messagesFound} message${
      result.messagesFound === 1 ? "" : "s"
    } found; ${result.supportedAttachmentsFound} supported image${
      result.supportedAttachmentsFound === 1 ? "" : "s"
    }; ${result.attachmentsImported} image${
        result.attachmentsImported === 1 ? "" : "s"
    } imported; ${result.prospectsCreated} prospect record${
        result.prospectsCreated === 1 ? "" : "s"
      } created; ${result.optimizedAttachments} oversized image${
        result.optimizedAttachments === 1 ? "" : "s"
      } optimized; ${result.skipped} already imported.`;
    setMessage(
      result.errors?.length
        ? `${summary} ${result.errors.join(" ")}`
        : summary,
    );
    router.refresh();
    if (result.prospectIds?.[0]) {
      router.push(`/prospects?selected=${result.prospectIds[0]}`);
    }
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
    </div>
  );
}
