import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@gouvfr/dsfr"],
  images: {
    qualities: [25, 50, 85, 95],
  },
  async headers() {
    return [
      {
        // Autoriser l'iframe uniquement sur les routes /embed/*
        source: "/embed/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "ALLOWALL",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors *",
          },
        ],
      },
      {
        // Protéger toutes les autres routes (par défaut)
        source: "/:path((?!embed).*)*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
