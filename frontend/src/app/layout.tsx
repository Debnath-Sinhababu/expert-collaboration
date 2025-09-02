import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "sonner";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: "Calxmap",
    template: "%s | Calxmap",
  },
  description:
    "Calxmap is a global knowledge ecosystem that transforms expertise into influence and connections into opportunities. It is the world’s first knowledge sharing networking platform where experts become brands, students unlock opportunities, universities bridge with industry, and industries find the right talent and ideas.",
  keywords: [
    "Calxmap",
    "knowledge networking",
    "experts platform",
    "universities collaboration",
    "student opportunities",
    "industry connections",
    "expert networking",
    "expert networking platform",
    "expert collaboration",
  ],
  authors: [{ name: "Calxmap Team", url: "https://www.calxmap.in" }],
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.calxmap.in"
  ),
  alternates: {
    canonical: "https://www.calxmap.in", // ✅ use absolute URL (not "/")
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://www.calxmap.in",
    siteName: "Calxmap",
    title: "Calxmap - Expert Networking Platform",
    description:
      "Transforming expertise into influence and connections into opportunities. Join the world’s first Expert Networking Platform.",
    images: [
      {
        url: `${
          process.env.NEXT_PUBLIC_SITE_URL || "https://www.calxmap.in"
        }/images/logo.png`,
        width: 1200,
        height: 630,
        alt: "Calxmap - Expert Networking Platform",
      },
    ],
  },
};



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
