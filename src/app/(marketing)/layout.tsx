import { MetaPixel } from "@/components/meta-pixel";
import { publicEnv } from "@/lib/env.public";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {children}
      <MetaPixel pixelId={publicEnv().NEXT_PUBLIC_META_PIXEL_ID} />
    </>
  );
}
