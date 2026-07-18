import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="public-page prose-copy">
      <p className="eyebrow">Privacy</p>
      <h1>Privacy and contact data</h1>
      <p>This recruiter workflow processes business contact information that creators display publicly. Screenshots and extracted contact details are used only to review potential outreach and track recruiter conversations.</p>
      <p>No email is sent automatically. Suppressed and opted-out contacts are blocked from future outreach. Contact information is not sold through this application.</p>
      <p>This MVP stores data locally unless and until a production database is configured.</p>
      <Link href="/opt-out" className="text-link">Request no further contact</Link>
      <Link href="/" className="text-link">← Back home</Link>
    </main>
  );
}
