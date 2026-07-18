import Link from "next/link";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/status-badge";
import { ProspectActions } from "@/components/prospect-actions";
import { TrackingActions } from "@/components/tracking-actions";

export default async function ProspectsPage() {
  const prospects = await db.prospect.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  const normalized = prospects.map((prospect) => prospect.normalizedEmail).filter(Boolean) as string[];
  const [duplicates, suppressed] = await Promise.all([
    db.prospect.groupBy({ by: ["normalizedEmail"], where: { normalizedEmail: { in: normalized } }, _count: true }),
    db.suppressionEntry.findMany({ where: { normalizedEmail: { in: normalized } }, select: { normalizedEmail: true } }),
  ]);
  const duplicateSet = new Set(duplicates.filter((item) => item._count > 1).map((item) => item.normalizedEmail));
  const suppressionSet = new Set(suppressed.map((item) => item.normalizedEmail));
  return (
    <main className="page-shell">
      <div className="flex items-end justify-between gap-4">
        <div><h1 className="page-title">Prospect review</h1><p className="page-copy">Nothing reaches outreach until you approve it.</p></div>
        <Link href="/capture" className="button-primary">Capture screenshot</Link>
      </div>
      <section className="mt-8 grid gap-5">
        {prospects.map((prospect) => (
          <article key={prospect.id} className="card p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2"><StatusBadge status={prospect.status} />{duplicateSet.has(prospect.normalizedEmail) && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">DUPLICATE</span>}{suppressionSet.has(prospect.normalizedEmail || "") && <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800">SUPPRESSED</span>}</div>
                <h2 className="mt-4 text-xl font-semibold">{prospect.displayName || "Unnamed creator"}</h2>
                <p className="mt-1 font-medium text-slate-700">{prospect.email || "No visible email"}</p>
              </div>
              {prospect.extractionConfidence != null && <p className="text-sm text-slate-500">{Math.round(prospect.extractionConfidence * 100)}% confidence</p>}
            </div>
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="font-semibold text-slate-500">Platform</dt><dd className="mt-1">{prospect.sourcePlatform}</dd></div>
              <div><dt className="font-semibold text-slate-500">Source</dt><dd className="mt-1 break-all">{prospect.sourceUrl ? <a className="text-blue-600" href={prospect.sourceUrl} target="_blank" rel="noreferrer">{prospect.sourceUrl}</a> : "Not supplied"}</dd></div>
              <div className="sm:col-span-2"><dt className="font-semibold text-slate-500">Visible evidence</dt><dd className="mt-1 rounded-xl bg-slate-50 p-3">{prospect.visibleEmailEvidence || "No evidence recorded"}</dd></div>
              {prospect.screenshotPath && <div><dt className="font-semibold text-slate-500">Screenshot</dt><dd className="mt-1"><a className="text-blue-600" href={`/api/assets/${prospect.id}`} target="_blank">View protected asset</a></dd></div>}
            </dl>
            <ProspectActions id={prospect.id} email={prospect.email} displayName={prospect.displayName} notes={prospect.notes} status={prospect.status} />
            <TrackingActions prospectId={prospect.id} status={prospect.status} />
          </article>
        ))}
        {!prospects.length && <div className="card p-10 text-center text-slate-500">No prospects yet. Capture a screenshot to begin.</div>}
      </section>
    </main>
  );
}
