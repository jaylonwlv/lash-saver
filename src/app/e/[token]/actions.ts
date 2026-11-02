"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { CateringError, resumeDepositCheckout, startBalanceCheckout } from "@/lib/catering/server";
import type { FormState } from "@/lib/forms";

const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{32,64}$/);

async function go(token: string, start: (token: string) => Promise<string>): Promise<FormState> {
  if (!tokenSchema.safeParse(token).success) return { message: "We couldn't find this booking." };
  let url: string;
  try {
    url = await start(token);
  } catch (err) {
    if (err instanceof CateringError) return { message: err.message };
    console.error("Catering checkout failed", err);
    return { message: "We couldn't open checkout. Try again in a minute." };
  }
  redirect(url);
}

export async function payBalance(token: string): Promise<FormState> {
  return go(token, startBalanceCheckout);
}

export async function finishDeposit(token: string): Promise<FormState> {
  return go(token, resumeDepositCheckout);
}
