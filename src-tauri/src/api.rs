use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UsageWindow {
    pub usage_percent: f64,
    pub reset_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionWindow {
    #[serde(flatten)]
    pub base: UsageWindow,
    pub window_hours: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WeeklyWindow {
    #[serde(flatten)]
    pub base: UsageWindow,
    pub window_days: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExtraUsage {
    pub enabled: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UsageResponse {
    pub session: SessionWindow,
    pub weekly: WeeklyWindow,
    pub plan: Option<String>,
    pub extra_usage: Option<ExtraUsage>,
}

pub async fn fetch_usage(token: &str) -> Result<UsageResponse, String> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://api.anthropic.com/api/oauth/usage")
        .bearer_auth(token)
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

    response
        .json::<UsageResponse>()
        .await
        .map_err(|e| format!("Parse error: {}. The API response shape may differ from expected.", e))
}

#[tauri::command]
pub async fn get_usage() -> Result<UsageResponse, String> {
    let token = crate::keychain::read_oauth_token()?;
    fetch_usage(&token).await
}
