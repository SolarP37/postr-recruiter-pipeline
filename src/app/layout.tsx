import type { Metadata } from "next";
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
  openGraph: {
    title: "Patrick Conlon | Postr Recruiter",
    description:
      "Postr signup information for eligible creators and brands through Patrick Conlon.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
