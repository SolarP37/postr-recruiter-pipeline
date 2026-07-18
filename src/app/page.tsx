import Link from "next/link";

const recruiterLink = process.env.POSTR_RECRUITER_LINK || "/creators";

export default function Home() {
  return (
    <main>
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-lg font-bold text-slate-950">Postr Recruiter</Link>
        <div className="flex items-center gap-5 text-sm font-medium text-slate-600">
          <Link href="/creators">Creators</Link>
          <Link href="/brands">Brands</Link>
          <Link href="/login" className="rounded-full bg-slate-950 px-5 py-2.5 text-white">Recruiter login</Link>
        </div>
      </nav>
      <section className="mx-auto grid min-h-[72vh] max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="eyebrow">Creator partnerships, handled honestly</p>
          <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-7xl">
            Find paid creator opportunities through Postr.
          </h1>
          <p className="mt-7 max-w-2xl text-xl leading-9 text-slate-600">
            I help creators and brands connect through Postr. Creators can explore
            potential paid collaborations, and brands can find people to produce
            authentic content.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <a className="button-primary" href={recruiterLink}>Join as a Creator</a>
            <a className="button-secondary" href={recruiterLink}>Join as a Brand</a>
          </div>
        </div>
        <div className="card relative overflow-hidden bg-slate-950 p-10 text-white">
          <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-blue-500/30 blur-3xl" />
          <p className="text-sm font-semibold text-blue-300">How it works</p>
          <ol className="mt-8 space-y-7">
            {[
              ["01", "Explore", "See whether Postr fits your collaboration goals."],
              ["02", "Connect", "Join using the recruiter invitation when you are ready."],
              ["03", "Create", "Build authentic brand partnerships without earnings promises."],
            ].map(([number, title, copy]) => (
              <li key={number} className="flex gap-5">
                <span className="text-sm font-bold text-blue-300">{number}</span>
                <div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-400">{copy}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <footer className="border-t border-slate-200 bg-white/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-3xl">
            I may earn recruiter commission from qualifying activity completed
            through my referral link. Joining through the link does not add a fee
            for the creator or brand.
          </p>
          <div className="flex gap-4"><Link href="/privacy">Privacy</Link><Link href="/opt-out">Opt out</Link></div>
        </div>
      </footer>
    </main>
  );
}
