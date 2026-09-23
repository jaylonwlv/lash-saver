"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import type { FormState } from "@/lib/forms";
import { saveProfile } from "./actions";

export type ProfileValues = {
  business_name: string;
  slug: string;
  instagram_handle: string;
  phone: string;
  timezone: string;
  cancellation_window_hours: string;
  policy_text: string;
};

const COMMON_TIME_ZONES = [
  ["America/New_York", "Eastern"],
  ["America/Chicago", "Central"],
  ["America/Denver", "Mountain"],
  ["America/Phoenix", "Arizona"],
  ["America/Los_Angeles", "Pacific"],
  ["America/Anchorage", "Alaska"],
  ["Pacific/Honolulu", "Hawaii"],
] as const;

const WINDOW_OPTIONS = [
  [0, "No cancellation window"],
  [12, "12 hours"],
  [24, "24 hours"],
  [48, "48 hours"],
  [72, "72 hours"],
  [168, "1 week"],
] as const;

export function ProfileForm({
  initial,
  timeZones,
  bookingPrefix,
}: {
  initial: ProfileValues;
  timeZones: string[];
  bookingPrefix: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveProfile, {});
  const v = { ...initial, ...state.values };
  const e = state.errors ?? {};
  const common = new Set<string>(COMMON_TIME_ZONES.map(([tz]) => tz));
  const windowValues = new Set<string>(WINDOW_OPTIONS.map(([h]) => String(h)));

  return (
    <form action={action} className="flex flex-col gap-5">
      <Input
        id="business_name"
        label="Business name"
        defaultValue={v.business_name}
        error={e.business_name}
        autoComplete="organization"
        required
      />
      <Input
        id="slug"
        label="Booking link"
        defaultValue={v.slug}
        error={e.slug}
        hint={
          <>
            Clients will book at {bookingPrefix}
            <strong>your-link</strong>. Lowercase letters, numbers and dashes.
          </>
        }
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder="your-business"
        required
      />
      <Input
        id="instagram_handle"
        label="Instagram handle (optional)"
        defaultValue={v.instagram_handle}
        error={e.instagram_handle}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder="@yourhandle"
      />
      <Input
        id="phone"
        label="Phone (optional)"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        defaultValue={v.phone}
        error={e.phone}
      />
      <Select
        id="timezone"
        label="Time zone"
        defaultValue={v.timezone}
        error={e.timezone}
        hint="Appointment times are shown in this time zone."
      >
        <optgroup label="United States">
          {COMMON_TIME_ZONES.map(([tz, name]) => (
            <option key={tz} value={tz}>
              {name} ({tz})
            </option>
          ))}
        </optgroup>
        <optgroup label="All time zones">
          {timeZones
            .filter((tz) => !common.has(tz))
            .map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
        </optgroup>
      </Select>
      <Select
        id="cancellation_window_hours"
        label="Cancellation window"
        defaultValue={v.cancellation_window_hours}
        error={e.cancellation_window_hours}
        hint="Clients who cancel with less notice than this lose their deposit."
      >
        {WINDOW_OPTIONS.map(([hours, label]) => (
          <option key={hours} value={hours}>
            {label}
          </option>
        ))}
        {!windowValues.has(v.cancellation_window_hours) && (
          <option value={v.cancellation_window_hours}>{v.cancellation_window_hours} hours</option>
        )}
      </Select>
      <Textarea
        id="policy_text"
        label="Deposit policy (optional)"
        defaultValue={v.policy_text}
        error={e.policy_text}
        hint="Shown to clients before they pay."
        placeholder="e.g. Deposits go toward your service. Cancel or reschedule at least 48 hours ahead to get your deposit back. No-shows lose their deposit."
      />
      {state.message && <p className="text-danger text-sm">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
