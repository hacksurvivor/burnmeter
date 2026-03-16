use std::process::Command;

/// Read the Claude Code OAuth token from macOS Keychain.
/// Shells out to `security find-generic-password` (read-only).
pub fn read_oauth_token() -> Result<String, String> {
    let service_names = [
        "Claude Code-credentials",
        "claude.ai",
        "com.anthropic.claude-code",
        "claude-code",
    ];

    for service in &service_names {
        match try_read_token(service) {
            Ok(token) if !token.is_empty() => return Ok(token),
            _ => continue,
        }
    }

    Err("No Claude OAuth token found in Keychain. Run `claude login` first.".into())
}

fn try_read_token(service: &str) -> Result<String, String> {
    let output = Command::new("security")
        .args(["find-generic-password", "-s", service, "-w"])
        .output()
        .map_err(|e| format!("Failed to run security command: {}", e))?;

    if !output.status.success() {
        return Err("Token not found for this service".into());
    }

    let raw = String::from_utf8_lossy(&output.stdout).trim().to_string();

    // The credential may be stored as JSON with nested structure:
    // {"claudeAiOauth":{"accessToken":"sk-ant-oat01-...","refreshToken":"...",...}}
    // Try to parse as JSON and extract the access token.
    if raw.starts_with('{') {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&raw) {
            // Try claudeAiOauth.accessToken path
            if let Some(token) = json
                .get("claudeAiOauth")
                .and_then(|v| v.get("accessToken"))
                .and_then(|v| v.as_str())
            {
                return Ok(token.to_string());
            }
            // Try direct accessToken
            if let Some(token) = json.get("accessToken").and_then(|v| v.as_str()) {
                return Ok(token.to_string());
            }
        }
    }

    // If not JSON, return the raw value (might be a bare token)
    Ok(raw)
}

#[tauri::command]
pub fn check_auth() -> Result<bool, String> {
    read_oauth_token().map(|_| true)
}
