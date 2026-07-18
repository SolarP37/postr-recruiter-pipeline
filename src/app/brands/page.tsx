import Link from "next/link";

export default function BrandsPage() {
  const link = process.env.POSTR_RECRUITER_LINK || "/";
  return (
    <main className="public-page">
      <p className="eyebrow">For brands</p>
      <h1>Find creators for authentic content.</h1>
      <p>Explore Postr as a way to connect with creators for potential campaigns. Availability, results, and creator participation vary.</p>
      <a className="button-primary mt-8" href={link}>Explore Postr</a>
      <p className="disclosure">I may earn recruiter commission from qualifying activity through this link. It does not add a fee for your brand.</p>
      <Link href="/" className="text-link">← Back home</Link>
    </main>
  );
}
