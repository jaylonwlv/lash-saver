import { Clarity } from "@/components/clarity";
import { MetaPixel } from "@/components/meta-pixel";
import { RememberTrade } from "./remember-trade";
import { publicEnv } from "@/lib/env.public";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {/* First in the page, so Meta's script starts loading right away. */}
      <MetaPixel pixelId={publicEnv().NEXT_PUBLIC_META_PIXEL_ID} />
      <Clarity projectId={publicEnv().NEXT_PUBLIC_CLARITY_ID} />
      <RememberTrade />
      {children}
    </>
  );
}
