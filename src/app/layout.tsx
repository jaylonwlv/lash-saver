import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { APP_NAME } from "@/lib/config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  // Rarely used; not worth a high-priority download on every page.
  preload: false,
});

/** Display face for the wordmark and headings in the pro's app. */
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  // Only the pro's app uses it, so marketing pages and pay links don't preload it.
  preload: false,
});

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: "Deposits and no-show protection for pros who book through Instagram DMs.",
  // Added to the Home Screen, Dibs opens full screen with a black status bar.
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "black" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fdf8f6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} h-full antialiased`}
    >
      <head>
        {/* Links sent while the app URL had a trailing slash read getdibs.pro//pay/…: the
            server renders them, then Next's router reads "//pay/…" as another site and the
            page crashes. Fix the address before the app starts. Vercel cleans the path
            before proxy.ts sees it, so the proxy's redirect can't catch these there. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if(location.pathname.indexOf("//")===0)history.replaceState(null,"",location.pathname.replace(/^\\/+/,"/")+location.search+location.hash)`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
