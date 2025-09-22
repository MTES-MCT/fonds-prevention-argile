import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@gouvfr/dsfr"],
  images: {
    qualities: [25, 50, 85, 95],
  },
};

export default nextConfig;
