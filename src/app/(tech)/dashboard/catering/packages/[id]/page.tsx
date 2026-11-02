import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { Button } from "@/components/ui/button";
import { centsToDollarsInput } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { setPackageActive, updatePackage } from "../../actions";
import { idSchema } from "../../schema";
import { PackageForm } from "../package-form";

export const metadata: Metadata = { title: "Edit package" };

export default async function EditPackagePage({
  params,
}: PageProps<"/dashboard/catering/packages/[id]">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("catering_packages")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!p) notFound();

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/dashboard/catering/packages" label="Packages" />
      <h1 className="font-display text-2xl font-bold">Edit package</h1>
      <PackageForm
        action={updatePackage.bind(null, p.id)}
        submitLabel="Save changes"
        initial={{
          name: p.name,
          description: p.description ?? "",
          items_text: p.items_text ?? "",
          pricing_type: p.pricing_type,
          price: centsToDollarsInput(p.price_cents),
          min_guests: String(p.min_guests),
          max_guests: p.max_guests ? String(p.max_guests) : "",
          included_minutes: String(p.included_minutes),
        }}
      />
      <p className="text-muted text-sm">
        Changes apply to new bookings. Booked events keep the price they were quoted.
      </p>
      <form action={setPackageActive.bind(null, p.id, !p.is_active)}>
        <Button type="submit" variant="secondary">
          {p.is_active ? "Hide this package" : "Show this package again"}
        </Button>
      </form>
    </div>
  );
}
