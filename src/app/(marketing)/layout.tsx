import { MetaPixel } from "@/components/meta-pixel";
import { publicEnv } from "@/lib/env.public";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {/* First in the page, so Meta's script starts loading right away. */}
      <MetaPixel pixelId={publicEnv().NEXT_PUBLIC_META_PIXEL_ID} />
      {children}
    </>
  );
}
