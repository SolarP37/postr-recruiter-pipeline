"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
    });
    if (!response.ok) {
      const result = await response.json();
      setError(result.error || "Unable to sign in.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="card w-full max-w-md p-8 sm:p-10">
        <p className="eyebrow">Protected recruiter workspace</p>
        <h1 className="mt-4 text-3xl font-semibold">Sign in</h1>
        <form onSubmit={submit} className="mt-8 space-y-5">
          <label className="field-label">Email<input className="field" name="email" type="email" defaultValue="demo@postr.local" required /></label>
          <label className="field-label">Password<input className="field" name="password" type="password" defaultValue="postr-demo" required /></label>
          {error && <p className="text-sm text-rose-700">{error}</p>}
          <button className="button-primary w-full" type="submit">Sign in</button>
        </form>
        <p className="mt-6 text-xs leading-5 text-slate-500">Demo credentials work only when AUTH_MODE=demo outside production.</p>
        <Link href="/" className="text-link">← Public site</Link>
      </div>
    </main>
  );
}
