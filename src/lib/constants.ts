// Promotion dates (exclusive end)
export const PROMO_START = "2026-03-13T00:00:00";
export const PROMO_END = "2026-03-28T00:00:00";
export const PROMO_TZ = "America/Los_Angeles";

// Peak hours in America/Los_Angeles
export const PEAK_START_HOUR = 5; // 5:00 AM PT
export const PEAK_END_HOUR = 11; // 11:00 AM PT

// Claude palette
export const COLORS = {
  dark: "#141413",
  light: "#faf9f5",
  orange: "#d97757",
  blue: "#6a9bcc",
  green: "#788c5d",
  midGray: "#b0aea5",
  lightGray: "#e8e6dc",
} as const;

// Tray icon states
export type TrayStatus = "green" | "orange" | "gray";
