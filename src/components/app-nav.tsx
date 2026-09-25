"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  ["/dashboard", "Dashboard"],
  ["/mission-control", "Mission Control"],
  ["/capture", "Capture"],
  ["/prospects", "Prospects"],
  ["/outreach", "Outreach"],
  ["/settings", "Settings"],
];

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <aside className="flex w-full flex-col border-b border-slate-200 bg-slate-950 p-5 text-white lg:min-h-screen lg:w-64 lg:border-b-0">
      <Link href="/dashboard" className="text-lg font-bold">Postr Pipeline</Link>
      <nav className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-6 lg:grid-cols-1">
        {links.map(([href, label]) => (
          <Link key={href} href={href} className={`rounded-xl px-4 py-3 text-sm font-medium ${pathname === href ? "bg-white text-slate-950" : "text-slate-300 hover:bg-slate-800"}`}>
            {label}
          </Link>
        ))}
      </nav>
      <button onClick={logout} className="mt-5 rounded-xl px-4 py-3 text-left text-sm text-slate-400 hover:bg-slate-800 lg:mt-auto">Sign out</button>
    </aside>
  );
}
