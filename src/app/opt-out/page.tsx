"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function OptOutPage() {
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/opt-out", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: form.get("email") }),
    });
    const result = await response.json();
    setMessage(response.ok ? "Your address has been added to the do-not-contact list." : result.error);
  }
  return (
    <main className="public-page">
      <p className="eyebrow">No further contact</p>
      <h1>Opt out of recruiter outreach.</h1>
      <p>Enter the email address that received the message. It will be suppressed from future outreach in this system.</p>
      <form onSubmit={submit} className="mt-8 max-w-lg space-y-4">
        <label className="field-label">Email address<input className="field" name="email" type="email" required /></label>
        <button className="button-primary" type="submit">Add me to the suppression list</button>
      </form>
      {message && <p className="notice mt-6">{message}</p>}
      <Link href="/" className="text-link">← Back home</Link>
    </main>
  );
}
