import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { centsToDollarsInput } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { setServiceActive, updateService } from "../actions";
import { serviceIdSchema } from "../schema";
import { ServiceForm } from "../service-form";

export const metadata: Metadata = { title: "Edit service" };

export default async function EditServicePage({ params }: PageProps<"/dashboard/services/[id]">) {
  const { id } = await params;
  if (!serviceIdSchema.safeParse(id).success) notFound();

  // RLS returns only the tech's own services.
  const supabase = await createClient();
  const { data: service, error } = await supabase
    .from("services")
    .select("id, name, description, duration_minutes, price_cents, deposit_cents, is_active")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Loading service failed: ${error.message}`);
  if (!service) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Edit service</h1>
      <ServiceForm
        action={updateService.bind(null, service.id)}
        submitLabel="Save changes"
        initial={{
          name: service.name,
          description: service.description ?? "",
          duration_minutes: String(service.duration_minutes),
          price: centsToDollarsInput(service.price_cents),
          deposit: centsToDollarsInput(service.deposit_cents),
        }}
      />
      <form
        action={setServiceActive.bind(null, service.id, !service.is_active)}
        className="border-line flex flex-col gap-2 border-t pt-6"
      >
        <p className="text-muted text-sm">
          {service.is_active
            ? "Hide this service from your booking page. Existing appointments aren't affected."
            : "This service is hidden from your booking page."}
        </p>
        <Button type="submit" variant="secondary">
          {service.is_active ? "Hide from booking page" : "Show on booking page"}
        </Button>
      </form>
    </div>
  );
}
