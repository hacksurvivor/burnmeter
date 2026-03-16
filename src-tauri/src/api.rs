use serde::{Deserialize, Serialize};

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
pub struct UsageResponse {
    pub five_hour_pct: f64,
    pub five_hour_resets_at: Option<String>,
    pub seven_day_pct: f64,
    pub seven_day_resets_at: Option<String>,
    pub extra_usage_enabled: bool,
}

async fn fetch_usage(token: &str) -> Result<UsageResponse, String> {
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

    Ok(UsageResponse {
        five_hour_pct: api.five_hour.as_ref().and_then(|w| w.utilization).unwrap_or(0.0),
        five_hour_resets_at: api.five_hour.and_then(|w| w.resets_at),
        seven_day_pct: api.seven_day.as_ref().and_then(|w| w.utilization).unwrap_or(0.0),
        seven_day_resets_at: api.seven_day.and_then(|w| w.resets_at),
        extra_usage_enabled: api.extra_usage.and_then(|e| e.is_enabled).unwrap_or(false),
    })
}

#[tauri::command]
pub async fn get_usage() -> Result<UsageResponse, String> {
    let token = crate::keychain::read_oauth_token()?;
    fetch_usage(&token).await
}
