use serde::{Deserialize, Serialize};

use crate::activity::ActivitySummary;

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct UsageWindow {
    pub utilization: Option<f64>,
    pub resets_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExtraUsage {
    pub is_enabled: Option<bool>,
    pub used_credits: Option<f64>,
    pub utilization: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ApiResponse {
    pub five_hour: Option<UsageWindow>,
    pub seven_day: Option<UsageWindow>,
    pub seven_day_opus: Option<UsageWindow>,
    pub seven_day_sonnet: Option<UsageWindow>,
    pub extra_usage: Option<ExtraUsage>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProviderUsage {
    pub provider: String,
    pub label: String,
    pub five_hour_pct: f64,
    pub five_hour_resets_at: Option<String>,
    pub seven_day_pct: f64,
    pub seven_day_resets_at: Option<String>,
    pub extra_usage_enabled: bool,
    pub plan_type: Option<String>,
    pub activity: Option<ActivitySummary>,
    pub boosts: Vec<ProviderBoost>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProviderBoost {
    pub id: String,
    pub label: String,
    pub kind: String,
    pub status: String,
    pub multiplier: Option<f64>,
    pub starts_at: Option<String>,
    pub ends_at: Option<String>,
    pub description: Option<String>,
    pub windows: Vec<ProviderBoostWindow>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProviderBoostWindow {
    pub label: String,
    pub used_percent: Option<f64>,
    pub resets_at: Option<String>,
    pub limit_window_seconds: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UsageError {
    pub provider: String,
    pub label: String,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UsageResponse {
    pub providers: Vec<ProviderUsage>,
    pub errors: Vec<UsageError>,
}

async fn fetch_claude_usage(token: &str) -> Result<ProviderUsage, String> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://api.anthropic.com/api/oauth/usage")
        .bearer_auth(token)
        .header("anthropic-beta", "oauth-2025-04-20")
        .header("User-Agent", "claude-code/2.1.76")
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    let status = response.status();
    if status == reqwest::StatusCode::UNAUTHORIZED {
        return Err("UNAUTHORIZED".into());
    }
    if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
        return Err("RATE_LIMITED".into());
    }
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(format!("API error {}: {}", status, body));
    }

    let api: ApiResponse = response
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    let extra_usage_enabled = api
        .extra_usage
        .as_ref()
        .and_then(|e| e.is_enabled)
        .unwrap_or(false);

    Ok(ProviderUsage {
        provider: "claude".to_string(),
        label: "Claude".to_string(),
        five_hour_pct: api
            .five_hour
            .as_ref()
            .and_then(|w| w.utilization)
            .unwrap_or(0.0),
        five_hour_resets_at: api.five_hour.and_then(|w| w.resets_at),
        seven_day_pct: api
            .seven_day
            .as_ref()
            .and_then(|w| w.utilization)
            .unwrap_or(0.0),
        seven_day_resets_at: api.seven_day.and_then(|w| w.resets_at),
        extra_usage_enabled,
        plan_type: None,
        activity: crate::activity::claude_activity(),
        boosts: claude_boosts(api.extra_usage.as_ref()),
    })
}

fn claude_boosts(extra_usage: Option<&ExtraUsage>) -> Vec<ProviderBoost> {
    let Some(extra_usage) = extra_usage else {
        return Vec::new();
    };
    if extra_usage.is_enabled != Some(true) {
        return Vec::new();
    }

    let description = match (extra_usage.used_credits, extra_usage.utilization) {
        (Some(credits), Some(utilization)) => Some(format!(
            "{:.0} credits used · {:.0}% utilized",
            credits, utilization
        )),
        (Some(credits), None) => Some(format!("{:.0} credits used", credits)),
        (None, Some(utilization)) => Some(format!("{:.0}% utilized", utilization)),
        (None, None) => Some("Extra usage enabled".to_string()),
    };

    vec![ProviderBoost {
        id: "claude-extra-usage".to_string(),
        label: "Extra usage".to_string(),
        kind: "extra_usage".to_string(),
        status: "enabled".to_string(),
        multiplier: None,
        starts_at: None,
        ends_at: None,
        description,
        windows: Vec::new(),
    }]
}

async fn get_claude_usage() -> Result<ProviderUsage, String> {
    let token = crate::keychain::read_oauth_token()?;
    fetch_claude_usage(&token).await
}

#[tauri::command]
pub async fn get_usage() -> Result<UsageResponse, String> {
    let (claude, codex) = tokio::join!(get_claude_usage(), crate::codex::get_usage());

    let mut providers = Vec::new();
    let mut errors = Vec::new();

    match claude {
        Ok(usage) => providers.push(usage),
        Err(message) => errors.push(UsageError {
            provider: "claude".to_string(),
            label: "Claude".to_string(),
            message,
        }),
    }

    match codex {
        Ok(usage) => providers.push(usage),
        Err(message) => errors.push(UsageError {
            provider: "codex".to_string(),
            label: "Codex".to_string(),
            message,
        }),
    }

    Ok(UsageResponse { providers, errors })
}
