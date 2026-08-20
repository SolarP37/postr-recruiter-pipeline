"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TaskType = "discovery.search" | "research.inspect" | "research.apify_dataset" | "qualification.evaluate" | "outreach.prepare" | "followup.prepare" | "analytics.snapshot";

export function MissionControlActions({ prospects }: { prospects: Array<{ id: string; label: string }> }) {
  const router = useRouter();
  const [taskType, setTaskType] = useState<TaskType>("qualification.evaluate");
  const [prospectId, setProspectId] = useState("");
  const [researchInput, setResearchInput] = useState("");
  const [message, setMessage] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [busy, setBusy] = useState(false);
  const needsProspect = ["qualification.evaluate", "outreach.prepare", "followup.prepare"].includes(taskType);
  const needsResearchInput = taskType === "discovery.search" || taskType === "research.inspect";

  async function queueTask() {
    setBusy(true);
    setMessage("");
    const task = needsProspect
      ? { type: taskType, prospectId: prospectId.trim() }
      : taskType === "discovery.search"
        ? { type: taskType, query: researchInput.trim(), limit: 5 }
        : taskType === "research.inspect"
          ? { type: taskType, url: researchInput.trim() }
          : taskType === "research.apify_dataset"
            ? { type: taskType, limit: 5 }
            : { type: taskType };
    const response = await fetch("/api/mission-control/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ task, priority: "NORMAL", scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : undefined }),
    });
    const result = await response.json().catch(() => ({}));
    setMessage(response.ok ? `Task queued: ${result.id}` : result.error || "Unable to queue task.");
    setBusy(false);
    router.refresh();
  }

  async function runNext() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/mission-control/run", { method: "POST" });
    const result = await response.json().catch(() => ({}));
    setMessage(response.ok ? result.id ? `Task ${result.status.toLowerCase()}: ${result.id}` : result.message : result.error || "Unable to run task.");
    setBusy(false);
    router.refresh();
  }

  return (
    <section className="card mt-8 p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-lg font-semibold">Human-triggered task controls</h2>
          <p className="mt-1 text-sm text-slate-500">Research returns evidence for review. Outreach and follow-up create internal drafts only; no task approves prospects or sends email.</p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Automatic execution off</span>
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto_auto]">
        <select value={taskType} onChange={(event) => setTaskType(event.target.value as TaskType)} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm">
          <option value="discovery.search">Search public web (Brave)</option>
          <option value="research.inspect">Inspect one public page</option>
          <option value="research.apify_dataset">Read approved Apify dataset</option>
          <option value="qualification.evaluate">Evaluate creator qualification</option>
          <option value="outreach.prepare">Prepare reviewed outreach draft</option>
          <option value="followup.prepare">Prepare follow-up draft</option>
          <option value="analytics.snapshot">Capture analytics snapshot</option>
        </select>
        <div>
          <input list="mission-control-prospects" value={needsResearchInput ? researchInput : prospectId} onChange={(event) => needsResearchInput ? setResearchInput(event.target.value) : setProspectId(event.target.value)} disabled={!needsProspect && !needsResearchInput} placeholder={needsProspect ? "Select or paste prospect ID" : taskType === "discovery.search" ? "Creator niche and location query" : taskType === "research.inspect" ? "Public profile or website URL" : "No input required"} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm disabled:bg-slate-100" />
          <datalist id="mission-control-prospects">
            {prospects.map((prospect) => <option key={prospect.id} value={prospect.id}>{prospect.label}</option>)}
          </datalist>
        </div>
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Run at (optional)
          <input type="datetime-local" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-900" />
        </label>
        <button type="button" onClick={queueTask} disabled={busy || (needsProspect && !prospectId.trim()) || (needsResearchInput && !researchInput.trim())} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Queue task</button>
        <button type="button" onClick={runNext} disabled={busy} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50">Run next</button>
      </div>
      {message ? <p className="mt-4 text-sm text-slate-600" role="status">{message}</p> : null}
    </section>
  );
}
