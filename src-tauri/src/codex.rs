use chrono::{TimeZone, Utc};
use serde::Deserialize;
use std::path::PathBuf;

use crate::activity::{ActivityDay, ActivitySummary};
use crate::api::{ProviderBoost, ProviderBoostWindow, ProviderUsage};

#[derive(Debug, Deserialize)]
struct CodexAuthFile {
    tokens: Option<CodexTokens>,
}

#[derive(Debug, Deserialize)]
struct CodexTokens {
    access_token: Option<String>,
    account_id: Option<String>,
}

#[derive(Debug)]
struct CodexAuth {
    access_token: String,
    account_id: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CodexUsagePayload {
    plan_type: Option<String>,
    rate_limit: Option<CodexRateLimitDetails>,
    promo: Option<serde_json::Value>,
    rate_limit_reset_credits: Option<CodexResetCredits>,
    additional_rate_limits: Option<Vec<CodexAdditionalRateLimit>>,
}

#[derive(Debug, Deserialize)]
struct CodexRateLimitDetails {
    primary_window: Option<CodexRateLimitWindow>,
    secondary_window: Option<CodexRateLimitWindow>,
}

#[derive(Debug, Deserialize)]
struct CodexRateLimitWindow {
    used_percent: Option<f64>,
    limit_window_seconds: Option<u64>,
    reset_at: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct CodexResetCredits {
    available_count: Option<u64>,
}

#[derive(Debug, Deserialize)]
struct CodexAdditionalRateLimit {
    limit_name: Option<String>,
    metered_feature: Option<String>,
    rate_limit: Option<CodexRateLimitDetails>,
}

#[derive(Debug, Deserialize)]
struct CodexProfileResponse {
    stats: Option<CodexProfileStats>,
}

#[derive(Debug, Deserialize)]
struct CodexProfileStats {
    lifetime_tokens: Option<u64>,
    peak_daily_tokens: Option<u64>,
    longest_running_turn_sec: Option<u64>,
    current_streak_days: Option<u64>,
    longest_streak_days: Option<u64>,
    daily_usage_buckets: Option<Vec<CodexUsageBucket>>,
}

#[derive(Debug, Deserialize)]
struct CodexUsageBucket {
    start_date: Option<String>,
    tokens: Option<u64>,
}

pub async fn get_usage() -> Result<ProviderUsage, String> {
    let auth = read_auth()?;
    fetch_usage(&auth).await
}

fn read_auth() -> Result<CodexAuth, String> {
    let path = auth_path()?;
    let raw = std::fs::read_to_string(&path)
        .map_err(|_| "No Codex auth found. Run `codex login` first.".to_string())?;
    let auth: CodexAuthFile =
        serde_json::from_str(&raw).map_err(|e| format!("Cannot parse Codex auth: {}", e))?;
    let tokens = auth
        .tokens
        .ok_or_else(|| "No Codex ChatGPT tokens found. Run `codex login` first.".to_string())?;
    let access_token = tokens
        .access_token
        .filter(|token| !token.trim().is_empty())
        .ok_or_else(|| "No Codex access token found. Run `codex login` first.".to_string())?;

    Ok(CodexAuth {
        access_token,
        account_id: tokens.account_id.filter(|id| !id.trim().is_empty()),
    })
}

fn auth_path() -> Result<PathBuf, String> {
    if let Ok(codex_home) = std::env::var("CODEX_HOME") {
        return Ok(PathBuf::from(codex_home).join("auth.json"));
    }

    let home = dirs_next::home_dir().ok_or_else(|| "HOME directory not found".to_string())?;
    Ok(home.join(".codex").join("auth.json"))
}

async fn fetch_usage(auth: &CodexAuth) -> Result<ProviderUsage, String> {
    let client = reqwest::Client::new();
    let mut request = client
        .get("https://chatgpt.com/backend-api/wham/usage")
        .bearer_auth(&auth.access_token)
        .header("User-Agent", "codex-cli");

    if let Some(account_id) = &auth.account_id {
        request = request.header("ChatGPT-Account-Id", account_id);
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("Codex network error: {}", e))?;

    let status = response.status();
    if status == reqwest::StatusCode::UNAUTHORIZED {
        return Err("Codex auth expired. Run `codex login` again.".to_string());
    }
    if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
        return Err("Codex usage endpoint is rate limited.".to_string());
    }
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Codex API error {}: {}", status, body));
    }

    let payload: CodexUsagePayload = response
        .json()
        .await
        .map_err(|e| format!("Codex parse error: {}", e))?;
    let activity = fetch_profile_activity(&client, auth)
        .await
        .ok()
        .flatten()
        .or_else(crate::activity::codex_activity);
    let boosts = codex_boosts(&payload);
    let windows = payload.rate_limit.unwrap_or(CodexRateLimitDetails {
        primary_window: None,
        secondary_window: None,
    });

    Ok(ProviderUsage {
        provider: "codex".to_string(),
        label: "Codex".to_string(),
        five_hour_pct: used_percent(windows.primary_window.as_ref()),
        five_hour_resets_at: reset_time(windows.primary_window.as_ref()),
        seven_day_pct: used_percent(windows.secondary_window.as_ref()),
        seven_day_resets_at: reset_time(windows.secondary_window.as_ref()),
        extra_usage_enabled: false,
        plan_type: payload.plan_type,
        activity,
        boosts,
    })
}

async fn fetch_profile_activity(
    client: &reqwest::Client,
    auth: &CodexAuth,
) -> Result<Option<ActivitySummary>, String> {
    let mut request = client
        .get("https://chatgpt.com/backend-api/wham/profiles/me")
        .bearer_auth(&auth.access_token)
        .header("User-Agent", "codex-cli");

    if let Some(account_id) = &auth.account_id {
        request = request.header("ChatGPT-Account-Id", account_id);
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("Codex profile network error: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Codex profile API error {}: {}", status, body));
    }

    let payload: CodexProfileResponse = response
        .json()
        .await
        .map_err(|e| format!("Codex profile parse error: {}", e))?;

    Ok(profile_activity(&payload))
}

fn profile_activity(payload: &CodexProfileResponse) -> Option<ActivitySummary> {
    let stats = payload.stats.as_ref()?;
    let days: Vec<ActivityDay> = stats
        .daily_usage_buckets
        .as_deref()
        .unwrap_or_default()
        .iter()
        .filter_map(|bucket| {
            let date = bucket.start_date.as_ref()?.to_string();
            Some(ActivityDay {
                date,
                tokens: bucket.tokens.unwrap_or(0),
            })
        })
        .collect();

    if stats.lifetime_tokens.is_none() && days.is_empty() {
        return None;
    }

    Some(ActivitySummary {
        lifetime_tokens: stats
            .lifetime_tokens
            .unwrap_or_else(|| days.iter().map(|day| day.tokens).sum()),
        peak_tokens: stats
            .peak_daily_tokens
            .unwrap_or_else(|| days.iter().map(|day| day.tokens).max().unwrap_or(0)),
        longest_task_seconds: stats.longest_running_turn_sec.unwrap_or(0),
        current_streak_days: stats.current_streak_days.unwrap_or(0),
        longest_streak_days: stats.longest_streak_days.unwrap_or(0),
        days,
        source: "Codex profile".to_string(),
    })
}

fn codex_boosts(payload: &CodexUsagePayload) -> Vec<ProviderBoost> {
    let mut boosts = Vec::new();

    if payload.promo.as_ref().is_some_and(|promo| !promo.is_null()) {
        boosts.push(ProviderBoost {
            id: "codex-promo".to_string(),
            label: promo_label(payload.promo.as_ref()).unwrap_or_else(|| "Codex promo".to_string()),
            kind: "promo".to_string(),
            status: "active".to_string(),
            multiplier: promo_multiplier(payload.promo.as_ref()),
            starts_at: promo_string(payload.promo.as_ref(), &["starts_at", "start_at", "start"]),
            ends_at: promo_string(payload.promo.as_ref(), &["ends_at", "end_at", "end"]),
            description: promo_string(
                payload.promo.as_ref(),
                &["description", "subtitle", "message"],
            ),
            windows: Vec::new(),
        });
    }

    if let Some(count) = payload
        .rate_limit_reset_credits
        .as_ref()
        .and_then(|credits| credits.available_count)
        .filter(|count| *count > 0)
    {
        boosts.push(ProviderBoost {
            id: "codex-reset-credits".to_string(),
            label: "Reset credits".to_string(),
            kind: "reset_credits".to_string(),
            status: "available".to_string(),
            multiplier: None,
            starts_at: None,
            ends_at: None,
            description: Some(format!("{} available", count)),
            windows: Vec::new(),
        });
    }

    if let Some(additional_limits) = &payload.additional_rate_limits {
        for (index, limit) in additional_limits.iter().enumerate() {
            let label = limit
                .limit_name
                .as_deref()
                .or(limit.metered_feature.as_deref())
                .unwrap_or("Additional Codex limit")
                .to_string();

            let windows = limit
                .rate_limit
                .as_ref()
                .map(boost_windows)
                .unwrap_or_default();

            boosts.push(ProviderBoost {
                id: format!("codex-additional-limit-{}", index),
                label,
                kind: "additional_limit".to_string(),
                status: "available".to_string(),
                multiplier: None,
                starts_at: None,
                ends_at: None,
                description: limit
                    .metered_feature
                    .as_ref()
                    .map(|feature| format!("Metered feature: {}", feature)),
                windows,
            });
        }
    }

    boosts
}

fn boost_windows(rate_limit: &CodexRateLimitDetails) -> Vec<ProviderBoostWindow> {
    [
        ("5h window", rate_limit.primary_window.as_ref()),
        ("7d window", rate_limit.secondary_window.as_ref()),
    ]
    .into_iter()
    .filter_map(|(label, window)| {
        window.map(|window| ProviderBoostWindow {
            label: label.to_string(),
            used_percent: window.used_percent,
            resets_at: reset_time(Some(window)),
            limit_window_seconds: window.limit_window_seconds,
        })
    })
    .collect()
}

fn promo_label(promo: Option<&serde_json::Value>) -> Option<String> {
    promo_string(promo, &["label", "title", "name"])
}

fn promo_multiplier(promo: Option<&serde_json::Value>) -> Option<f64> {
    let promo = promo?;
    ["multiplier", "boost_multiplier", "usage_multiplier"]
        .into_iter()
        .find_map(|key| promo.get(key).and_then(serde_json::Value::as_f64))
}

fn promo_string(promo: Option<&serde_json::Value>, keys: &[&str]) -> Option<String> {
    let promo = promo?;
    keys.iter()
        .find_map(|key| promo.get(*key).and_then(serde_json::Value::as_str))
        .filter(|value| !value.trim().is_empty())
        .map(ToString::to_string)
}

fn used_percent(window: Option<&CodexRateLimitWindow>) -> f64 {
    window.and_then(|w| w.used_percent).unwrap_or(0.0)
}

fn reset_time(window: Option<&CodexRateLimitWindow>) -> Option<String> {
    let reset_at = window.and_then(|w| w.reset_at)?;
    Utc.timestamp_opt(reset_at, 0)
        .single()
        .map(|dt| dt.to_rfc3339())
}

#[cfg(test)]
mod tests {
    use super::{
        profile_activity, reset_time, used_percent, CodexProfileResponse, CodexProfileStats,
        CodexRateLimitWindow, CodexUsageBucket,
    };

    #[test]
    fn maps_missing_codex_window_to_zero_usage() {
        assert_eq!(used_percent(None), 0.0);
        assert_eq!(reset_time(None), None);
    }

    #[test]
    fn maps_codex_unix_reset_time_to_rfc3339() {
        let window = CodexRateLimitWindow {
            used_percent: Some(42.0),
            limit_window_seconds: Some(18_000),
            reset_at: Some(1_735_689_720),
        };

        assert_eq!(used_percent(Some(&window)), 42.0);
        assert_eq!(
            reset_time(Some(&window)).as_deref(),
            Some("2025-01-01T00:02:00+00:00")
        );
    }

    #[test]
    fn maps_codex_profile_stats_to_activity() {
        let profile = CodexProfileResponse {
            stats: Some(CodexProfileStats {
                lifetime_tokens: Some(20_848_298_604),
                peak_daily_tokens: Some(747_787_624),
                longest_running_turn_sec: Some(30_465),
                current_streak_days: Some(71),
                longest_streak_days: Some(71),
                daily_usage_buckets: Some(vec![
                    CodexUsageBucket {
                        start_date: Some("2026-06-23".to_string()),
                        tokens: Some(100),
                    },
                    CodexUsageBucket {
                        start_date: Some("2026-06-24".to_string()),
                        tokens: Some(200),
                    },
                ]),
            }),
        };

        let activity = profile_activity(&profile).expect("profile activity");
        assert_eq!(activity.lifetime_tokens, 20_848_298_604);
        assert_eq!(activity.peak_tokens, 747_787_624);
        assert_eq!(activity.longest_task_seconds, 30_465);
        assert_eq!(activity.current_streak_days, 71);
        assert_eq!(activity.longest_streak_days, 71);
        assert_eq!(activity.days.len(), 2);
        assert_eq!(activity.source, "Codex profile");
    }
}
