import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  transpilePackages: ["@gouvfr/dsfr"],
  images: {
    qualities: [25, 50, 85],
  },
};

export default withSentryConfig(nextConfig, {
  automaticVercelMonitors: false,
  disableLogger: true,
  org: process.env.NEXT_PUBLIC_SENTRY_ORG,
  project: process.env.NEXT_PUBLIC_SENTRY_PROJECT,
  sentryUrl: process.env.NEXT_PUBLIC_SENTRY_URL,
  silent: !process.env.CI,
  sourcemaps: {
    disable: true,
  },
  widenClientFileUpload: false,
});
