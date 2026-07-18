import { NextResponse } from "next/server";

export function expectedOrigin(requestUrl: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  return new URL(configured || requestUrl).origin;
}

export function isSameOriginRequest(request: Pick<Request, "url" | "headers">): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  try {
    return new URL(origin).origin === expectedOrigin(request.url);
  } catch {
    return false;
  }
}

export function requireSameOrigin(request: Pick<Request, "url" | "headers">) {
  return isSameOriginRequest(request)
    ? null
    : NextResponse.json(
        { error: "Cross-site request blocked." },
        { status: 403 },
      );
}
