import { isDemoAuthEnabled } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function SettingsPage() {
  const google = await db.oAuthToken.findUnique({ where: { provider: "google" } });
  const checks = [
    ["Database", "Connected (SQLite)"],
    ["Authentication", isDemoAuthEnabled() ? "Demo mode — local only" : "Configured"],
    ["Vision provider", process.env.VISION_PROVIDER || "mock"],
    ["OpenAI key", process.env.OPENAI_API_KEY ? "Configured" : "Not configured"],
    ["Gmail OAuth", google ? "Connected" : "Not connected"],
    ["Postr recruiter link", process.env.POSTR_RECRUITER_LINK ? "Configured" : "Not configured"],
  ];
  return (
    <main className="page-shell">
      <h1 className="page-title">Settings and readiness</h1>
      <p className="page-copy">Credentials are read from local environment variables and never displayed here.</p>
      <section className="card mt-8 divide-y divide-slate-100 p-2">
        {checks.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-6 p-4"><span className="font-medium">{label}</span><span className="text-sm text-slate-500">{value}</span></div>)}
      </section>
      <section className="card mt-6 p-6">
        <h2 className="font-semibold">Gmail</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">OAuth endpoints are prepared, but connecting requires a Google Cloud OAuth client. The first functional mode creates Gmail drafts only.</p>
        {google ? <form action="/api/gmail/disconnect" method="post"><button className="button-secondary button-danger mt-5">Disconnect Gmail</button></form> : <a className="button-secondary mt-5" href="/api/auth/google">Connect Gmail</a>}
      </section>
    </main>
  );
}
