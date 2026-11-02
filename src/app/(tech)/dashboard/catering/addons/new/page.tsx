import type { Metadata } from "next";
import { BackLink } from "@/components/ui/back-link";
import { createAddOn } from "../../actions";
import { AddOnForm } from "../addon-form";

export const metadata: Metadata = { title: "New add-on" };

export default function NewAddOnPage() {
  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/dashboard/catering/packages" label="Packages" />
      <h1 className="font-display text-2xl font-bold">New add-on</h1>
      <AddOnForm
        action={createAddOn}
        submitLabel="Save add-on"
        initial={{ name: "", description: "", pricing_type: "per_person", price: "" }}
      />
    </div>
  );
}
