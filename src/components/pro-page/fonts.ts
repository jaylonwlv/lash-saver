import {
  Anton,
  Cinzel,
  Dela_Gothic_One,
  Instrument_Serif,
  Metal_Mania,
  Michroma,
  Pirata_One,
  Saira,
} from "next/font/google";

// Display faces for the pro's page styles (Clean uses the app's own sans). Not
// preloaded: a page uses one of them, and the browser fetches only that one.
export const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  preload: false,
});
export const anton = Anton({ subsets: ["latin"], weight: "400", preload: false });
// Tattoo
export const metalMania = Metal_Mania({ subsets: ["latin"], weight: "400", preload: false });
export const delaGothic = Dela_Gothic_One({ subsets: ["latin"], weight: "400", preload: false });
export const pirata = Pirata_One({ subsets: ["latin"], weight: "400", preload: false });
// Detailing
export const cinzel = Cinzel({ subsets: ["latin"], weight: "600", preload: false });
export const michroma = Michroma({ subsets: ["latin"], weight: "400", preload: false });
export const saira = Saira({ subsets: ["latin"], weight: "700", preload: false });
