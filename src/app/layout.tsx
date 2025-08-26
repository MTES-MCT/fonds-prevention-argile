import type { Metadata } from "next";

import { Footer, FooterProps, Header, HeaderProps, Matomo } from "@/components";
import { initDsfr } from "@/utils";
import wording from "@/wording";
import { marianne, spectral } from "../styles/fonts";
import "../styles/globals.css";

// DSFR initialization
initDsfr();

export const metadata: Metadata = {
  title: "Fonds argile",
  description: "Plateforme publique et gratuite de ?",
  metadataBase: new URL("https://fonds-argile.beta.gouv.fr"),
  openGraph: {
    title: "Fonds argile",
    description:
      "Plateforme publique et gratuite de pré-instruction automatique des devis de rénovation énergétique pour MaPrimeRenov' et les CEE.",
    url: "https://fonds-argile.beta.gouv.fr",
    siteName: "Fonds argile",
    images: [
      {
        url: "/images/steps_analyze_quote/quote_control.webp",
        width: 1200,
        height: 630,
        alt: "Fonds argile - Plateforme de ??",
      },
    ],
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fonds argile",
    description: "Plateforme de ??",
    images: ["/images/steps_analyze_quote/quote_control.webp"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const footerData: FooterProps = wording.layout.footer;
  const headerData: HeaderProps = wording.layout.header;

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
        <Header {...headerData} />
        <main className="flex-1">{children}</main>
        <Footer {...footerData} />
      </body>
    </html>
  );
}
