import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return ["", "/creators", "/brands", "/privacy", "/opt-out"].map(
    (path) => ({
      url: new URL(path || "/", baseUrl).toString(),
      changeFrequency: path === "" ? "weekly" : "monthly",
      priority: path === "" ? 1 : path === "/creators" || path === "/brands" ? 0.9 : 0.5,
    }),
  );
}
