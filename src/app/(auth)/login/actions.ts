"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { publicEnv } from "@/lib/env.public";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.email(),
  next: z.string().startsWith("/").default("/dashboard"),
});

export type LoginState = { error?: string };

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    next: formData.get("next") || undefined,
  });
  if (!parsed.success) return { error: "Enter a valid email address." };

  const supabase = await createClient();
  const callback = new URL("/auth/callback", publicEnv().NEXT_PUBLIC_APP_URL);
  callback.searchParams.set("next", parsed.data.next);

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: callback.toString() },
  });
  if (error) return { error: "Couldn't send the link. Try again in a minute." };

  redirect("/login?sent=1");
}
