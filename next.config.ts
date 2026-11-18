import type { NextConfig } from "next";
import { construireReglesEnTetes } from "./src/shared/config/en-tetes-http";

const nextConfig: NextConfig = {
  transpilePackages: ["@gouvfr/dsfr"],
  // « X-Powered-By: Next.js » annonce la pile technique sans rien apporter.
  poweredByHeader: false,
  images: {
    qualities: [25, 50, 85, 95],
  },
  async headers() {
    return construireReglesEnTetes();
  },
};

export default nextConfig;
