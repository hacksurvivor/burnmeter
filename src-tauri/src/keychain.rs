use std::process::Command;

/// Read the Claude Code OAuth token from macOS Keychain.
/// Shells out to `security find-generic-password` (read-only).
pub fn read_oauth_token() -> Result<String, String> {
    let service_names = [
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

    if output.status.success() {
        let token = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(token)
    } else {
        Err("Token not found for this service".into())
    }
}

#[tauri::command]
pub fn check_auth() -> Result<bool, String> {
    read_oauth_token().map(|_| true)
}
