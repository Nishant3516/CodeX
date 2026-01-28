import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://devsarena.in"),
  
  title: {
    default: "DevsArena — Build Complex Software One Checkpoint at a Time",
    template: "%s — DevsArena",
  },
  
  description:
    "Guided, test-driven projects with instant cloud sandboxes. Write code, fix failing builds, and prove it works — one checkpoint at a time.",
  
  keywords: [
    "Cloud Native",
    "Project Based Learning",
    "Guided Projects",
    "Secure Sandboxes",
    "Playgrounds",
    "Build Complex Software",
    "One Checkpoint at a Time",
    "Instant Cloud Sandboxes",
    "Cloud Sandboxes",
    "Kubernetes",
    "Golang",
    "React",
    "Software Engineering",
    "Next.js",
  ],

  authors: [{ name: "Krishna Chaitanya Kommera", url: "https://twitter.com/KrishnaWyvern" }],
  creator: "Krishna Chaitanya Kommera",
  applicationName: "DevsArena",

  icons: {
    icon: "/logos/white.svg",
    shortcut: "/logos/white.svg",

    apple: [
      { url: "/logos/white.svg", type: "image/svg+xml" },
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" }, 
    ],
  },

  alternates: { canonical: "/" },

  openGraph: {
    title: "DevsArena — Guided Projects & Instant Sandboxes",
    description:
      "Stop copying long tutorials. Build from specs with checkpoints, real-time validation, and developer-grade cloud environments.",
    url: "https://devsarena.in/",
    siteName: "DevsArena",
    images: [
      { 
        url: "/og-image.png", 
        width: 1200, 
        height: 630, 
        alt: "DevsArena Platform Preview" 
      },
    ],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "DevsArena — Build Complex Software One Checkpoint at a Time",
    description:
      "Guided, test-driven projects with instant cloud sandboxes.",
    images: ["/og-image.png"],
    creator: "@KrishnaWyvern",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0f19" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "name": "DevsArena",
        "url": "https://devsarena.in/",
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://devsarena.in/?q={search_term_string}",
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "name": "DevsArena",
        "url": "https://devsarena.in",
        "logo": "https://devsarena.in/logos/white.svg",
        "sameAs": [
          "https://twitter.com/KrishnaWyvern",
          "https://github.com/KrishnaChaitanya45", // Update this if your GitHub username is different!
        ],
      },
      {
        "@type": "SoftwareApplication",
        "name": "DevsArena",
        "applicationCategory": "EducationalApplication",
        "operatingSystem": "Cloud",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD",
        },
      }
    ],
  };

  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" type="image/svg" href="/logos/white.svg" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} font-sans antialiased bg-dark-900 text-white`}
      >
        {children}
      </body>
    </html>
  );
}