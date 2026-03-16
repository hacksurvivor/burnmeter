export interface UsageData {
  five_hour_pct: number;
  five_hour_resets_at: string | null;
  seven_day_pct: number;
  seven_day_resets_at: string | null;
  extra_usage_enabled: boolean;
}

export interface PromoStatus {
  isPromoActive: boolean;
  isPeak: boolean;
  label: string;
  timeLeftSeconds: number;
  nextTransitionLabel: string;
}
