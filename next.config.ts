import type { NextConfig } from "next";

import { staticSecurityHeaders } from "./src/server/security/headers";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (Phase 10).
  output: "standalone",
  poweredByHeader: false,
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
