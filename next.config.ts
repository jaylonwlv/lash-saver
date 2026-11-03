import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No other site may show Dibs pages inside a frame (clickjacking: a hidden pay
  // link or dashboard under someone else's page). Our own live page preview in the
  // dashboard is same-origin, so it still works.
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
