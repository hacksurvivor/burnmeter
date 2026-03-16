export interface UsageWindow {
  usagePercent: number;
  resetAt: string; // ISO 8601
}

export interface UsageData {
  session: UsageWindow & { windowHours: number };
  weekly: UsageWindow & { windowDays: number };
  plan: string;
  extraUsage: { enabled: boolean };
}

export interface PromoStatus {
  isPromoActive: boolean;
  isPeak: boolean;
  label: string; // "OFF-PEAK (2×)" or "PEAK (1×)"
  timeLeftSeconds: number;
  nextTransitionLabel: string; // "Next peak: 15:00 - 21:00 (your time)"
}

export interface AppState {
  connected: boolean;
  usage: UsageData | null;
  promo: PromoStatus;
  timezone: string;
  utcOffset: string;
  lastUpdated: Date | null;
  error: string | null;
}
