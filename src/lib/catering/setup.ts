import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type PublishProblem = "business" | "packages" | "stripe";

export const PUBLISH_PROBLEM_TEXT: Record<PublishProblem, string> = {
  business: "Add your business name and page link in Profile.",
  packages: "Add at least one package.",
  stripe: "Connect Stripe so hosts can pay deposits by card.",
};

/** What's missing before a pro can publish their catering quote page. */
export async function publishProblems(
  db: SupabaseClient<Database>,
  techId: string,
): Promise<PublishProblem[]> {
  const [{ data: profile, error }, { count, error: countError }] = await Promise.all([
    db
      .from("profiles")
      .select("business_name, slug, stripe_charges_enabled, stripe_account_id")
      .eq("id", techId)
      .single(),
    db
      .from("catering_packages")
      .select("id", { count: "exact", head: true })
      .eq("tech_id", techId)
      .eq("is_active", true),
  ]);
  if (error || countError || !profile)
    throw new Error(`Loading publish state failed: ${(error ?? countError)?.message}`);
  const problems: PublishProblem[] = [];
  if (!profile.business_name || !profile.slug) problems.push("business");
  if (!count) problems.push("packages");
  if (!profile.stripe_charges_enabled || !profile.stripe_account_id) problems.push("stripe");
  return problems;
}
