const colors: Record<string, string> = {
  NEEDS_REVIEW: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  DRAFT_CREATED: "bg-blue-100 text-blue-800",
  SENT: "bg-indigo-100 text-indigo-800",
  REPLIED: "bg-violet-100 text-violet-800",
  INTERESTED: "bg-fuchsia-100 text-fuchsia-800",
  REFERRAL_SENT: "bg-cyan-100 text-cyan-800",
  JOINED: "bg-green-100 text-green-800",
  SUPPRESSED: "bg-rose-100 text-rose-800",
  OPTED_OUT: "bg-rose-100 text-rose-800",
  REJECTED: "bg-slate-200 text-slate-700",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${colors[status] || "bg-slate-100 text-slate-700"}`}>{status.replaceAll("_", " ")}</span>;
}
