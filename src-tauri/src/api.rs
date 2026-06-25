use serde::{Deserialize, Serialize};
use std::process::Command;

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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UpdateInfo {
    pub current_version: String,
    pub latest_version: Option<String>,
    pub available: bool,
    pub download_url: Option<String>,
    pub release_url: Option<String>,
    pub asset_name: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GithubRelease {
    tag_name: String,
    html_url: String,
    assets: Vec<GithubReleaseAsset>,
}

#[derive(Debug, Deserialize)]
struct GithubReleaseAsset {
    name: String,
    browser_download_url: String,
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

#[tauri::command]
pub async fn check_for_update() -> Result<UpdateInfo, String> {
    let current_version = env!("CARGO_PKG_VERSION").to_string();
    let release = reqwest::Client::new()
        .get("https://api.github.com/repos/hacksurvivor/burnmeter/releases/latest")
        .header("User-Agent", "Burnmeter")
        .send()
        .await
        .map_err(|e| format!("Update check failed: {}", e))?
        .error_for_status()
        .map_err(|e| format!("Update check failed: {}", e))?
        .json::<GithubRelease>()
        .await
        .map_err(|e| format!("Update response parse failed: {}", e))?;

    let latest_version = release.tag_name.trim_start_matches('v').to_string();
    let available = is_newer_version(&latest_version, &current_version);
    let asset = release
        .assets
        .iter()
        .find(|asset| is_platform_installer(&asset.name));

    Ok(UpdateInfo {
        current_version,
        latest_version: Some(latest_version),
        available,
        download_url: asset.map(|asset| asset.browser_download_url.clone()),
        release_url: Some(release.html_url),
        asset_name: asset.map(|asset| asset.name.clone()),
    })
}

fn is_platform_installer(name: &str) -> bool {
    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    {
        return name.ends_with("macOS-Apple-Silicon.dmg");
    }
    #[cfg(all(target_os = "macos", target_arch = "x86_64"))]
    {
        return name.ends_with("macOS-Intel.dmg");
    }
    #[cfg(target_os = "windows")]
    {
        return name.ends_with("Windows-x64-setup.exe");
    }
    #[cfg(target_os = "linux")]
    {
        return name.ends_with("Linux-x64.AppImage");
    }
    #[allow(unreachable_code)]
    false
}

fn is_newer_version(latest: &str, current: &str) -> bool {
    let latest = parse_version(latest);
    let current = parse_version(current);
    latest > current
}

fn parse_version(version: &str) -> Vec<u64> {
    version
        .split('.')
        .map(|part| {
            part.chars()
                .take_while(|ch| ch.is_ascii_digit())
                .collect::<String>()
                .parse::<u64>()
                .unwrap_or(0)
        })
        .collect()
}

#[tauri::command]
pub fn open_provider_login(provider: String) -> Result<(), String> {
    let command = match provider.as_str() {
        "claude" => "claude login",
        "codex" => "codex login",
        _ => return Err(format!("Unsupported provider login: {}", provider)),
    };

    open_login_terminal(command)
}

#[tauri::command]
pub fn detect_running_provider_apps() -> Vec<String> {
    let mut running = Vec::new();

    if is_process_running(&["Claude", "claude"]) {
        running.push("Claude".to_string());
    }
    if is_process_running(&["Codex", "codex"]) {
        running.push("Codex".to_string());
    }

    running
}

#[cfg(any(target_os = "macos", target_os = "linux"))]
fn is_process_running(names: &[&str]) -> bool {
    names.iter().any(|name| {
        Command::new("pgrep")
            .args(["-x", name])
            .status()
            .map(|status| status.success())
            .unwrap_or(false)
    })
}

#[cfg(target_os = "windows")]
fn is_process_running(names: &[&str]) -> bool {
    names.iter().any(|name| {
        let image_name = format!("{}.exe", name);
        Command::new("tasklist")
            .args(["/FI", &format!("IMAGENAME eq {}", image_name)])
            .output()
            .map(|output| {
                String::from_utf8_lossy(&output.stdout)
                    .to_ascii_lowercase()
                    .contains(&image_name.to_ascii_lowercase())
            })
            .unwrap_or(false)
    })
}

#[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
fn is_process_running(_names: &[&str]) -> bool {
    false
}

#[cfg(target_os = "macos")]
fn open_login_terminal(command: &str) -> Result<(), String> {
    let script = format!(
        "tell application \"Terminal\" to do script {}",
        applescript_string(command)
    );

    Command::new("osascript")
        .args([
            "-e",
            &script,
            "-e",
            "tell application \"Terminal\" to activate",
        ])
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("Failed to open Terminal: {}", e))
}

#[cfg(target_os = "windows")]
fn open_login_terminal(command: &str) -> Result<(), String> {
    Command::new("cmd")
        .args(["/C", "start", "Burnmeter Login", "cmd", "/K", command])
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("Failed to open Command Prompt: {}", e))
}

#[cfg(target_os = "linux")]
fn open_login_terminal(command: &str) -> Result<(), String> {
    let command = shell_single_quote(&format!("{}; exec sh", command));
    let script = format!(
        "x-terminal-emulator -e sh -lc {0} || \
         gnome-terminal -- sh -lc {0} || \
         konsole -e sh -lc {0} || \
         xterm -e sh -lc {0}",
        command
    );

    Command::new("sh")
        .args(["-lc", &script])
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("Failed to open terminal: {}", e))
}

#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
fn open_login_terminal(_command: &str) -> Result<(), String> {
    Err("Provider login is not supported on this platform".to_string())
}

#[cfg(target_os = "macos")]
fn applescript_string(value: &str) -> String {
    format!("\"{}\"", value.replace('\\', "\\\\").replace('"', "\\\""))
}

#[cfg(target_os = "linux")]
fn shell_single_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\"'\"'"))
}
