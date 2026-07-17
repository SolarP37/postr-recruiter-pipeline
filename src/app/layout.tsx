import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Postr Recruiter Pipeline",
  description: "A human-approved creator recruiting workflow.",
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
