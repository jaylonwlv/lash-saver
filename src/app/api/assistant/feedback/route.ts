import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

/*
 * "Helpful?" on a help chat answer. Written to the logs (Vercel → Logs, search
 * assistant_feedback) with the question and answer, so weak answers can be fixed in
 * facts.ts. No name, email or IP.
 */

const body = z.object({
  surface: z.enum(["site", "app"]),
  helpful: z.boolean(),
  question: z.string().max(600),
  answer: z.string().max(4000),
});

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.nextUrl.host) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  console.info(
    JSON.stringify({
      event: "assistant_feedback",
      ...parsed.data,
      question: parsed.data.question.slice(0, 300),
      answer: parsed.data.answer.slice(0, 1200),
    }),
  );
  return NextResponse.json({ ok: true });
}
