/**
 * Database types. Hand-written to match supabase/migrations for now.
 * Once a Supabase project is linked, regenerate with `npm run db:types`
 * and do not edit by hand.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Timestamps = { created_at: string; updated_at: string };

export type ManualApp = "cashapp" | "zelle" | "venmo";

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

/** Insert type: columns with DB defaults become optional. */
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
        >;
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
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
