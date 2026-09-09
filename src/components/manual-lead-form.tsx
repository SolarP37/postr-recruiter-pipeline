"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function ManualLeadForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [inspecting, setInspecting] = useState(false);

  function fill(name: string, value: string | null) {
    if (!value || !formRef.current) return;
    const field = formRef.current.elements.namedItem(name);
    if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) field.value = value;
  }

  async function inspectUrl() {
    const field = formRef.current?.elements.namedItem("inspectionUrl");
    const url = field instanceof HTMLInputElement ? field.value.trim() : "";
    if (!url) return setMessage("Enter a public profile or business-page URL.");
    setInspecting(true);
    setMessage("");
    const response = await fetch("/api/prospects/inspect-url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const result = await response.json();
    setInspecting(false);
    if (!response.ok) return setMessage(result.error || "The page could not be inspected.");
    fill("email", result.email);
    fill("displayName", result.title);
    fill("businessWebsite", result.url);
    fill("sourcePlatform", result.sourcePlatform);
    fill("sourceUrl", result.url);
    fill("personalizationHook", result.description);
    fill("personalizationSourceUrl", result.url);
    setMessage(result.email ? "Public page inspected. Verify the extracted email and context, then save it for review." : "Page context was found, but no public email was visible. Add a verified public business email before saving.");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    const followerText = String(data.get("followerCount") || "").trim();
    const response = await fetch("/api/prospects/manual", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        leadType: data.get("leadType"),
        email: data.get("email"),
        displayName: data.get("displayName"),
        contactFirstName: data.get("contactFirstName"),
        organizationName: data.get("organizationName"),
        businessWebsite: data.get("businessWebsite"),
        sourcePlatform: data.get("sourcePlatform"),
        sourceUrl: data.get("sourceUrl"),
        emailSourceType: data.get("emailSourceType"),
        category: data.get("category"),
        personalizationHook: data.get("personalizationHook"),
        personalizationSourceUrl: data.get("personalizationSourceUrl"),
        publicLocation: data.get("publicLocation"),
        locationEvidenceUrl: data.get("locationEvidenceUrl"),
        timeZone: data.get("timeZone"),
        preferredSendHourLocal: Number(
          data.get("preferredSendHourLocal") || 10,
        ),
        followerCount: followerText ? Number(followerText) : null,
        followerCountVerified: data.get("followerCountVerified") === "on",
        notes: data.get("notes"),
      }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(result.error || "Unable to save the lead.");
      return;
    }
    setMessage(
      result.duplicate
        ? "Lead saved and flagged as a possible duplicate for review."
        : "Lead saved to the human review queue.",
    );
    router.push(`/prospects?selected=${result.id}`);
    router.refresh();
  }

  return (
    <form ref={formRef} className="card mt-6 grid gap-4 p-6" onSubmit={submit}>
      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <h2 className="font-semibold text-blue-950">Start with a public URL</h2>
        <p className="mt-1 text-sm text-blue-900">Paste a creator profile or brand website. The page inspector copies a visibly published email and context into this form; you verify everything before any draft is created.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input className="field flex-1 bg-white" name="inspectionUrl" type="url" placeholder="https://example.com/profile" />
          <button className="button-secondary shrink-0" type="button" disabled={inspecting} onClick={inspectUrl}>{inspecting ? "Inspecting page…" : "Inspect URL"}</button>
        </div>
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field-label">
          Lead type
          <select className="field" name="leadType" defaultValue="CREATOR">
            <option value="CREATOR">Creator</option>
            <option value="BRAND">Brand</option>
          </select>
        </label>
        <label className="field-label">
          Public business email
          <input className="field" name="email" type="email" required />
        </label>
        <label className="field-label">
          Contact or display name
          <input className="field" name="displayName" maxLength={120} />
        </label>
        <label className="field-label">
          Contact first name
          <input className="field" name="contactFirstName" maxLength={60} />
        </label>
        <label className="field-label">
          Organization name
          <input className="field" name="organizationName" maxLength={120} />
        </label>
        <label className="field-label">
          Business website
          <input className="field" name="businessWebsite" type="url" placeholder="https://example.com" />
        </label>
        <label className="field-label">
          Source platform
          <input className="field" name="sourcePlatform" required placeholder="Google search, website, Instagram…" />
        </label>
        <label className="field-label">
          Public source URL
          <input className="field" name="sourceUrl" type="url" required placeholder="https://…" />
        </label>
        <label className="field-label">
          Contact source type
          <select className="field" name="emailSourceType" defaultValue="official_website">
            <option value="official_website">Official website</option>
            <option value="public_business_profile">Public business profile</option>
            <option value="public_business_directory">Public business directory</option>
          </select>
        </label>
        <label className="field-label">
          Niche or business category
          <input className="field" name="category" maxLength={120} />
        </label>
        <label className="field-label">
          Public follower count (creators)
          <input className="field" name="followerCount" type="number" min={0} step={1} />
        </label>
        <label className="flex items-end gap-2 pb-3 text-sm text-slate-600">
          <input name="followerCountVerified" type="checkbox" />
          Exact follower count verified at the source URL
        </label>
        <label className="field-label">
          Broad public location
          <input
            className="field"
            name="publicLocation"
            maxLength={120}
            placeholder="City, region, or country shown publicly"
          />
        </label>
        <label className="field-label">
          Location evidence URL
          <input
            className="field"
            name="locationEvidenceUrl"
            type="url"
            placeholder="Defaults to the public source URL"
          />
        </label>
        <label className="field-label">
          IANA time zone
          <input
            className="field"
            name="timeZone"
            maxLength={100}
            placeholder="America/New_York"
          />
        </label>
        <label className="field-label">
          Suggested local send hour
          <select
            className="field"
            name="preferredSendHourLocal"
            defaultValue="10"
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
      <label className="field-label">
        Factual personalization detail
        <textarea className="field" name="personalizationHook" maxLength={280} placeholder="One concise fact visibly supported by the public source" />
      </label>
      <label className="field-label">
        Personalization evidence URL
        <input className="field" name="personalizationSourceUrl" type="url" placeholder="Defaults to the public source URL" />
      </label>
      <label className="field-label">
        Review notes
        <textarea className="field" name="notes" maxLength={2000} />
      </label>
      <p className="text-xs leading-5 text-slate-500">
        Use only public business-contact information. Saving creates a review
        record; it never creates a Gmail draft or sends outreach.
        Record only a broad location explicitly supported by the public source.
      </p>
      {message && <p className="notice">{message}</p>}
      <button className="button-primary w-fit disabled:opacity-50" type="submit" disabled={busy}>
        {busy ? "Saving lead…" : "Save to review queue"}
      </button>
    </form>
  );
}
