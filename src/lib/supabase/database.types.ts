/**
 * Database types. Hand-written to match supabase/migrations for now.
 * Once a Supabase project is linked, regenerate with `npm run db:types`
 * and do not edit by hand.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Timestamps = { created_at: string; updated_at: string };

export type ManualApp = "cashapp" | "zelle" | "venmo";

export type TradeId =
  | "barber"
  | "tattoo"
  | "nails"
  | "lashes"
  | "esthetician"
  | "hair"
  | "fitness"
  | "detailing"
  | "photography"
  | "catering"
  | "other";

type ProfileRow = Timestamps & {
  id: string;
  email: string;
  business_name: string | null;
  slug: string | null;
  instagram_handle: string | null;
  phone: string | null;
  timezone: string;
  cancellation_window_hours: number;
  policy_text: string | null;
  stripe_account_id: string | null;
  stripe_charges_enabled: boolean;
  stripe_details_submitted: boolean;
  stripe_customer_id: string | null;
  subscription_id: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  deposit_method: "stripe" | "manual";
  cashapp_tag: string | null;
  zelle_contact: string | null;
  venmo_handle: string | null;
  trade: TradeId | null;
  /** False after instant sign-up until the pro confirms their email with a code. */
  email_confirmed: boolean;
  /** Key for the private calendar feed; server-made (reset_calendar_token). */
  calendar_token: string;
  /** The pro whose "Powered by Dibs" link this pro signed up from; server-set (lib/referral.ts). */
  referred_by: string | null;
  /** Unsubscribed from tips and offers (marketing emails); server-set. */
  marketing_opt_out_at: string | null;
  /** Closed the dashboard's first-run tour; set by the pro (dashboard/tour-actions.ts). */
  tour_seen_at: string | null;
  accent_color: string;
  page_style: string;
};

type ServiceRow = Timestamps & {
  id: string;
  tech_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  deposit_cents: number;
  is_active: boolean;
  is_starter: boolean;
};

type AppointmentRow = Timestamps & {
  id: string;
  tech_id: string;
  service_id: string | null;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  client_instagram: string | null;
  starts_at: string;
  ends_at: string;
  status: Database["public"]["Enums"]["appointment_status"];
  hold_expires_at: string | null;
  notes: string | null;
  price_cents: number | null;
  deposit_cents: number | null;
  policy_accepted_at: string | null;
  policy_text_snapshot: string | null;
  cancellation_window_hours_snapshot: number | null;
  payment_method: "stripe" | "manual";
  client_marked_sent_at: string | null;
};

type DepositRow = Timestamps & {
  id: string;
  appointment_id: string;
  tech_id: string;
  amount_cents: number;
  platform_fee_cents: number;
  currency: string;
  status: Database["public"]["Enums"]["deposit_status"];
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  paid_at: string | null;
  method: "stripe" | "manual";
  manual_app: ManualApp | null;
  dispute_id: string | null;
  dispute_status: "open" | "won" | "lost" | null;
};

type NotificationLogRow = {
  id: string;
  appointment_id: string | null;
  template: string;
  channel: "email" | "sms";
  provider_message_id: string | null;
  error: string | null;
  created_at: string;
};

type TrialClaimRow = {
  id: string;
  tech_id: string | null;
  kind: "card" | "bank" | "email" | "instagram" | "cashapp" | "zelle" | "venmo";
  value: string;
  created_at: string;
};

export type CateringPricingType = "per_person" | "flat";

type CateringSettingsRow = Timestamps & {
  tech_id: string;
  cuisine: string | null;
  city: string | null;
  description: string | null;
  policy_text: string | null;
  is_published: boolean;
  daily_capacity: number;
  min_notice_days: number;
  max_advance_days: number;
  minimum_spend_cents: number | null;
  extra_hour_price_cents: number | null;
  max_extra_hours: number;
  travel_fee_cents: number;
  service_fee_bps: number;
  tax_bps: number;
  deposit_type: "percent" | "flat";
  deposit_value: number;
  balance_due_days_before: number;
  contract_terms: string | null;
  host_can_cancel: boolean;
  full_refund_days: number;
};

type CateringPackageRow = Timestamps & {
  id: string;
  tech_id: string;
  name: string;
  description: string | null;
  items_text: string | null;
  pricing_type: CateringPricingType;
  price_cents: number;
  min_guests: number;
  max_guests: number | null;
  included_minutes: number;
  sort_order: number;
  is_active: boolean;
};

type CateringAddOnRow = Timestamps & {
  id: string;
  tech_id: string;
  name: string;
  description: string | null;
  pricing_type: CateringPricingType;
  price_cents: number;
  sort_order: number;
  is_active: boolean;
};

type CateringBlockedDateRow = {
  tech_id: string;
  date: string;
  reason: string | null;
  created_at: string;
};

export type CateringBookingStatus =
  | "requested"
  | "awaiting_deposit"
  | "confirmed"
  | "balance_due"
  | "paid_in_full"
  | "completed"
  | "cancelled"
  | "declined"
  | "expired";

export type CateringEventType = "wedding" | "corporate" | "birthday" | "graduation" | "other";

type CateringBookingRow = Timestamps & {
  id: string;
  tech_id: string;
  public_token: string;
  status: CateringBookingStatus;
  event_date: string;
  start_time: string;
  end_time: string;
  timezone: string;
  guest_count: number;
  package_id: string | null;
  add_on_ids: string[];
  extra_hours: number;
  event_type: CateringEventType;
  event_address: string;
  event_notes: string | null;
  host_name: string;
  host_email: string;
  host_phone: string | null;
  quote: Json;
  subtotal_cents: number;
  travel_fee_cents: number;
  service_fee_cents: number;
  tax_cents: number;
  total_cents: number;
  deposit_cents: number;
  balance_cents: number;
  balance_due_date: string | null;
  policy_text_snapshot: string | null;
  terms_accepted_at: string | null;
  hold_expires_at: string | null;
  deposit_paid_at: string | null;
  balance_paid_at: string | null;
  owner_approved_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  owner_notes: string | null;
  /** The agreement exactly as the host signed it (lib/catering/agreement.ts). */
  contract_text: string | null;
  signature_name: string | null;
  signed_at: string | null;
  signer_ip: string | null;
  signer_user_agent: string | null;
  /** Refund terms when they booked (lib/catering/refunds.ts). */
  host_can_cancel: boolean;
  full_refund_days: number | null;
  cancelled_by: "owner" | "host" | null;
};

type CateringPaymentRow = Timestamps & {
  id: string;
  booking_id: string;
  tech_id: string;
  kind: "deposit" | "balance";
  amount_cents: number;
  platform_fee_cents: number;
  status: "pending" | "paid" | "failed" | "refunded";
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  paid_at: string | null;
  dispute_id: string | null;
  dispute_status: "open" | "won" | "lost" | null;
};

/** Insert type: columns with DB defaults become optional. */
type GalleryPhotoRow = {
  id: string;
  tech_id: string;
  path: string;
  width: number;
  height: number;
  created_at: string;
};

type Insertable<Row, Required extends keyof Row> = Pick<Row, Required> &
  Partial<Omit<Row, Required>>;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Insertable<ProfileRow, "id" | "email">;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      services: {
        Row: ServiceRow;
        Insert: Insertable<
          ServiceRow,
          "tech_id" | "name" | "duration_minutes" | "price_cents" | "deposit_cents"
        >;
        Update: Partial<ServiceRow>;
        Relationships: [];
      };
      appointments: {
        Row: AppointmentRow;
        Insert: Insertable<AppointmentRow, "tech_id" | "client_name" | "starts_at" | "ends_at">;
        Update: Partial<AppointmentRow>;
        Relationships: [];
      };
      deposits: {
        Row: DepositRow;
        Insert: Insertable<DepositRow, "appointment_id" | "tech_id" | "amount_cents">;
        Update: Partial<DepositRow>;
        Relationships: [];
      };
      trial_claims: {
        Row: TrialClaimRow;
        Insert: Insertable<TrialClaimRow, "kind" | "value">;
        Update: Partial<TrialClaimRow>;
        Relationships: [];
      };
      notification_log: {
        Row: NotificationLogRow;
        Insert: Insertable<NotificationLogRow, "template" | "channel">;
        Update: Partial<NotificationLogRow>;
        Relationships: [];
      };
      catering_settings: {
        Row: CateringSettingsRow;
        Insert: Insertable<CateringSettingsRow, "tech_id">;
        Update: Partial<CateringSettingsRow>;
        Relationships: [];
      };
      catering_packages: {
        Row: CateringPackageRow;
        Insert: Insertable<CateringPackageRow, "tech_id" | "name" | "pricing_type" | "price_cents">;
        Update: Partial<CateringPackageRow>;
        Relationships: [];
      };
      catering_addons: {
        Row: CateringAddOnRow;
        Insert: Insertable<CateringAddOnRow, "tech_id" | "name" | "pricing_type" | "price_cents">;
        Update: Partial<CateringAddOnRow>;
        Relationships: [];
      };
      catering_blocked_dates: {
        Row: CateringBlockedDateRow;
        Insert: Insertable<CateringBlockedDateRow, "tech_id" | "date">;
        Update: Partial<CateringBlockedDateRow>;
        Relationships: [];
      };
      catering_bookings: {
        Row: CateringBookingRow;
        Insert: Insertable<
          CateringBookingRow,
          | "tech_id"
          | "public_token"
          | "status"
          | "event_date"
          | "start_time"
          | "end_time"
          | "timezone"
          | "guest_count"
          | "event_type"
          | "event_address"
          | "host_name"
          | "host_email"
          | "quote"
          | "subtotal_cents"
          | "total_cents"
          | "deposit_cents"
          | "balance_cents"
        >;
        Update: Partial<CateringBookingRow>;
        Relationships: [];
      };
      gallery_photos: {
        Row: GalleryPhotoRow;
        Insert: Insertable<GalleryPhotoRow, "tech_id" | "path" | "width" | "height">;
        Update: Partial<GalleryPhotoRow>;
        Relationships: [];
      };
      catering_payments: {
        Row: CateringPaymentRow;
        Insert: Insertable<CateringPaymentRow, "booking_id" | "tech_id" | "kind" | "amount_cents">;
        Update: Partial<CateringPaymentRow>;
        Relationships: [];
      };
    };
    Views: {
      public_profiles: {
        Row: Pick<
          ProfileRow,
          | "id"
          | "business_name"
          | "slug"
          | "instagram_handle"
          | "timezone"
          | "cancellation_window_hours"
          | "policy_text"
          | "accent_color"
          | "page_style"
        >;
        Relationships: [];
      };
    };
    Functions: {
      reset_calendar_token: { Args: Record<string, never>; Returns: string };
      hold_catering_date: { Args: { p_booking: Json }; Returns: string | null };
      catering_held_count: {
        Args: { p_tech: string; p_date: string; p_exclude?: string };
        Returns: number;
      };
    };
    Enums: {
      appointment_status:
        | "pending_deposit"
        | "confirmed"
        | "completed"
        | "no_show"
        | "cancelled_by_client"
        | "cancelled_by_tech"
        | "expired";
      deposit_status:
        "pending" | "paid" | "applied" | "forfeited" | "refunded" | "failed" | "refund_due";
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];
