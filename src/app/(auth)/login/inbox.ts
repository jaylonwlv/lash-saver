/*
 * "Open Gmail" / "Open Mail" buttons for the code screen, picked from the
 * email's domain and the phone. Leaving Instagram's in-app browser to find the
 * code is the slowest part of signing in, so we open the right inbox app
 * directly when we can. A button can't tell if the app is installed, which is
 * why we match it to the address instead of listing every app.
 */

export type Device = "ios" | "android" | "desktop";

export type InboxLink = { label: string; href: string };

type Provider = "gmail" | "apple" | "outlook" | "yahoo";

const PROVIDER_DOMAINS: Record<Provider, string[]> = {
  gmail: ["gmail.com", "googlemail.com"],
  apple: ["icloud.com", "me.com", "mac.com"],
  outlook: ["outlook.com", "hotmail.com", "live.com", "msn.com"],
  yahoo: ["yahoo.com", "ymail.com", "rocketmail.com"],
};

// Android intents open the app by package; the fallback opens the default email app.
const LINKS: Record<Provider, Record<Device, InboxLink>> = {
  gmail: {
    ios: { label: "Open Gmail", href: "googlegmail://" },
    android: {
      label: "Open Gmail",
      href: "intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.google.android.gm;end",
    },
    desktop: { label: "Open Gmail", href: "https://mail.google.com/" },
  },
  apple: {
    ios: { label: "Open Mail", href: "message://" },
    android: { label: "Open iCloud Mail", href: "https://www.icloud.com/mail" },
    desktop: { label: "Open iCloud Mail", href: "https://www.icloud.com/mail" },
  },
  outlook: {
    ios: { label: "Open Outlook", href: "ms-outlook://" },
    android: {
      label: "Open Outlook",
      href: "intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.microsoft.office.outlook;end",
    },
    desktop: { label: "Open Outlook", href: "https://outlook.live.com/mail/" },
  },
  yahoo: {
    ios: { label: "Open Yahoo Mail", href: "ymail://" },
    android: {
      label: "Open Yahoo Mail",
      href: "intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.yahoo.mobile.client.android.mail;end",
    },
    desktop: { label: "Open Yahoo Mail", href: "https://mail.yahoo.com/" },
  },
};

const ANDROID_EMAIL_APP: InboxLink = {
  label: "Open your email app",
  href: "intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.APP_EMAIL;end",
};

export function deviceFromUserAgent(ua: string): Device {
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

/** The inbox buttons to show for this address on this device; may be empty. */
export function inboxLinks(email: string, device: Device): InboxLink[] {
  const domain = email.split("@").pop()?.trim().toLowerCase() ?? "";
  const provider = (Object.keys(PROVIDER_DOMAINS) as Provider[]).find((p) =>
    PROVIDER_DOMAINS[p].includes(domain),
  );
  if (provider) return [LINKS[provider][device]];
  // Work or custom domains: offer the phone's usual mail apps.
  if (device === "ios") return [LINKS.apple.ios, LINKS.gmail.ios];
  if (device === "android") return [ANDROID_EMAIL_APP];
  return [];
}
