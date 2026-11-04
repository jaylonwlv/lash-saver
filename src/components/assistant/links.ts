/** Where the help chat appears: the marketing site, or a signed-in pro's app. */
export type Surface = "site" | "app";

/** Pages Dib may link to, per surface. Anything else in an answer is shown as plain text. */
export const ASSISTANT_LINKS: Record<Surface, Record<string, string>> = {
  site: {
    "/start": "Start free",
    "/demo": "Try the demo pay link",
    "/login": "Sign in",
    "/privacy": "Privacy Policy",
    "/terms": "Terms",
  },
  app: {
    "/dashboard": "Home",
    "/dashboard/appointments": "Appointments",
    "/dashboard/appointments/new": "New appointment",
    "/dashboard/services": "Services",
    "/dashboard/payments": "How clients pay",
    "/dashboard/billing": "Billing",
    "/dashboard/profile": "Profile",
    "/dashboard/clients": "Clients",
    "/dashboard/gallery": "Your work photos",
    "/dashboard/domain": "Your own website",
    "/demo": "Demo pay link",
  },
};
