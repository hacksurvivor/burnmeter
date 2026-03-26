#[cfg(not(target_os = "macos"))]
use std::fs;
#[cfg(not(target_os = "macos"))]
use std::path::PathBuf;

/// Read the Claude OAuth token.
/// Tries Claude Code credentials first, then Claude Desktop app.
pub fn read_oauth_token() -> Result<String, String> {
    match platform_read_credentials() {
        Ok(raw) => parse_token(&raw), // Found credentials — parse or fail (don't silently fall back)
        Err(_) => crate::desktop_credentials::read_desktop_token(), // Not found — try Desktop
    }
}

/// Parse the token from raw credential data (JSON or bare token).
fn parse_token(raw: &str) -> Result<String, String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err("Empty credential data".into());
    }

    // Credentials may be JSON: {"claudeAiOauth":{"accessToken":"sk-ant-oat01-...",...}}
    if trimmed.starts_with('{') {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(trimmed) {
            if let Some(token) = json
                .get("claudeAiOauth")
                .and_then(|v| v.get("accessToken"))
                .and_then(|v| v.as_str())
            {
                return Ok(token.to_string());
            }
            if let Some(token) = json.get("accessToken").and_then(|v| v.as_str()) {
                return Ok(token.to_string());
            }
        }
    }

    // Bare token string
    Ok(trimmed.to_string())
}

// ─── macOS: read from Keychain via `security` CLI ───

#[cfg(target_os = "macos")]
fn platform_read_credentials() -> Result<String, String> {
    use std::process::Command;

    let service_names = [
        "Claude Code-credentials",
        "claude.ai",
        "com.anthropic.claude-code",
        "claude-code",
    ];

    for service in &service_names {
        let output = Command::new("security")
            .args(["find-generic-password", "-s", service, "-w"])
            .output()
            .map_err(|e| format!("Failed to run security command: {}", e))?;

        if output.status.success() {
            let raw = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !raw.is_empty() {
                return Ok(raw);
            }
        }
    }

    Err("No Claude OAuth token found in Keychain. Run `claude login` first.".into())
}

// ─── Linux: read from ~/.claude/.credentials.json ───

#[cfg(target_os = "linux")]
fn platform_read_credentials() -> Result<String, String> {
    let home = std::env::var("HOME")
        .map_err(|_| "HOME environment variable not set".to_string())?;

    let paths = [
        PathBuf::from(&home).join(".claude").join(".credentials.json"),
        PathBuf::from(&home).join(".claude").join("credentials.json"),
        PathBuf::from(&home).join(".config").join("claude-code").join("credentials.json"),
    ];

    for path in &paths {
        if let Ok(content) = fs::read_to_string(path) {
            if !content.trim().is_empty() {
                return Ok(content);
            }
        }
    }

    Err("No Claude credentials found. Run `claude login` first.".into())
}

// ─── Windows: read from %APPDATA%\claude\credentials.json ───

#[cfg(target_os = "windows")]
fn platform_read_credentials() -> Result<String, String> {
    let appdata = std::env::var("APPDATA")
        .map_err(|_| "APPDATA environment variable not set".to_string())?;

    let paths = [
        PathBuf::from(&appdata).join("claude").join("credentials.json"),
        PathBuf::from(&appdata).join("claude").join(".credentials.json"),
        PathBuf::from(&appdata).join("claude-code").join("credentials.json"),
    ];

    for path in &paths {
        if let Ok(content) = fs::read_to_string(path) {
            if !content.trim().is_empty() {
                return Ok(content);
            }
        }
    }

    Err("No Claude credentials found. Run `claude login` first.".into())
}

#[tauri::command]
pub fn check_auth() -> Result<bool, String> {
    read_oauth_token().map(|_| true)
}
