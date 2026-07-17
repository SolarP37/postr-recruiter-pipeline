export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="w-full max-w-4xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-200/70">
        <div className="grid gap-10 p-8 sm:p-12 lg:grid-cols-[1.3fr_0.7fr] lg:p-16">
          <div>
            <p className="mb-6 inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
              Milestone 1 ready
            </p>
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
              Postr Recruiter Pipeline
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              A human-approved workflow for capturing public creator contacts,
              reviewing prospects, preparing Gmail drafts, and tracking
              referrals.
            </p>
            <p className="mt-8 text-sm leading-6 text-slate-500">
              No outreach is sent automatically. Every prospect and message
              requires human approval.
            </p>
          </div>
          <div className="rounded-3xl bg-slate-950 p-7 text-white">
            <p className="text-sm font-medium text-blue-300">Foundation status</p>
            <ul className="mt-6 space-y-4 text-sm text-slate-200">
              {[
                "Next.js App Router",
                "TypeScript",
                "Tailwind CSS",
                "Environment template",
                "Mock-first architecture",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 rounded-full bg-emerald-400"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
