import { Anton, Instrument_Serif } from "next/font/google";

// Display faces for the pro's page styles (Clean uses the app's own sans).
export const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});
export const anton = Anton({ subsets: ["latin"], weight: "400" });
