import type { Metadata } from "next";
import { policySummary } from "@/lib/appointments";
import { APP_NAME } from "@/lib/config";
import { DemoPayPage } from "./demo";

export const metadata: Metadata = {
  title: "Try a pay link",
  description: `See exactly what your client sees when you send a ${APP_NAME} deposit link: your policy, an "I agree" checkbox and the deposit. Nothing is charged.`,
};

export default function DemoPage() {
  // Built here because the policy helper is server-only; 48 hours matches REFUND_BY in the demo.
  const policy = policySummary(
    48,
    "Running late? Message me. More than 15 minutes late may need to be rescheduled.",
  );
  return <DemoPayPage policy={policy} />;
}
