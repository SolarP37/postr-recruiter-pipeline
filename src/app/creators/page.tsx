import Link from "next/link";

export default function CreatorsPage() {
  const link = process.env.POSTR_RECRUITER_LINK || "/";
  return (
    <main className="public-page">
      <p className="eyebrow">For creators</p>
      <h1>Explore brand collaboration opportunities.</h1>
      <p>Postr connects creators with brands looking for authentic content. Joining is free; opportunities and compensation are never guaranteed.</p>
      <a className="button-primary mt-8" href={link}>Explore Postr</a>
      <p className="disclosure">I may earn recruiter commission from qualifying activity through this link. It does not add a fee for you.</p>
      <Link href="/" className="text-link">← Back home</Link>
    </main>
  );
}
