import { ProPage } from "@/components/pro-page/pro-page";
import { ACCENTS } from "@/lib/accents";
import { PAGE_STYLES, type PageStyleId } from "@/lib/page-styles";

type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  deposit_cents: number;
};

/** A made-up pro's page for the landing pages' live phone. ?style= / ?accent= pick the look. */
export function SamplePro({
  look,
  name,
  services,
  cancellationHours,
  policyText,
  fallbackStyle,
  location,
  about,
  status,
}: {
  look: { style?: string | string[]; accent?: string | string[] };
  name: string;
  services: Service[];
  cancellationHours: number;
  policyText: string;
  fallbackStyle: PageStyleId;
  location: string;
  about: string;
  status: string;
}) {
  const pick = (value: unknown, allowed: object, fallback: string) =>
    typeof value === "string" && Object.hasOwn(allowed, value) ? value : fallback;
  return (
    <ProPage
      preview={false}
      name={name}
      handle={null}
      messageHref="#"
      services={services}
      cancellationHours={cancellationHours}
      policyText={policyText}
      accent={pick(look.accent, ACCENTS, "pink")}
      style={pick(look.style, PAGE_STYLES, fallbackStyle)}
      inviteHref={null}
      location={location}
      about={about}
      status={status}
    />
  );
}
