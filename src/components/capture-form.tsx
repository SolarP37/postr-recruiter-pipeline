"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_UPLOAD_BYTES, isAllowedMimeType } from "@/lib/upload";

export function CaptureForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return setMessage("Choose a screenshot first.");
    if (file.size > MAX_UPLOAD_BYTES) {
      return setMessage("Images must be 4 MB or smaller.");
    }
    if (!isAllowedMimeType(file.type)) {
      return setMessage("Choose a PNG, JPEG, or WebP screenshot.");
    }
    setBusy(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    data.set("screenshot", file);
    const response = await fetch("/api/capture", { method: "POST", body: data });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(result.error || "Capture failed.");
    setMessage(
      `${result.created} prospect record${result.created === 1 ? "" : "s"} created for review.`,
    );
    router.refresh();
    if (result.prospectIds?.[0]) {
      router.push(`/prospects?selected=${result.prospectIds[0]}`);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
      <div className="card p-6">
        <label className="field-label">
          Platform
          <select
            name="platform"
            className="field"
            required
            defaultValue="instagram"
          >
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="youtube">YouTube</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="field-label mt-5">
          Public profile URL
          <input
            name="sourceUrl"
            className="field"
            type="url"
            placeholder="https://…"
          />
        </label>
        <label className="field-label mt-5">
          Campaign
          <input
            name="campaign"
            className="field"
            maxLength={120}
            placeholder="Optional campaign label"
          />
        </label>
        <label className="mt-5 grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-slate-300 px-6 py-12 text-center hover:border-blue-400">
          <span className="font-semibold text-slate-700">
            Drop or choose a screenshot
          </span>
          <span className="mt-2 text-sm text-slate-500">
            On a phone, choose it from Photos or Screenshots.
          </span>
          <span className="mt-1 text-xs text-slate-400">
            PNG, JPEG, or WebP · maximum 4 MB
          </span>
          <input
            className="sr-only"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple={false}
            onChange={(event) => {
              const selected = event.target.files?.[0] || null;
              if (
                selected &&
                (selected.size > MAX_UPLOAD_BYTES ||
                  !isAllowedMimeType(selected.type))
              ) {
                setFile(null);
                setPreview("");
                setMessage(
                  selected.size > MAX_UPLOAD_BYTES
                    ? "Images must be 4 MB or smaller."
                    : "Choose a PNG, JPEG, or WebP screenshot.",
                );
                return;
              }
              setFile(selected);
              setPreview(selected ? URL.createObjectURL(selected) : "");
              setMessage("");
            }}
          />
        </label>
        {file && (
          <p className="mt-3 text-sm text-slate-500">
            Selected: {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        )}
        {message && <p className="notice mt-5">{message}</p>}
        <button
          disabled={busy}
          className="button-primary mt-6 w-full disabled:opacity-50"
          type="submit"
        >
          {busy ? "Extracting visible contact information…" : "Upload and extract"}
        </button>
      </div>
      <div className="card flex min-h-96 items-center justify-center overflow-hidden p-4">
        {preview ? (
          <Image
            src={preview}
            alt="Screenshot preview"
            width={900}
            height={1200}
            unoptimized
            className="max-h-[42rem] w-auto rounded-xl object-contain"
          />
        ) : (
          <p className="px-8 text-center text-sm text-slate-400">
            Screenshot preview appears here.
          </p>
        )}
      </div>
    </form>
  );
}
