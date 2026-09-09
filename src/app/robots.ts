import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const isProduction = process.env.VERCEL_ENV === "production";
  return {
    rules: isProduction
      ? [
          {
            userAgent: "*",
            allow: ["/", "/creators", "/brands", "/privacy", "/opt-out"],
            disallow: [
              "/dashboard",
              "/capture",
              "/prospects",
              "/outreach",
              "/settings",
              "/api/",
            ],
          },
        ]
      : { userAgent: "*", disallow: "/" },
    sitemap: new URL("/sitemap.xml", baseUrl).toString(),
  };
}
