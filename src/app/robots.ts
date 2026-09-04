import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://fonds-prevention-argile.beta.gouv.fr";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/administration/",
          "/espace-agent/",
          "/mon-compte/",
          "/connexion/agent/",
          "/deconnexion/",
          "/oidc-callback/",
          "/embed-simulateur/",
          // Grille de pondération non validée par un expert RGA (ADR-0030) : page en
          // prod mais volontairement non indexée/crawlée tant qu'elle n'est pas validée.
          "/vulnerabilite-rga/",
          "/embed-vulnerabilite-rga/",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
