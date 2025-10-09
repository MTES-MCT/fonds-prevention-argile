import type { Metadata } from "next";
import { Footer, Header, Matomo } from "@/components";
import { contentLayout } from "@/content";
import { DsfrProvider } from "@/components/DsfrProvider/DsfrProvider";

// Import des styles DSFR
import "@gouvfr/dsfr/dist/dsfr.min.css";
import "@gouvfr/dsfr/dist/utility/colors/colors.min.css";
import "@gouvfr/dsfr/dist/utility/icons/icons-system/icons-system.min.css";
import "@gouvfr/dsfr/dist/utility/icons/icons-arrows/icons-arrows.min.css";

// Import icons from the DSFR
import "@gouvfr/dsfr/dist/utility/icons/icons-business/icons-business.min.css";
import "@gouvfr/dsfr/dist/utility/icons/icons-communication/icons-communication.min.css";
import "@gouvfr/dsfr/dist/utility/icons/icons-design/icons-design.min.css";
import "@gouvfr/dsfr/dist/utility/icons/icons-document/icons-document.min.css";
import "@gouvfr/dsfr/dist/utility/icons/icons-health/icons-health.min.css";
import "@gouvfr/dsfr/dist/utility/icons/icons-map/icons-map.min.css";
import "@gouvfr/dsfr/dist/utility/icons/icons-media/icons-media.min.css";
import "@gouvfr/dsfr/dist/utility/icons/icons-others/icons-others.min.css";
import "@gouvfr/dsfr/dist/utility/icons/icons-system/icons-system.min.css";
import "@gouvfr/dsfr/dist/utility/icons/icons-weather/icons-weather.min.css";
import "@gouvfr/dsfr/dist/utility/icons/icons-editor/icons-editor.min.css";
import "@gouvfr/dsfr/dist/utility/icons/icons-development/icons-development.min.css";
import "@gouvfr/dsfr/dist/utility/icons/icons-user/icons-user.min.css";
import "@gouvfr/dsfr/dist/utility/icons/icons-buildings/icons-buildings.min.css";

// Import des styles custom
import "../styles/globals.css";
import "../styles/loading.css";

import { AuthProvider } from "@/lib/auth/contexts/AuthContext";
import { RGAProvider } from "@/lib/form-rga/session";
import { PostLogoutRedirect } from "@/components/PostLogoutRedirect/PostLogoutRedirect";

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
    <html data-fr-scheme="system" lang="fr">
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
        <PostLogoutRedirect />
        <DsfrProvider>
          <AuthProvider>
            <Matomo />
            <Header />
            <RGAProvider>
              <main className="flex-1">{children}</main>
            </RGAProvider>
            <Footer />
          </AuthProvider>
        </DsfrProvider>
      </body>
    </html>
  );
}
