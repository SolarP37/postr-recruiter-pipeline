import { db } from "@/lib/db";
import { MemoryAgentLogger } from "@/lib/agents/logger";
import { createInitialAgents } from "@/lib/agents/shells";
import { MissionControlActions } from "@/components/mission-control-actions";
import { getAgentWorkerConfig } from "@/lib/orchestrator/worker-config";
import { getAgentExecutionPolicy } from "@/lib/orchestrator/worker-config";
import { buildAgentInsight } from "@/lib/agent-insights";
import { configuredResearchCapabilities } from "@/lib/research";

const placeholderSections = [
  ["Creator Discovery", "Ready for a Sprint 2 discovery adapter."],
  ["Brand Discovery", "Ready for a Sprint 2 discovery adapter."],
  ["Analytics", "Read-only CRM snapshots are available as manual tasks."],
  ["Settings", "Per-agent limits and scheduled execution are active."],
] as const;

export default async function MissionControlPage() {
  const now = new Date();
  const [queued, scheduled, running, completed, failed, recentLogs, metrics, insightJobs, recentJobs, prospectRecords] = await Promise.all([
    db.agentJob.count({ where: { status: { in: ["QUEUED", "RETRY_SCHEDULED"] } } }),
    db.agentJob.count({ where: { status: { in: ["QUEUED", "RETRY_SCHEDULED"] }, scheduledFor: { gt: now } } }),
    db.agentJob.count({ where: { status: "RUNNING" } }),
    db.agentJob.count({ where: { status: "COMPLETED" } }),
    db.agentJob.count({ where: { status: "FAILED" } }),
    db.agentLog.findMany({ orderBy: { timestamp: "desc" }, take: 8 }),
    db.agentExecutionMetric.findMany({ orderBy: { recordedAt: "desc" }, take: 1000 }),
    db.agentJob.findMany({ orderBy: { createdAt: "desc" }, take: 500, select: { agentId: true, status: true, scheduledFor: true, createdAt: true } }),
    db.agentJob.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    db.prospect.findMany({ orderBy: { updatedAt: "desc" }, take: 50, select: { id: true, displayName: true, organizationName: true, email: true, leadType: true } }),
  ]);
  const agents = createInitialAgents(new MemoryAgentLogger());
  const research = configuredResearchCapabilities();
  const connectedAgentIds = new Set([
    "creator-qualification",
    "email-generation",
    "followup",
    "analytics",
    ...(research.brave ? ["creator-discovery"] : []),
    ...(research.publicPage || research.apify ? ["creator-research"] : []),
  ]);
  const workerConfig = getAgentWorkerConfig();
  const insights = new Map(agents.map((agent) => [agent.id, buildAgentInsight(agent.id, connectedAgentIds.has(agent.id), insightJobs, metrics, now)]));
  const successfulRuns = metrics.filter((metric) => metric.successful).length;
  const averageDuration = metrics.length ? Math.round(metrics.reduce((sum, metric) => sum + metric.executionTimeMs, 0) / metrics.length) : 0;
  const retryCount = metrics.reduce((sum, metric) => sum + metric.retryCount, 0);
  const prospectOptions = prospectRecords.map((prospect) => ({
    id: prospect.id,
    label: `${prospect.displayName || prospect.organizationName || prospect.email || "Unnamed prospect"} · ${prospect.leadType.toLowerCase()}`,
  }));

  return (
    <main className="page-shell">
      <p className="eyebrow">AI orchestration</p>
      <h1 className="page-title mt-3">Mission Control</h1>
      <p className="page-copy">A governed control plane for queued agent work. Read-only research activates only with owner-configured providers; all outreach remains review-only and never sends automatically.</p>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["AI Queue", queued],
          ["Scheduled", scheduled],
          ["Running Tasks", running],
          ["Completed Tasks", completed],
          ["Failed Tasks", failed],
        ].map(([label, value]) => (
          <article key={label} className="card p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
          </article>
        ))}
      </section>

      <MissionControlActions prospects={prospectOptions} />

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <article className="card p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Agent Status</h2>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{agents.length} registered</span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {agents.map((agent) => (
              <div key={agent.id} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-semibold text-slate-900">{agent.name}</p><p className="mt-1 text-sm text-slate-500">{agent.description}</p></div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${insights.get(agent.id)?.health === "HEALTHY" ? "bg-emerald-50 text-emerald-700" : insights.get(agent.id)?.health === "DEGRADED" ? "bg-red-50 text-red-700" : insights.get(agent.id)?.health === "READY" ? "bg-blue-50 text-blue-700" : "bg-slate-200 text-slate-600"}`}>{insights.get(agent.id)?.health}</span>
                </div>
                <p className="mt-3 text-xs text-slate-500">{connectedAgentIds.has(agent.id) ? `Manual or scheduled · ${getAgentExecutionPolicy(agent.id).maxPerWorkerRun}/worker run · ${getAgentExecutionPolicy(agent.id).activeQueueLimit} queued max` : "Execution disabled until an adapter is owner-approved."}</p>
                <p className="mt-1 text-xs text-slate-400">{insights.get(agent.id)?.active} active · {insights.get(agent.id)?.runs} recorded runs · {insights.get(agent.id)?.successRate ?? "—"}% success</p>
              </div>
            ))}
          </div>
        </article>

        <div className="grid gap-6">
          <article className="card p-6">
            <h2 className="text-lg font-semibold">System Health</h2>
            <p className="mt-4 text-2xl font-semibold text-emerald-700">Operational</p>
            <p className="mt-2 text-sm text-slate-500">Database connected · approval enforcement active · stale-lock recovery configured</p>
            <p className="mt-3 text-xs text-slate-400">Worker limit: {workerConfig.maxJobsPerRun} jobs · stale after {workerConfig.staleLockMinutes} minutes · queue cap {workerConfig.queueLimit}</p>
          </article>
          <article className="card p-6">
            <h2 className="text-lg font-semibold">Execution Metrics</h2>
            <p className="mt-4 text-2xl font-semibold">{metrics.length} runs</p>
            <p className="mt-2 text-sm text-slate-500">{metrics.length ? Math.round((successfulRuns / metrics.length) * 100) : 0}% success · {averageDuration} ms average · {retryCount} retries</p>
          </article>
        </div>
      </section>

      <section className="card mt-8 p-6">
        <h2 className="text-lg font-semibold">Recent Tasks</h2>
        {recentJobs.length === 0 ? <p className="mt-4 text-sm text-slate-500">No tasks have been queued yet.</p> : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-400"><tr><th className="pb-3">Task</th><th className="pb-3">Agent</th><th className="pb-3">Priority</th><th className="pb-3">Approval</th><th className="pb-3">Status</th><th className="pb-3">Scheduled</th><th className="pb-3">Created</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {recentJobs.map((job) => <tr key={job.id}><td className="py-3 font-medium text-slate-900">{job.taskType}</td><td className="py-3 text-slate-600">{job.agentName}</td><td className="py-3 text-slate-600">{job.priority}</td><td className="py-3 text-slate-600">{job.requiresApproval ? job.approvedAt ? "Approved" : "Required" : "Not required"}</td><td className="py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{job.status.replaceAll("_", " ")}</span></td><td className="py-3 text-slate-500">{job.scheduledFor.toLocaleString()}</td><td className="py-3 text-slate-500">{job.createdAt.toLocaleString()}</td></tr>)}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {placeholderSections.map(([title, copy]) => (
          <article key={title} className="card p-5">
            <p className="font-semibold text-slate-900">{title}</p>
            <p className="mt-2 text-sm text-slate-500">{copy}</p>
          </article>
        ))}
      </section>

      <section className="card mt-8 p-6">
        <h2 className="text-lg font-semibold">Logs</h2>
        {recentLogs.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No agent executions have been logged yet.</p>
        ) : (
          <div className="mt-4 divide-y divide-slate-100">
            {recentLogs.map((log) => (
              <div key={log.id} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto]">
                <div><p className="text-sm font-medium text-slate-900">{log.agentName} · {log.event}</p><p className="text-sm text-slate-500">{log.message}</p></div>
                <time className="text-xs text-slate-400">{log.timestamp.toLocaleString()}</time>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
