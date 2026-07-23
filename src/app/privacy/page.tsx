import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="public-page prose-copy">
      <p className="eyebrow">Privacy</p>
      <h1>Privacy and contact data</h1>
      <p>This recruiter workflow processes business contact information that creators and brands publish for business inquiries. Screenshots and extracted details are used to review potential Postr introductions, prepare outreach for human approval, prevent duplicate contact, and track recruiter conversations.</p>
      <p>No email is sent automatically. Every message requires review. Suppressed, bounced, and opted-out contacts are blocked from future outreach, and contact information is not sold through this application.</p>
      <p>Production records are stored in an access-controlled database. Screenshot evidence is stored privately and served only through authenticated application routes. Gmail access is limited to composing reviewed drafts and recruiter-triggered imports from the configured capture inbox.</p>
      <p>You may request no further contact at any time using the form below or by replying “No thanks” to an outreach message.</p>
      <Link href="/opt-out" className="text-link">Request no further contact</Link>
      <Link href="/" className="text-link">← Back home</Link>
    </main>
  );
}
