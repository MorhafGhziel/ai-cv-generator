import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

/**
 * Three voices, each with one job:
 *  - Fraunces  — display serif. Warm, high-contrast, slightly quirky at its
 *                WONK axis, which keeps big headlines from reading generic.
 *  - DM Sans   — UI. Low-contrast geometric with enough warmth for cream.
 *  - Geist Mono— small uppercase labels and data only.
 */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const SITE = "https://craftly.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "Craftly — one CV, every job",
    template: "%s · Craftly",
  },
  description:
    "Paste a job description and get a CV rewritten to match it — same truth, the employer's language. Plus honest answers for the application form.",
  keywords: ["CV", "resume", "job application", "ATS", "cover letter", "tailored resume"],
  openGraph: {
    title: "Craftly — one CV, every job",
    description:
      "Paste a job description and get a CV rewritten to match it — same truth, the employer's language.",
    type: "website",
    siteName: "Craftly",
  },
  twitter: {
    card: "summary_large_image",
    title: "Craftly — one CV, every job",
    description: "A CV rewritten for every role you apply to, in about a minute.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#fdfbf9",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${fraunces.variable} ${dmSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
