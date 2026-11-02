import type { Metadata } from "next";
import { BackLink } from "@/components/ui/back-link";
import { createPackage } from "../../actions";
import { PackageForm } from "../package-form";

export const metadata: Metadata = { title: "New package" };

export default function NewPackagePage() {
  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/dashboard/catering/packages" label="Packages" />
      <h1 className="font-display text-2xl font-bold">New package</h1>
      <PackageForm
        action={createPackage}
        submitLabel="Save package"
        initial={{
          name: "",
          description: "",
          items_text: "",
          pricing_type: "per_person",
          price: "",
          min_guests: "30",
          max_guests: "",
          included_minutes: "120",
        }}
      />
    </div>
  );
}
