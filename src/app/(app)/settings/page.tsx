import { isDemoAuthEnabled } from "@/lib/auth";
import { db } from "@/lib/db";
import { productionReadinessIssues } from "@/lib/production-readiness";
import { getSendingMode, RECRUITER_CONFIG } from "@/config/recruiter";
import { hasGmailCaptureScope } from "@/lib/gmail";

export default async function SettingsPage() {
  const [google, lastBackup, recentOperationalErrors] = await Promise.all([
    db.oAuthToken.findUnique({ where: { provider: "google" } }),
    db.auditEvent.findFirst({
      where: { action: "BACKUP_COMPLETED" },
      orderBy: { createdAt: "desc" },
    }),
    db.auditEvent.count({ where: { action: "OPERATIONAL_ERROR" } }),
  ]);
  const googleConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REDIRECT_URI &&
    process.env.TOKEN_ENCRYPTION_KEY,
  );
  const readinessIssues = productionReadinessIssues();
  const databaseProvider = /^postgres(ql)?:\/\//i.test(
    process.env.DATABASE_URL || "",
  )
    ? "PostgreSQL"
    : "SQLite";
  const checks = [
    ["Database", `Connected (${databaseProvider})`],
    ["Authentication", isDemoAuthEnabled() ? "Demo mode — local only" : "Configured"],
    ["Production readiness", readinessIssues.length ? `${readinessIssues.length} items remaining` : "Ready"],
    ["Vision provider", process.env.VISION_PROVIDER || "mock"],
    ["OpenAI key", process.env.OPENAI_API_KEY ? "Configured" : "Not configured"],
    ["Gmail OAuth", google ? "Connected" : googleConfigured ? "Ready to connect" : "Credentials required"],
    ["Phone capture email", process.env.INBOUND_CAPTURE_EMAIL || "Not configured"],
    ["Gmail capture access", hasGmailCaptureScope(google?.scope) ? "Granted" : "Reconnect required"],
    ["Recruiter", `${RECRUITER_CONFIG.recruiterName} · ${RECRUITER_CONFIG.referralCode}`],
    ["Outreach mode", getSendingMode().replaceAll("_", " ")],
    ["Last private backup", lastBackup ? lastBackup.createdAt.toLocaleString() : "Not completed yet"],
    ["Operational errors recorded", String(recentOperationalErrors)],
    ["External error alerts", process.env.OPERATIONS_ALERT_WEBHOOK_URL ? "Configured" : "Not configured"],
  ];
  return (
    <main className="page-shell">
      <h1 className="page-title">Settings and readiness</h1>
      <p className="page-copy">Credentials are read from local environment variables and never displayed here.</p>
      <section className="card mt-8 divide-y divide-slate-100 p-2">
        {checks.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-6 p-4"><span className="font-medium">{label}</span><span className="text-sm text-slate-500">{value}</span></div>)}
      </section>
      {readinessIssues.length > 0 && (
        <section className="card mt-6 p-6">
          <h2 className="font-semibold">Production configuration</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            These checks report missing configuration names without displaying
            secret values.
          </p>
          <ul className="mt-4 grid gap-2 text-sm text-slate-600">
            {readinessIssues.map((issue) => (
              <li key={issue.key}>
                <strong>{issue.key}:</strong> {issue.message}
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="card mt-6 p-6">
        <h2 className="font-semibold">Gmail</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Gmail creates reviewed drafts and can read screenshot attachments
          sent to the configured capture address. Reading is limited to the
          recruiter-triggered capture import workflow.
        </p>
        {google ? (
          <form action="/api/gmail/disconnect" method="post">
            <button className="button-secondary button-danger mt-5">Disconnect Gmail</button>
          </form>
        ) : googleConfigured ? (
          <a className="button-secondary mt-5" href="/api/auth/google">Connect Gmail</a>
        ) : (
          <p className="notice mt-5">Add Google OAuth credentials to the local environment before connecting Gmail.</p>
        )}
      </section>
    </main>
  );
}
