import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { isValidEmail } from "@/lib/email";

const MAX_BYTES = 1_000_000;
const MAX_REDIRECTS = 3;

export type PublicPageInspection = {
  url: string;
  email: string | null;
  title: string | null;
  description: string | null;
  sourcePlatform: string;
};

function privateAddress(address: string) {
  const normalized = address.toLowerCase();
  if (normalized === "::1" || normalized === "0:0:0:0:0:0:0:1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:")) return true;
  const match = normalized.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  const [a, b] = match.slice(1).map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

async function validatePublicUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Only HTTP and HTTPS URLs are supported.");
  if (url.username || url.password) throw new Error("URLs containing credentials are not supported.");
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local")) throw new Error("Local or private URLs are not supported.");
  if (isIP(hostname)) {
    if (privateAddress(hostname)) throw new Error("Local or private URLs are not supported.");
  } else {
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    if (!addresses.length || addresses.some((item) => privateAddress(item.address))) throw new Error("The page must resolve only to public internet addresses.");
  }
  return url;
}

function decodeHtml(value: string) {
  return value
    .replaceAll(/&amp;/gi, "&")
    .replaceAll(/&quot;/gi, '"')
    .replaceAll(/&#39;|&apos;/gi, "'")
    .replaceAll(/&lt;/gi, "<")
    .replaceAll(/&gt;/gi, ">");
}

export function extractPublicPageDetails(html: string, url: string): PublicPageInspection {
  const mailto = [...html.matchAll(/href\s*=\s*["']mailto:([^?"'#\s>]+)/gi)]
    .map((match) => decodeURIComponent(match[1]).trim())
    .find(isValidEmail);
  const visible = decodeHtml(html.replaceAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replaceAll(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replaceAll(/<[^>]+>/g, " "))
    .match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const title = decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").replaceAll(/\s+/g, " ").trim() || null;
  const descriptionMatch = html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["'](?:description|og:description)["']/i);
  const description = decodeHtml(descriptionMatch?.[1] || "").replaceAll(/\s+/g, " ").trim().slice(0, 280) || null;
  const hostname = new URL(url).hostname.replace(/^www\./, "");
  return { url, email: mailto || (visible && isValidEmail(visible) ? visible : null), title, description, sourcePlatform: hostname };
}

export async function inspectPublicPage(rawUrl: string): Promise<PublicPageInspection> {
  let current = await validatePublicUrl(rawUrl);
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const response = await fetch(current, { redirect: "manual", headers: { "user-agent": "PostrRecruiter/1.0 (+public business contact review)", accept: "text/html,application/xhtml+xml" }, signal: AbortSignal.timeout(10_000) });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirects === MAX_REDIRECTS) throw new Error("The page redirected too many times.");
      current = await validatePublicUrl(new URL(location, current).toString());
      continue;
    }
    if (!response.ok) throw new Error(`The page returned HTTP ${response.status}.`);
    if (!(response.headers.get("content-type") || "").toLowerCase().includes("text/html")) throw new Error("The URL did not return an HTML page.");
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_BYTES) throw new Error("The page is too large to inspect safely.");
    const html = await response.text();
    if (Buffer.byteLength(html) > MAX_BYTES) throw new Error("The page is too large to inspect safely.");
    return extractPublicPageDetails(html, current.toString());
  }
  throw new Error("Unable to inspect the page.");
}
