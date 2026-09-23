import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { BackLink } from "@/components/ui/back-link";
import { CopyLink } from "@/components/ui/copy-link";
import { STATUS_LABEL, payability, payUrl } from "@/lib/appointments";
import { formatDuration } from "@/lib/format";
import { formatCents, processingFeeCents, techPayoutCents } from "@/lib/money";
import { createClient, getUser } from "@/lib/supabase/server";
import { formatWhen } from "@/lib/time";
import { cancelAppointment, markCompleted, markNoShow } from "../actions";
import { appointmentIdSchema } from "../schema";
import { ActionButton } from "./appointment-actions";

export const metadata: Metadata = { title: "Appointment" };

const DEPOSIT_LABEL: Record<string, string> = {
  paid: "Paid",
  applied: "Applied to the service",
  forfeited: "Kept (no-show)",
  refunded: "Refunded",
};

export default async function AppointmentPage({
  params,
  searchParams,
}: PageProps<"/dashboard/appointments/[id]">) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
  if (!appointmentIdSchema.safeParse(id).success) notFound();

  const user = await getUser();
  const supabase = await createClient();
  const [{ data: a }, { data: profile }, { data: deposits }] = await Promise.all([
    supabase.from("appointments").select("*").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("timezone").eq("id", user!.id).single(),
    supabase
      .from("deposits")
      .select("status, amount_cents, paid_at")
      .eq("appointment_id", id)
      .in("status", ["paid", "applied", "forfeited", "refunded"])
      .order("created_at", { ascending: false }),
  ]);
  if (!a || !profile) notFound();
  const { data: service } = a.service_id
    ? await supabase
        .from("services")
        .select("name, duration_minutes")
        .eq("id", a.service_id)
        .maybeSingle()
    : { data: null };

  const tz = profile.timezone;
  const payState = payability(a);
  const started = new Date(a.starts_at) <= new Date();
  const deposit = deposits?.[0];
  const statusText =
    a.status === "pending_deposit" && payState !== "ok"
      ? STATUS_LABEL.expired
      : STATUS_LABEL[a.status];

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/dashboard/appointments" label="Appointments" />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{a.client_name}</h1>
        <p className="text-muted">{statusText}</p>
      </div>

      {a.status === "pending_deposit" && payState === "ok" && (
        <section className="border-brand bg-surface flex flex-col gap-3 rounded-2xl border-2 p-5">
          <h2 className="font-semibold">
            {isNew ? "Appointment created. Send the pay link" : "Pay link"}
          </h2>
          <p className="text-muted text-sm">
            Paste this into your DM with {a.client_name}. The link works until{" "}
            {formatWhen(a.hold_expires_at ?? a.starts_at, tz)}. Once they pay, the appointment is
            confirmed and they get an email.
          </p>
          <CopyLink url={payUrl(a.id)} label="Copy pay link" />
        </section>
      )}

      <dl className="border-line bg-surface flex flex-col gap-4 rounded-2xl border p-5">
        <Detail label="When">{formatWhen(a.starts_at, tz)}</Detail>
        <Detail label="Service">
          {service?.name ?? "Appointment"}
          {service ? ` · ${formatDuration(service.duration_minutes)}` : ""}
        </Detail>
        {a.price_cents !== null && a.deposit_cents !== null && (
          <Detail label="Price">
            {formatCents(a.price_cents)} ({formatCents(a.deposit_cents)} deposit)
          </Detail>
        )}
        <Detail label="Deposit">
          {deposit
            ? deposit.status === "refunded"
              ? `Refunded to the client: ${formatCents(deposit.amount_cents)}`
              : `${DEPOSIT_LABEL[deposit.status]}: ${formatCents(deposit.amount_cents)} · you receive ${formatCents(techPayoutCents(deposit.amount_cents))}`
            : "Not paid yet"}
        </Detail>
        {a.policy_accepted_at && (
          <Detail label="Policy">
            Client agreed to your deposit policy on {formatWhen(a.policy_accepted_at, tz)}
          </Detail>
        )}
        <Detail label="Contact">
          <span className="flex flex-col">
            {a.client_email && (
              <a href={`mailto:${a.client_email}`} className="text-brand underline">
                {a.client_email}
              </a>
            )}
            {a.client_phone && (
              <a href={`tel:${a.client_phone}`} className="text-brand underline">
                {a.client_phone}
              </a>
            )}
            {a.client_instagram && (
              <a href={`https://ig.me/m/${a.client_instagram}`} className="text-brand underline">
                @{a.client_instagram}
              </a>
            )}
          </span>
        </Detail>
        {a.notes && <Detail label="Notes">{a.notes}</Detail>}
      </dl>

      {a.status === "confirmed" && started && (
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">Did {a.client_name} show up?</h2>
          <ActionButton
            action={markCompleted.bind(null, a.id)}
            label="Yes, completed"
            variant="primary"
            confirmText="Mark as completed? The deposit goes toward the service."
          />
          <ActionButton
            action={markNoShow.bind(null, a.id)}
            label="No-show, keep deposit"
            confirmText={`Mark ${a.client_name} as a no-show? You keep the deposit and they get an email.`}
          />
        </section>
      )}

      {a.status === "confirmed" && !started && (
        <ActionButton
          action={cancelAppointment.bind(null, a.id)}
          label="Cancel and refund deposit"
          confirmText={`Cancel ${a.client_name}'s appointment and refund their ${formatCents(a.deposit_cents ?? 0)} deposit in full? The ${formatCents(processingFeeCents(a.deposit_cents ?? 0))} processing fee isn't refundable.`}
        />
      )}
      {a.status === "pending_deposit" && (
        <ActionButton
          action={cancelAppointment.bind(null, a.id)}
          label="Cancel appointment"
          confirmText="Cancel this appointment? The pay link will stop working."
        />
      )}
    </div>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted text-xs font-medium tracking-wide uppercase">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
