/*
 * iCalendar (.ics) files, for Apple Calendar, Google Calendar and Outlook.
 * No server dependencies. Times are written in UTC; each calendar app shows
 * them in the phone's own time zone.
 */

export type CalendarEvent = {
  /** Stable across updates, so a re-import or a feed refresh updates the event instead of adding another. */
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  url?: string;
  /** Minutes before the start for a phone alert. */
  alarmMinutesBefore?: number;
  /** TENTATIVE shows as "maybe" in some apps, e.g. a pay link still waiting on its deposit. */
  status?: "CONFIRMED" | "TENTATIVE";
};

export function buildCalendar(
  events: CalendarEvent[],
  options: { name?: string; refreshMinutes?: number } = {},
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dibs//Appointments//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  if (options.name) lines.push(`X-WR-CALNAME:${escapeText(options.name)}`);
  if (options.refreshMinutes) {
    // Hints only: Apple and Google pick their own refresh schedule.
    lines.push(`REFRESH-INTERVAL;VALUE=DURATION:PT${options.refreshMinutes}M`);
    lines.push(`X-PUBLISHED-TTL:PT${options.refreshMinutes}M`);
  }
  const stamp = utc(new Date());
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeText(e.uid)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${utc(e.start)}`,
      `DTEND:${utc(e.end)}`,
      `SUMMARY:${escapeText(e.summary)}`,
    );
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    if (e.url) lines.push(`URL:${e.url}`);
    if (e.status) lines.push(`STATUS:${e.status}`);
    if (e.alarmMinutesBefore) {
      lines.push(
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${escapeText(e.summary)}`,
        `TRIGGER:-PT${e.alarmMinutesBefore}M`,
        "END:VALARM",
      );
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** 20261011T190000Z */
function utc(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/** RFC 5545 text: escape backslashes, semicolons, commas and newlines. */
export function escapeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Lines longer than 75 bytes continue on the next line, which starts with a space. */
function fold(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    // The first line holds 75 bytes; continuation lines hold 74 after their leading space.
    if (bytes + size > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}
