export interface UsageData {
  session_input_tokens: number;
  session_output_tokens: number;
  weekly_input_tokens: number;
  weekly_output_tokens: number;
  plan: string | null;
  message_count_5h: number;
  message_count_7d: number;
  session_reset_seconds: number;
  weekly_reset_seconds: number;
}

export interface PromoStatus {
  isPromoActive: boolean;
  isPeak: boolean;
  label: string;
  timeLeftSeconds: number;
  nextTransitionLabel: string;
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
