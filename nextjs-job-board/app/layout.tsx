import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Remote Work Index | Jobs powered by Jobicy",
  description: "Browse current remote jobs by role, location, and category. Every listing links directly to its original Jobicy posting.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Remote Work Index",
    description: "Current remote opportunities, sourced directly from Jobicy.",
    type: "website"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
