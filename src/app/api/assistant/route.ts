import Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { systemPrompt } from "./facts";

/*
 * The help chat ("Ask Dib"): one question in, one short answer out, grounded in
 * facts.ts. Off unless ANTHROPIC_API_KEY is set. No account or client data is sent:
 * only what the person typed in the chat.
 */

export const maxDuration = 30;

const MODEL = "claude-opus-5-5";
const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 20;

const message = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(1500),
});
const body = z
  .object({
    surface: z.enum(["site", "app"]),
    messages: z.array(message).min(1).max(16),
  })
  // A real conversation: starts and ends with the person, and takes turns.
  .refine(
    ({ messages }) =>
      messages.every((m, i) => m.role === (i % 2 === 0 ? "user" : "assistant")) &&
      messages[messages.length - 1].role === "user" &&
      messages[messages.length - 1].content.length <= 600,
  );

// Per server instance; enough to stop one visitor from running up the bill.
const hits = new Map<string, number[]>();
function tooMany(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return false;
}

const reply = (answer: string, status = 200) => NextResponse.json({ answer }, { status });
const HANDOFF =
  "I can't help with that one, but a person can. [Email us](email) and you'll get an answer.";

export async function POST(request: NextRequest) {
  const key = serverEnv().ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: "off" }, { status: 404 });

  // Only this site's own pages may ask.
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.nextUrl.host) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (tooMany(ip)) {
    return reply("That's a lot of questions at once. Give me a few minutes, then ask again.", 429);
  }

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { surface, messages } = parsed.data;
  // What people ask, so the answers (and the site) can get better. No name, email or IP.
  console.info(
    JSON.stringify({
      event: "assistant_question",
      surface,
      turn: Math.ceil(messages.length / 2),
      question: messages[messages.length - 1].content.slice(0, 300),
    }),
  );

  const client = new Anthropic({ apiKey: key, maxRetries: 1, timeout: 25_000 });
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 2000,
      // A declined request is retried on another model instead of failing.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // Short factual answers: low effort is plenty and keeps them quick and cheap.
      output_config: { effort: "low" },
      system: [{ type: "text", text: systemPrompt(surface), cache_control: { type: "ephemeral" } }],
      messages,
    });
    if (response.stop_reason === "refusal") return reply(HANDOFF);
    const answer = response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim();
    return reply(answer || HANDOFF);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return reply("I'm getting a lot of questions right now. Try again in a minute.", 503);
    }
    if (err instanceof Anthropic.APIError) {
      console.error(`Assistant: Anthropic API error ${err.status}`, err.message);
    } else {
      console.error("Assistant failed", err);
    }
    return reply("Something went wrong on my end. Try again, or [Email us](email).", 502);
  }
}
