import type { Metadata } from "next";
import { createService } from "../actions";
import { ServiceForm } from "../service-form";
import { BackLink } from "@/components/ui/back-link";

export const metadata: Metadata = { title: "Add a service" };

export default function NewServicePage() {
  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/dashboard/services" label="Services" />
      <h1 className="text-2xl font-bold">Add a service</h1>
      <ServiceForm
        action={createService}
        submitLabel="Add service"
        initial={{ name: "", description: "", duration_minutes: "120", price: "", deposit: "" }}
      />
    </div>
  );
}
