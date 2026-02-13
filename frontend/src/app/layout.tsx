import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "sonner";
import JsonLd from "@/components/JsonLd";

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
    process.env.NEXT_PUBLIC_FRONTEND_URL || "https://www.calxmap.in"
  ),
  alternates: {
    canonical: "https://www.calxmap.in", // ✅ use absolute URL (not "/")
  },
  icons: {
    icon: [
      {
        url: "/images/calxmaplogo.png",
        type: "image/png",
      },
    ],
    shortcut: "/images/calxmaplogo.png",
    apple: "/images/calxmaplogo.png",
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
          process.env.NEXT_PUBLIC_FRONTEND_URL || "https://www.calxmap.in"
        }/images/logo.png`,
        width: 1200,
        height: 630,
        alt: "Calxmap - Expert Networking Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@calxmap",
    creator: "@calxmap",
    title: "Calxmap - Expert Networking Platform",
    description:
      "Transforming expertise into influence and connections into opportunities. Join the world's first Expert Networking Platform.",
    images: [
      `${
        process.env.NEXT_PUBLIC_FRONTEND_URL || "https://www.calxmap.in"
      }/images/logo.png`,
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
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": "https://www.calxmap.in/#organization",
                name: "Calxmap",
                url: "https://www.calxmap.in",
                logo: {
                  "@type": "ImageObject",
                  url: "https://www.calxmap.in/images/logo.png",
                  width: 512,
                  height: 512,
                },
                description:
                  "Calxmap is a global knowledge ecosystem that transforms expertise into influence and connections into opportunities. The world's first knowledge sharing networking platform.",
                address: {
                  "@type": "PostalAddress",
                  streetAddress: "Phase 1, Sushant lok phase 1, Sector 13",
                  addressLocality: "Gurugram",
                  addressRegion: "Haryana",
                  postalCode: "122001",
                  addressCountry: "IN",
                },
                sameAs: [
                  "https://www.linkedin.com/company/calxmap/",
                  "https://www.instagram.com/calxmap/",
                ],
                contactPoint: {
                  "@type": "ContactPoint",
                  contactType: "customer service",
                  url: "https://www.calxmap.in/contact-us",
                },
              },
              {
                "@type": "WebSite",
                "@id": "https://www.calxmap.in/#website",
                url: "https://www.calxmap.in",
                name: "Calxmap",
                description:
                  "Expert Networking Platform - Connect with verified professionals, find opportunities, and grow your network.",
                publisher: {
                  "@id": "https://www.calxmap.in/#organization",
                },
                potentialAction: {
                  "@type": "SearchAction",
                  target: {
                    "@type": "EntryPoint",
                    urlTemplate:
                      "https://www.calxmap.in/search?q={search_term_string}",
                  },
                  "query-input": "required name=search_term_string",
                },
              },
              {
                "@type": "FAQPage",
                "@id": "https://www.calxmap.in/#faq",
                mainEntity: [
                  {
                    "@type": "Question",
                    name: "What is Calxmap?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "Calxmap is the world's first knowledge sharing networking platform that transforms expertise into influence and connections into opportunities. We connect experts, students, universities, and industries.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "How can experts benefit from Calxmap?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "Experts can find opportunities for guest lectures, workshops, consulting projects, and mentorship programs. Build your professional brand and connect with leading institutions.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "What opportunities are available for students?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "Students can find internships, connect with industry experts, access mentorship programs, and explore career opportunities at leading universities and companies.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "How can institutions use Calxmap?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "Institutions can connect with verified experts for guest lectures, FDP programs, workshops, curriculum development, and research collaborations.",
                    },
                  },
                ],
              },
              {
                "@type": "Article",
                "@id": "https://www.calxmap.in/#article",
                headline:
                  "Calxmap - Your Trusted Gateway to India's Top Experts",
                description:
                  "Calxmap bridges organizations with India's most trusted professionals. Whether you need expert consultation, specialized training, or industry insights – our verified marketplace connects you with the right expertise.",
                image: "https://www.calxmap.in/images/logo.png",
                author: {
                  "@id": "https://www.calxmap.in/#organization",
                },
                publisher: {
                  "@id": "https://www.calxmap.in/#organization",
                },
                datePublished: "2024-01-01",
                dateModified: new Date().toISOString().split("T")[0],
              },
            ],
          }}
        />
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
