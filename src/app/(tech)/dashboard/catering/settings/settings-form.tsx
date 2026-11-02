"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import type { FormState } from "@/lib/forms";
import { saveSettings } from "../actions";

export type SettingsValues = Record<
  | "cuisine"
  | "city"
  | "description"
  | "policy_text"
  | "contract_terms"
  | "host_can_cancel"
  | "full_refund_days"
  | "minimum_spend"
  | "extra_hour_price"
  | "max_extra_hours"
  | "travel_fee"
  | "service_fee"
  | "tax"
  | "deposit_type"
  | "deposit_percent"
  | "deposit_flat"
  | "balance_due_days_before"
  | "daily_capacity"
  | "min_notice_days"
  | "max_advance_days",
  string
>;

const section = "flex flex-col gap-5 border-t border-line pt-6";

export function SettingsForm({ initial }: { initial: SettingsValues }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(saveSettings, {});
  const v = { ...initial, ...state.values };
  const e = state.errors ?? {};
  const [depositType, setDepositType] = useState(v.deposit_type);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="flex flex-col gap-5">
        <h2 className="font-semibold">About your business</h2>
        <Input
          id="cuisine"
          label="What you serve"
          defaultValue={v.cuisine}
          error={e.cuisine}
          placeholder="e.g. Birria tacos"
        />
        <Input
          id="city"
          label="City"
          defaultValue={v.city}
          error={e.city}
          placeholder="e.g. San Diego"
          autoComplete="address-level2"
        />
        <Textarea
          id="description"
          label="A line about you (optional)"
          defaultValue={v.description}
          error={e.description}
        />
      </div>

      <div className={section}>
        <h2 className="font-semibold">Pricing</h2>
        <Input
          id="minimum_spend"
          label="Minimum spend ($)"
          inputMode="decimal"
          defaultValue={v.minimum_spend}
          error={e.minimum_spend}
          hint="Smaller events are priced up to this. Blank for none."
          placeholder="800"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="extra_hour_price"
            label="Extra hour ($)"
            inputMode="decimal"
            defaultValue={v.extra_hour_price}
            error={e.extra_hour_price}
            hint="Blank: no extra time."
            placeholder="200"
          />
          <Select
            id="max_extra_hours"
            label="Up to"
            defaultValue={v.max_extra_hours}
            error={e.max_extra_hours}
          >
            {Array.from({ length: 13 }, (_, i) => (
              <option key={i} value={i}>
                {i} extra hour{i === 1 ? "" : "s"}
              </option>
            ))}
          </Select>
        </div>
        <Input
          id="travel_fee"
          label="Travel fee ($)"
          inputMode="decimal"
          defaultValue={v.travel_fee}
          error={e.travel_fee}
          hint="Flat, added to every event. 0 for none."
          placeholder="0"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="service_fee"
            label="Service fee (%)"
            inputMode="decimal"
            defaultValue={v.service_fee}
            error={e.service_fee}
            placeholder="0"
          />
          <Input
            id="tax"
            label="Sales tax (%)"
            inputMode="decimal"
            defaultValue={v.tax}
            error={e.tax}
            placeholder="0"
          />
        </div>
      </div>

      <div className={section}>
        <h2 className="font-semibold">Deposit</h2>
        <Select
          id="deposit_type"
          label="Deposit to hold the date"
          defaultValue={v.deposit_type}
          error={e.deposit_type}
          onChange={(event) => setDepositType(event.target.value)}
        >
          <option value="percent">A percentage of the total</option>
          <option value="flat">A set amount</option>
        </Select>
        {depositType === "percent" ? (
          <Input
            id="deposit_percent"
            label="Deposit (%)"
            inputMode="decimal"
            defaultValue={v.deposit_percent}
            error={e.deposit_percent}
            hint="Most caterers ask 25–50%."
            placeholder="30"
          />
        ) : (
          <Input
            id="deposit_flat"
            label="Deposit ($)"
            inputMode="decimal"
            defaultValue={v.deposit_flat}
            error={e.deposit_flat}
            placeholder="500"
          />
        )}
        <input
          type="hidden"
          name={depositType === "percent" ? "deposit_flat" : "deposit_percent"}
          value=""
        />
        <Select
          id="balance_due_days_before"
          label="Balance due"
          defaultValue={v.balance_due_days_before}
          error={e.balance_due_days_before}
          hint="Events booked closer than this are paid in full at booking."
        >
          {[0, 3, 5, 7, 10, 14, 21, 30].map((d) => (
            <option key={d} value={d}>
              {d === 0 ? "On the day of the event" : `${d} days before the event`}
            </option>
          ))}
        </Select>
        <Textarea
          id="policy_text"
          label="Your policy"
          defaultValue={v.policy_text}
          error={e.policy_text}
          hint="A short summary hosts see before paying: what the deposit covers, final headcount."
        />
      </div>

      <div className={section}>
        <h2 className="font-semibold">Cancellations and refunds</h2>
        <Select
          id="host_can_cancel"
          label="Hosts can cancel online"
          defaultValue={v.host_can_cancel}
          error={e.host_can_cancel}
          hint="Refunds happen automatically, by these rules. If you cancel, the host gets everything back."
        >
          <option value="yes">Yes, from their booking page</option>
          <option value="no">No, they contact me</option>
        </Select>
        <Select
          id="full_refund_days"
          label="Full refund if they cancel at least"
          defaultValue={v.full_refund_days}
          error={e.full_refund_days}
          hint="After that, you keep the deposit and any balance they paid is refunded."
        >
          {[0, 7, 14, 21, 30, 45, 60, 90].map((d) => (
            <option key={d} value={d}>
              {d === 0 ? "Any time before the event" : `${d} days before the event`}
            </option>
          ))}
        </Select>
      </div>

      <div className={section}>
        <h2 className="font-semibold">Contract</h2>
        <p className="text-muted text-sm">
          Hosts e-sign an agreement with their event, price, payment schedule, refund rules and your
          policy. Add anything else you need them to agree to.
        </p>
        <Textarea
          id="contract_terms"
          label="Additional contract terms (optional)"
          defaultValue={v.contract_terms}
          error={e.contract_terms}
          className="min-h-48"
          placeholder={
            "e.g. Host provides a level spot within 50 feet of power.\nWeather: we serve rain or shine under cover."
          }
        />
      </div>

      <div className={section}>
        <h2 className="font-semibold">Availability</h2>
        <Select
          id="daily_capacity"
          label="Events per day"
          defaultValue={v.daily_capacity}
          error={e.daily_capacity}
        >
          {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </Select>
        <Select
          id="min_notice_days"
          label="Book at least"
          defaultValue={v.min_notice_days}
          error={e.min_notice_days}
        >
          {[0, 1, 2, 3, 5, 7, 10, 14, 21, 30, 60].map((d) => (
            <option key={d} value={d}>
              {d === 0 ? "Same day" : `${d} day${d === 1 ? "" : "s"} ahead`}
            </option>
          ))}
        </Select>
        <Select
          id="max_advance_days"
          label="Book up to"
          defaultValue={v.max_advance_days}
          error={e.max_advance_days}
        >
          {[30, 60, 90, 180, 365, 545, 730].map((d) => (
            <option key={d} value={d}>
              {d < 365
                ? `${d} days ahead`
                : `${Math.round((d / 365) * 10) / 10} year${d === 365 ? "" : "s"} ahead`}
            </option>
          ))}
        </Select>
      </div>

      {state.message && <p className="text-danger text-sm">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
