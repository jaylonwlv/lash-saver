/*
 * Turns an answer's light markdown into safe pieces for the chat (no HTML is ever
 * rendered): paragraphs and "- " bullets with **bold**, and links pulled out as
 * buttons, but only to pages on the allow-list or the support email. Anything else
 * that looks like a link stays as its plain label. No server deps (tested).
 */

export type Piece = { text: string; bold: boolean };
export type Line = { bullet: boolean; pieces: Piece[] };
export type AnswerLink = { label: string; href: string; email: boolean };

const LINK = /\[([^\]\n]{1,60})\]\(([^)\s]{1,200})\)/g;
// The same, without /g: .test() on a global pattern carries lastIndex between calls.
const HAS_LINK = new RegExp(LINK.source);

function pieces(text: string): Piece[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part) =>
      part.startsWith("**") && part.endsWith("**") && part.length > 4
        ? { text: part.slice(2, -2), bold: true }
        : { text: part.replace(/\*\*/g, ""), bold: false },
    );
}

export function parseAnswer(
  answer: string,
  allowed: Record<string, string>,
  email: string,
): { lines: Line[]; links: AnswerLink[] } {
  const links: AnswerLink[] = [];
  const body = answer.replace(LINK, (_, label: string, target: string) => {
    const isEmail = target === "email" || target === `mailto:${email}`;
    if (isEmail || Object.hasOwn(allowed, target)) {
      const href = isEmail ? `mailto:${email}` : target;
      if (!links.some((l) => l.href === href) && links.length < 3) {
        links.push({ label: label.trim(), href, email: isEmail });
      }
      // The words stay in the sentence; the link also becomes a button under it.
      return label.trim();
    }
    return label.trim();
  });

  // A line that only holds links (and "or", "and", punctuation) is shown as its buttons alone.
  const linkOnly = new Set(
    answer
      .split("\n")
      .map((raw, i) => ({ raw, i }))
      .filter(
        ({ raw }) =>
          HAS_LINK.test(raw) &&
          raw
            .replace(LINK, "")
            .replace(/\b(or|and)\b/gi, "")
            .replace(/[\s,.;:!?·•*-]/g, "") === "",
      )
      .map(({ i }) => i),
  );
  const lines: Line[] = [];
  for (const [i, raw] of body.split("\n").entries()) {
    if (linkOnly.has(i)) continue;
    const line = raw.trim().replace(/^#{1,6}\s+/, "");
    if (!line) continue;
    const bullet = /^[-•*]\s+/.test(line);
    const text = bullet ? line.replace(/^[-•*]\s+/, "") : line;
    if (text) lines.push({ bullet, pieces: pieces(text) });
  }
  return { lines, links };
}
