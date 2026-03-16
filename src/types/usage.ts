export interface UsageData {
  session_tokens: number;
  weekly_tokens: number;
  plan: string | null;
  message_count_5h: number;
  message_count_7d: number;
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
