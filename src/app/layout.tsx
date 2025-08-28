import type { Metadata } from "next";
import { Footer, Header, Matomo } from "@/components";
import { marianne, spectral } from "../styles/fonts";
import "../styles/globals.css";
import { contentLayout } from "@/content";
import { initDsfr } from "@/lib/utils";

// DSFR initialization
initDsfr();

export const metadata: Metadata = {
  title: contentLayout.metadata.title,
  description: contentLayout.metadata.description,
  metadataBase: new URL(contentLayout.metadata.url),
  openGraph: {
    title: contentLayout.metadata.title,
    description: contentLayout.metadata.description,
    url: contentLayout.metadata.url,
    siteName: contentLayout.metadata.title,
    images: [
      {
        url: contentLayout.metadata.imageUrl,
        width: 1200,
        height: 630,
        alt: contentLayout.metadata.imageAlt,
      },
    ],
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: contentLayout.metadata.title,
    description: contentLayout.metadata.description,
    images: [contentLayout.metadata.imageUrl],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${marianne.variable} ${spectral.variable}`}
      data-fr-scheme="system"
      lang="fr"
    >
      <head>
        <meta
          content="telephone=no,date=no,address=no,email=no,url=no"
          name="format-detection"
        />
        <meta
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
          name="viewport"
        />
        <meta content="#000091" name="theme-color" />

        {/* DSFR Favicons */}
        <link
          href="/dsfr/favicon/apple-touch-icon.png"
          rel="apple-touch-icon"
        />
        <link
          href="/dsfr/favicon/favicon.svg"
          rel="icon"
          type="image/svg+xml"
        />
        <link
          href="/dsfr/favicon/favicon.ico"
          rel="shortcut icon"
          type="image/x-icon"
        />
        <link
          crossOrigin="use-credentials"
          href="/dsfr/favicon/manifest.webmanifest"
          rel="manifest"
        />
      </head>
      <body className="flex flex-col min-h-screen">
        <Matomo />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
