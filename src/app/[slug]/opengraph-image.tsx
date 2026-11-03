import { ImageResponse } from "next/og";
import { APP_NAME } from "@/lib/config";
import { formatCents } from "@/lib/money";
import { loadMenu } from "./menu";

/*
 * The preview card when a pro's link is pasted in iMessage, Instagram or a
 * story: their name and starting price instead of a bare URL.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Services and prices";

const INK = "#0d0b0c";
const PINK = "#ff5c9d";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const menu = await loadMenu((await params).slug);
  const name = menu?.name ?? APP_NAME;
  const from = menu?.services[0]
    ? `From ${formatCents(menu.services[0].price_cents).replace(/\.00$/, "")}`
    : "Services & prices";
  const count = menu?.services.length ?? 0;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: INK,
        color: "white",
        padding: 72,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: 36,
          background: PINK,
          color: INK,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 72,
          fontWeight: 800,
        }}
      >
        {name.trim().charAt(0).toUpperCase() || "•"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            fontSize: name.length > 22 ? 72 : 96,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: -3,
          }}
        >
          {name}
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 36 }}>
          <div
            style={{
              display: "flex",
              background: PINK,
              color: INK,
              padding: "10px 24px",
              borderRadius: 999,
              fontWeight: 700,
            }}
          >
            {from}
          </div>
          {count > 1 && (
            <div style={{ display: "flex", padding: "10px 0", color: "rgba(255,255,255,0.7)" }}>
              {count} services · message to book
            </div>
          )}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          fontSize: 40,
          fontWeight: 800,
          letterSpacing: -2,
        }}
      >
        {APP_NAME.toLowerCase()}
        <span style={{ color: PINK }}>.</span>
      </div>
    </div>,
    size,
  );
}
