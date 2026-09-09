"use client";

import { useState } from "react";
import { RECRUITER_CONFIG } from "@/config/recruiter";

export function RecruiterCardActions() {
  const [message, setMessage] = useState("");
  return (
    <div className="flex flex-wrap gap-2">
      <button
        className="button-secondary"
        onClick={async () => {
          await navigator.clipboard.writeText(RECRUITER_CONFIG.referralUrl);
          setMessage("Referral link copied.");
        }}
      >
        Copy link
      </button>
      <a className="button-secondary" href={RECRUITER_CONFIG.qrAssetPath} download="postrpatcon-qr.png">Download QR</a>
      <a className="button-primary" href="/outreach">Create email</a>
      {message && <span className="self-center text-xs text-slate-500">{message}</span>}
    </div>
  );
}
