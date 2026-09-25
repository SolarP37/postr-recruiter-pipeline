import { CaptureForm } from "@/components/capture-form";
import { GmailCaptureImporter } from "@/components/gmail-capture-importer";
import { ManualLeadForm } from "@/components/manual-lead-form";
import { db } from "@/lib/db";
import { hasGmailCaptureScope } from "@/lib/gmail";

export default async function CapturePage() {
  const google = await db.oAuthToken.findUnique({
    where: { provider: "google" },
    select: { scope: true },
  });
  const captureEmail = process.env.INBOUND_CAPTURE_EMAIL?.trim() || null;

  return (
    <main className="page-shell">
      <h1 className="page-title">Capture a public contact</h1>
      <p className="page-copy">Record a public business contact manually or extract it from a screenshot. Neither path sends outreach.</p>
      <section className="card mt-8 p-6">
        <h2 className="text-xl font-semibold">Phone screenshot inbox</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          From Photos on your phone, share the screenshot by email to the
          dedicated capture address. Importing runs the same protected OCR
          workflow as the upload box below.
        </p>
        <GmailCaptureImporter
          captureEmail={captureEmail}
          gmailConnected={Boolean(google)}
          captureScopeGranted={hasGmailCaptureScope(google?.scope)}
        />
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-semibold">Add a search or research lead</h2>
        <p className="mt-2 text-sm text-slate-500">Best for a creator or brand found through a search engine, official website, or public business profile.</p>
        <ManualLeadForm />
      </section>
      <section className="mt-12">
        <h2 className="text-xl font-semibold">Extract from a public screenshot</h2>
        <p className="mt-2 text-sm text-slate-500">Use OCR and vision only when the public business contact is visible in an uploaded image.</p>
        <div className="mt-6"><CaptureForm /></div>
      </section>
    </main>
  );
}
