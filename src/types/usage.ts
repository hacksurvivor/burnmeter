export interface UsageData {
  providers: ProviderUsage[];
  errors: UsageError[];
}

export interface ProviderUsage {
  provider: string;
  label: string;
  five_hour_pct: number;
  five_hour_resets_at: string | null;
  seven_day_pct: number;
  seven_day_resets_at: string | null;
  extra_usage_enabled: boolean;
  plan_type: string | null;
  activity: ActivitySummary | null;
  boosts: ProviderBoost[];
}

export interface ProviderBoost {
  id: string;
  label: string;
  kind: string;
  status: string;
  multiplier: number | null;
  starts_at: string | null;
  ends_at: string | null;
  description: string | null;
  windows: ProviderBoostWindow[];
}

export interface ProviderBoostWindow {
  label: string;
  used_percent: number | null;
  resets_at: string | null;
  limit_window_seconds: number | null;
}

export interface ActivitySummary {
  lifetime_tokens: number;
  peak_tokens: number;
  longest_task_seconds: number;
  current_streak_days: number;
  longest_streak_days: number;
  days: ActivityDay[];
  source: string;
}

export interface ActivityDay {
  date: string;
  tokens: number;
}

export interface UsageError {
  provider: string;
  label: string;
  message: string;
}

export interface PromoStatus {
  isPromoActive: boolean;
  isPeak: boolean;
  label: string;
  timeLeftSeconds: number;
  nextTransitionLabel: string;
}

export interface UpdateInfo {
  current_version: string;
  latest_version: string | null;
  available: boolean;
  download_url: string | null;
  release_url: string | null;
  asset_name: string | null;
}
