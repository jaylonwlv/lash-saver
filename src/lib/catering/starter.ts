import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/*
 * A new food truck / caterer gets a catering quote page ready to edit: settings
 * with sensible defaults (unpublished) and two example packages and add-ons at
 * typical US prices. Works with the admin client (sign-up) or the pro's own
 * client (RLS allows their own rows). Safe to call twice.
 */

const PACKAGES = [
  {
    name: "Street-style buffet",
    description: "Our most popular menu, served from the truck.",
    items_text: "Choice of 2 mains\nSides and toppings\nPlates, napkins and utensils",
    pricing_type: "per_person" as const,
    price_cents: 1800,
    min_guests: 30,
    max_guests: 250,
    included_minutes: 120,
    sort_order: 0,
  },
  {
    name: "Truck rental",
    description: "The truck and crew for your event. Guests order from the full menu.",
    items_text: "Full menu for your guests\n3 hours of service",
    pricing_type: "flat" as const,
    price_cents: 150000,
    min_guests: 1,
    max_guests: null,
    included_minutes: 180,
    sort_order: 1,
  },
];

const ADD_ONS = [
  { name: "Extra main", pricing_type: "per_person" as const, price_cents: 400, sort_order: 0 },
  { name: "Drinks", pricing_type: "per_person" as const, price_cents: 300, sort_order: 1 },
];

export const CATERING_STARTER_POLICY =
  "Your deposit holds your date and goes toward your event total. Final guest count is due 7 days before the event.";

export async function setUpCatering(db: SupabaseClient<Database>, techId: string): Promise<void> {
  const { error: settingsError } = await db.from("catering_settings").upsert(
    {
      tech_id: techId,
      policy_text: CATERING_STARTER_POLICY,
      extra_hour_price_cents: 20000,
      minimum_spend_cents: 80000,
    },
    { onConflict: "tech_id", ignoreDuplicates: true },
  );
  if (settingsError) throw new Error(`Creating catering settings failed: ${settingsError.message}`);

  const { count, error: countError } = await db
    .from("catering_packages")
    .select("id", { count: "exact", head: true })
    .eq("tech_id", techId);
  if (countError) throw new Error(`Checking catering packages failed: ${countError.message}`);
  if (count) return;

  const { error: pkgError } = await db
    .from("catering_packages")
    .insert(PACKAGES.map((p) => ({ ...p, tech_id: techId })));
  if (pkgError) throw new Error(`Adding catering packages failed: ${pkgError.message}`);
  const { error: addOnError } = await db
    .from("catering_addons")
    .insert(ADD_ONS.map((a) => ({ ...a, tech_id: techId })));
  if (addOnError) throw new Error(`Adding catering add-ons failed: ${addOnError.message}`);
}
