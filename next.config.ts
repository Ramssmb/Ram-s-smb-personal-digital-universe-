import type { NextConfig } from "next";

import { staticSecurityHeaders } from "./src/server/security/headers";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (Phase 10).
  output: "standalone",
  poweredByHeader: false,
  // Put <title>, description and Open Graph tags in <head> for every client.
  // By default Next.js streams them into <body> for user agents it does not
  // recognise as bots, which some link-preview crawlers and audit tools miss.
  // Pages render per request anyway, so blocking on metadata costs nothing extra.
  htmlLimitedBots: /.*/,
  reactStrictMode: true,
  typedRoutes: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: staticSecurityHeaders(process.env.NODE_ENV === "production"),
      },
    ];
  },
};

export default nextConfig;
