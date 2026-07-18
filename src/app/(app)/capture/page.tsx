import { CaptureForm } from "@/components/capture-form";

export default function CapturePage() {
  return (
    <main className="page-shell">
      <h1 className="page-title">Capture a public contact</h1>
      <p className="page-copy">Upload only screenshots of publicly displayed business contact information. Extraction never sends outreach.</p>
      <div className="mt-8"><CaptureForm /></div>
    </main>
  );
}
