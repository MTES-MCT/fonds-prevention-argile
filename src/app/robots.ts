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
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
