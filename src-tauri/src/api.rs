use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UsageResponse {
    pub session_tokens: u64,
    pub weekly_tokens: u64,
    pub plan: Option<String>,
    pub message_count_5h: u32,
    pub message_count_7d: u32,
}

/// Get the Claude projects directory
fn claude_projects_dir() -> Option<PathBuf> {
    let home = dirs_next::home_dir()?;
    let projects = home.join(".claude").join("projects");
    if projects.exists() {
        Some(projects)
    } else {
        None
    }
}

/// Parse JSONL conversation logs to estimate token usage.
/// Counts tokens from the last 5 hours (session) and last 7 days (weekly).
fn parse_local_usage() -> Result<UsageResponse, String> {
    let projects_dir = claude_projects_dir()
        .ok_or_else(|| "Claude projects directory not found".to_string())?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64;

    let five_hours_ago = now.saturating_sub(5 * 60 * 60 * 1000);
    let seven_days_ago = now.saturating_sub(7 * 24 * 60 * 60 * 1000);

    let mut session_tokens: u64 = 0;
    let mut weekly_tokens: u64 = 0;
    let mut message_count_5h: u32 = 0;
    let mut message_count_7d: u32 = 0;

    // Walk all project directories
    if let Ok(entries) = fs::read_dir(&projects_dir) {
        for entry in entries.flatten() {
            if !entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                continue;
            }
            // Read all JSONL files in each project
            if let Ok(files) = fs::read_dir(entry.path()) {
                for file in files.flatten() {
                    let path = file.path();
                    if path.extension().and_then(|e| e.to_str()) != Some("jsonl") {
                        continue;
                    }
                    // Check file modification time — skip files older than 7 days
                    if let Ok(meta) = fs::metadata(&path) {
                        if let Ok(modified) = meta.modified() {
                            let mod_ms = modified
                                .duration_since(std::time::UNIX_EPOCH)
                                .unwrap_or_default()
                                .as_millis() as u64;
                            if mod_ms < seven_days_ago {
                                continue;
                            }
                        }
                    }

                    if let Ok(content) = fs::read_to_string(&path) {
                        for line in content.lines() {
                            parse_usage_line(
                                line,
                                five_hours_ago,
                                seven_days_ago,
                                &mut session_tokens,
                                &mut weekly_tokens,
                                &mut message_count_5h,
                                &mut message_count_7d,
                            );
                        }
                    }
                }
            }
        }
    }

    Ok(UsageResponse {
        session_tokens,
        weekly_tokens,
        plan: None,
        message_count_5h,
        message_count_7d,
    })
}

fn parse_usage_line(
    line: &str,
    five_hours_ago: u64,
    seven_days_ago: u64,
    session_tokens: &mut u64,
    weekly_tokens: &mut u64,
    message_count_5h: &mut u32,
    message_count_7d: &mut u32,
) {
    let json: serde_json::Value = match serde_json::from_str(line) {
        Ok(v) => v,
        Err(_) => return,
    };

    // Only process assistant messages (they contain usage data)
    if json.get("type").and_then(|v| v.as_str()) != Some("assistant") {
        return;
    }

    let timestamp = match json.get("timestamp").and_then(|v| v.as_str()) {
        Some(ts) => {
            // Parse ISO timestamp to millis
            chrono::DateTime::parse_from_rfc3339(ts)
                .map(|dt| dt.timestamp_millis() as u64)
                .unwrap_or(0)
        }
        None => return,
    };

    if timestamp < seven_days_ago {
        return;
    }

    // Extract token usage from message.usage
    let usage = match json
        .get("message")
        .and_then(|m| m.get("usage"))
    {
        Some(u) => u,
        None => return,
    };

    let input = usage.get("input_tokens").and_then(|v| v.as_u64()).unwrap_or(0);
    let output = usage.get("output_tokens").and_then(|v| v.as_u64()).unwrap_or(0);
    let cache_create = usage
        .get("cache_creation_input_tokens")
        .and_then(|v| v.as_u64())
        .unwrap_or(0);
    let cache_read = usage
        .get("cache_read_input_tokens")
        .and_then(|v| v.as_u64())
        .unwrap_or(0);

    let total = input + output + cache_create + cache_read;

    // Weekly window
    *weekly_tokens += total;
    *message_count_7d += 1;

    // Session window (5 hours)
    if timestamp >= five_hours_ago {
        *session_tokens += total;
        *message_count_5h += 1;
    }
}

#[tauri::command]
pub async fn get_usage() -> Result<UsageResponse, String> {
    parse_local_usage()
}
