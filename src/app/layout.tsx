import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ),
  title: {
    default: "Patrick Conlon | Postr Recruiter",
    template: "%s | Patrick Conlon",
  },
  description:
    "Explore Postr opportunities for creators and brands through Patrick Conlon's official recruiter invitation.",
  applicationName: "Postr with Patrick",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION },
  openGraph: {
    title: "Patrick Conlon | Postr Recruiter",
    description:
      "Postr signup information for eligible creators and brands through Patrick Conlon.",
    type: "website",
    url: "/",
    siteName: "Postr with Patrick",
  },
  twitter: {
    card: "summary_large_image",
    title: "Patrick Conlon | Postr Recruiter",
    description:
      "Postr signup information for eligible creators and brands through Patrick Conlon.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Postr with Patrick",
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    description:
      "Creator and brand introductions to Postr through Patrick Conlon.",
    publisher: {
      "@type": "Person",
      name: "Patrick Conlon",
      jobTitle: "Postr Recruiter",
    },
  };
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
