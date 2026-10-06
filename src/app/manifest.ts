import type { MetadataRoute } from "next";
import { APP_NAME } from "@/lib/config";

/**
 * Lets pros add Dibs to their Home Screen, where it opens full screen on the
 * dashboard and keeps them signed in (Instagram's in-app browser doesn't).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/dashboard",
    name: APP_NAME,
    short_name: APP_NAME,
    description: "Deposits and no-show protection for pros who book through Instagram DMs.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#0d0b0c",
    theme_color: "#0d0b0c",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
