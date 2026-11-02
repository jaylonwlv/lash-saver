import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { Button } from "@/components/ui/button";
import { centsToDollarsInput } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { setAddOnActive, updateAddOn } from "../../actions";
import { idSchema } from "../../schema";
import { AddOnForm } from "../addon-form";

export const metadata: Metadata = { title: "Edit add-on" };

export default async function EditAddOnPage({
  params,
}: PageProps<"/dashboard/catering/addons/[id]">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: a } = await supabase.from("catering_addons").select("*").eq("id", id).maybeSingle();
  if (!a) notFound();
  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/dashboard/catering/packages" label="Packages" />
      <h1 className="font-display text-2xl font-bold">Edit add-on</h1>
      <AddOnForm
        action={updateAddOn.bind(null, a.id)}
        submitLabel="Save changes"
        initial={{
          name: a.name,
          description: a.description ?? "",
          pricing_type: a.pricing_type,
          price: centsToDollarsInput(a.price_cents),
        }}
      />
      <form action={setAddOnActive.bind(null, a.id, !a.is_active)}>
        <Button type="submit" variant="secondary">
          {a.is_active ? "Hide this add-on" : "Show this add-on again"}
        </Button>
      </form>
    </div>
  );
}
