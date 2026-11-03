"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NEW_APPOINTMENT = "/dashboard/appointments/new";

/** Simple stroke icons, drawn on a 24px grid like the system ones. */
const icon = (path: ReactNode) => (
  <svg
    aria-hidden
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-6"
  >
    {path}
  </svg>
);

const items = [
  {
    href: "/dashboard",
    label: "Home",
    icon: icon(<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />),
  },
  {
    href: "/dashboard/appointments",
    label: "Bookings",
    icon: icon(
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </>,
    ),
  },
  { href: NEW_APPOINTMENT, label: "New", icon: null },
  {
    href: "/dashboard/services",
    label: "Services",
    icon: icon(<path d="M4 6h16M4 12h16M4 18h10" />),
  },
  {
    href: "/dashboard/profile",
    label: "Profile",
    icon: icon(
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>,
    ),
  },
];

/**
 * Bottom tab bar: primary navigation within thumb reach on phones, with New
 * appointment as the raised button in the middle (it's the thing pros do most).
 */
export function TechNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-ink fixed inset-x-0 bottom-0 z-10 rounded-t-[26px] pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-12px_rgb(0_0_0_/_0.5)] dark:ring-1 dark:ring-white/10">
      <ul className="mx-auto flex max-w-2xl items-end px-2">
        {items.map((item) => {
          if (item.href === NEW_APPOINTMENT) {
            return (
              <li key={item.href} className="flex flex-1 justify-center">
                <Link
                  href={item.href}
                  aria-label="New appointment"
                  className="press bg-pink text-ink ring-ink -mt-6 mb-2 flex size-16 items-center justify-center rounded-[22px] text-[34px] leading-none font-extrabold shadow-[0_10px_24px_-6px_var(--pink)] ring-[6px]"
                >
                  +
                </Link>
              </li>
            );
          }
          // Clients lives under Bookings in the tab bar; New appointment doesn't light it up.
          const active =
            item.href === "/dashboard"
              ? pathname === item.href
              : (pathname.startsWith(item.href) && !pathname.startsWith(NEW_APPOINTMENT)) ||
                (item.href === "/dashboard/appointments" &&
                  pathname.startsWith("/dashboard/clients"));
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
                  active ? "text-pink" : "text-white/55"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
