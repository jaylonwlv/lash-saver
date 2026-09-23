"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { publicEnv } from "@/lib/env.public";
import { trackSignUp } from "@/lib/meta";
import { createClient } from "@/lib/supabase/server";

const nextPath = z
  .string()
  .refine((p) => p.startsWith("/") && !p.startsWith("//"))
  .catch("/dashboard");

const emailSchema = z.object({ email: z.email(), next: nextPath });
const codeSchema = z.object({
  email: z.email(),
  code: z.string().regex(/^\d{6,10}$/),
  next: nextPath,
});

export type LoginState = { error?: string; sent?: { email: string; next: string } };

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = emailSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    next: formData.get("next") || "/dashboard",
  });
  if (!parsed.success) return { error: "Enter a valid email address." };

  const supabase = await createClient();
  const callback = new URL("/auth/callback", publicEnv().NEXT_PUBLIC_APP_URL);
  callback.searchParams.set("next", parsed.data.next);

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: callback.toString() },
  });
  if (error) return { error: "Couldn't send the email. Try again in a minute." };

  return { sent: { email: parsed.data.email, next: parsed.data.next } };
}

/** Signs in with the code from the email. Works in any browser, unlike the link. */
export async function verifyCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = codeSchema.safeParse({
    email: formData.get("email"),
    code: String(formData.get("code") ?? "").replace(/\s/g, ""),
    next: formData.get("next") || "/dashboard",
  });
  if (!parsed.success) return { error: "Enter the code from the email." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.code,
    type: "email",
  });
  if (error) return { error: "That code didn't work or has expired. Check it, or send a new one." };
  if (data.user) await trackSignUp(data.user);

  redirect(parsed.data.next);
}
