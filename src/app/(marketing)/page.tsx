import type { Metadata, Viewport } from "next";
import { APP_NAME } from "@/lib/config";
import { Landing, clientPays } from "./landing";

export const metadata: Metadata = {
  title: {
    absolute: `${APP_NAME}: deposits and no-show protection for pros who book in their DMs`,
  },
  description:
    "Send a deposit link in your DMs or texts. Clients agree to your policy and pay with your Cash App, Zelle, Venmo or a card before the slot is theirs. Automatic reminders. No-show? Keep the deposit.",
  openGraph: {
    title: "Stop losing money to no-shows",
    description:
      "Deposit links for pros who book in their DMs. Clients agree to your policy, get reminders, and you keep the deposit on a no-show.",
    images: [clientPays.src],
  },
};

export const viewport: Viewport = { themeColor: "#0d0b0c" };

export default function HomePage() {
  return <Landing />;
}
