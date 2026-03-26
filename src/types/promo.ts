export interface PromoConfig {
  active: boolean;
  start: string;
  end: string;
  peakStartHour: number;
  peakEndHour: number;
  timezone: string;
  label: string;
  weekendsOffPeak: boolean;
}

export function isValidPromoConfig(data: unknown): data is PromoConfig {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.active === "boolean" &&
    typeof d.start === "string" &&
    typeof d.end === "string" &&
    typeof d.peakStartHour === "number" &&
    typeof d.peakEndHour === "number" &&
    typeof d.timezone === "string" &&
    typeof d.label === "string" &&
    typeof d.weekendsOffPeak === "boolean"
  );
}
