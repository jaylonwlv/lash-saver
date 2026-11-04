import type { NextConfig } from "next";
import { shortLinkRedirects } from "./src/lib/short-links";

const nextConfig: NextConfig = {
  // No other site may show Dibs pages inside a frame (clickjacking: a hidden pay
  // link or dashboard under someone else's page). Our own live page preview in the
  // dashboard is same-origin, so it still works.
  // getdibs.pro/nails → sign-up with that trade picked (links for DMs and comments).
  async redirects() {
    return shortLinkRedirects();
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
