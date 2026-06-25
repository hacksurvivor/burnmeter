use chrono::{DateTime, Duration, Local, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::{BTreeMap, HashSet};
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct ActivitySummary {
    pub lifetime_tokens: u64,
    pub peak_tokens: u64,
    pub longest_task_seconds: u64,
    pub current_streak_days: u64,
    pub longest_streak_days: u64,
    pub days: Vec<ActivityDay>,
    pub source: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ActivityDay {
    pub date: String,
    pub tokens: u64,
}

#[derive(Default)]
struct ActivityAccumulator {
    daily_tokens: BTreeMap<NaiveDate, u64>,
    longest_task_seconds: u64,
}

pub fn claude_activity() -> Option<ActivitySummary> {
    let root = dirs_next::home_dir()?.join(".claude").join("projects");
    let files = jsonl_files(&root);
    let mut acc = ActivityAccumulator::default();

    for file in files {
        scan_claude_file(&file, &mut acc);
    }

    finalize(acc, "Claude Code local history")
}

pub fn codex_activity() -> Option<ActivitySummary> {
    let home = dirs_next::home_dir()?;
    let roots = [
        home.join(".codex").join("sessions"),
        home.join(".codex").join("archived_sessions"),
    ];
    let mut acc = ActivityAccumulator::default();
    let mut seen = HashSet::new();

    for root in roots {
        for file in jsonl_files(&root) {
            let Some(name) = file.file_name().and_then(|name| name.to_str()) else {
                continue;
            };
            if !seen.insert(name.to_string()) {
                continue;
            }
            scan_codex_file(&file, &mut acc);
        }
    }

    finalize(acc, "Codex local history")
}

fn scan_claude_file(path: &Path, acc: &mut ActivityAccumulator) {
    let Ok(file) = fs::File::open(path) else {
        return;
    };
    let reader = BufReader::new(file);
    let mut first_ts: Option<DateTime<Utc>> = None;
    let mut last_ts: Option<DateTime<Utc>> = None;

    for line in reader.lines().map_while(Result::ok) {
        let Ok(value) = serde_json::from_str::<Value>(&line) else {
            continue;
        };
        let Some(timestamp) = timestamp(&value) else {
            continue;
        };
        first_ts = Some(first_ts.map_or(timestamp, |current| current.min(timestamp)));
        last_ts = Some(last_ts.map_or(timestamp, |current| current.max(timestamp)));

        let usage = value
            .pointer("/message/usage")
            .or_else(|| value.get("usage"));
        let tokens = usage.map(claude_usage_tokens).unwrap_or(0);
        if tokens > 0 {
            add_tokens(acc, timestamp, tokens);
        }
    }

    update_longest_task(acc, first_ts, last_ts);
}

fn scan_codex_file(path: &Path, acc: &mut ActivityAccumulator) {
    let Ok(file) = fs::File::open(path) else {
        return;
    };
    let reader = BufReader::new(file);
    let mut first_ts: Option<DateTime<Utc>> = None;
    let mut last_ts: Option<DateTime<Utc>> = None;
    let mut previous_total = 0;

    for line in reader.lines().map_while(Result::ok) {
        let Ok(value) = serde_json::from_str::<Value>(&line) else {
            continue;
        };
        let Some(timestamp) = timestamp(&value) else {
            continue;
        };
        first_ts = Some(first_ts.map_or(timestamp, |current| current.min(timestamp)));
        last_ts = Some(last_ts.map_or(timestamp, |current| current.max(timestamp)));

        if value.pointer("/payload/type").and_then(Value::as_str) != Some("token_count") {
            continue;
        }

        let last_usage = value.pointer("/payload/info/last_token_usage");
        let total_usage = value.pointer("/payload/info/total_token_usage");
        let total_tokens = total_usage.map(token_usage_total).unwrap_or(0);
        let tokens = last_usage
            .map(token_usage_total)
            .filter(|tokens| *tokens > 0)
            .unwrap_or_else(|| total_tokens.saturating_sub(previous_total));

        previous_total = previous_total.max(total_tokens);
        if tokens > 0 {
            add_tokens(acc, timestamp, tokens);
        }
    }

    update_longest_task(acc, first_ts, last_ts);
}

fn jsonl_files(root: &Path) -> Vec<PathBuf> {
    let mut files = Vec::new();
    collect_jsonl_files(root, &mut files);
    files.sort();
    files
}

fn collect_jsonl_files(path: &Path, files: &mut Vec<PathBuf>) {
    let Ok(metadata) = fs::metadata(path) else {
        return;
    };
    if metadata.is_file() {
        if path.extension().and_then(|ext| ext.to_str()) == Some("jsonl") {
            files.push(path.to_path_buf());
        }
        return;
    }
    if !metadata.is_dir() {
        return;
    }

    let Ok(entries) = fs::read_dir(path) else {
        return;
    };
    for entry in entries.flatten() {
        collect_jsonl_files(&entry.path(), files);
    }
}

fn timestamp(value: &Value) -> Option<DateTime<Utc>> {
    let raw = value.get("timestamp")?.as_str()?;
    DateTime::parse_from_rfc3339(raw)
        .ok()
        .map(|dt| dt.with_timezone(&Utc))
}

fn claude_usage_tokens(usage: &Value) -> u64 {
    [
        "input_tokens",
        "output_tokens",
        "cache_creation_input_tokens",
        "cache_read_input_tokens",
    ]
    .into_iter()
    .filter_map(|key| usage.get(key))
    .map(number)
    .sum()
}

fn token_usage_total(usage: &Value) -> u64 {
    if let Some(total) = usage
        .get("total_tokens")
        .map(number)
        .filter(|value| *value > 0)
    {
        return total;
    }

    [
        "input_tokens",
        "cached_input_tokens",
        "output_tokens",
        "reasoning_output_tokens",
    ]
    .into_iter()
    .filter_map(|key| usage.get(key))
    .map(number)
    .sum()
}

fn number(value: &Value) -> u64 {
    value
        .as_u64()
        .or_else(|| value.as_f64().map(|value| value.max(0.0).round() as u64))
        .unwrap_or(0)
}

fn add_tokens(acc: &mut ActivityAccumulator, timestamp: DateTime<Utc>, tokens: u64) {
    let date = timestamp.with_timezone(&Local).date_naive();
    *acc.daily_tokens.entry(date).or_insert(0) += tokens;
}

fn update_longest_task(
    acc: &mut ActivityAccumulator,
    first_ts: Option<DateTime<Utc>>,
    last_ts: Option<DateTime<Utc>>,
) {
    let Some(first_ts) = first_ts else {
        return;
    };
    let Some(last_ts) = last_ts else {
        return;
    };
    let seconds = (last_ts - first_ts).num_seconds().max(0) as u64;
    acc.longest_task_seconds = acc.longest_task_seconds.max(seconds);
}

fn finalize(acc: ActivityAccumulator, source: &str) -> Option<ActivitySummary> {
    if acc.daily_tokens.is_empty() {
        return None;
    }

    let lifetime_tokens = acc.daily_tokens.values().sum();
    let peak_tokens = acc.daily_tokens.values().copied().max().unwrap_or(0);
    let (current_streak_days, longest_streak_days) = streaks(&acc.daily_tokens);
    let days = acc
        .daily_tokens
        .into_iter()
        .map(|(date, tokens)| ActivityDay {
            date: date.to_string(),
            tokens,
        })
        .collect();

    Some(ActivitySummary {
        lifetime_tokens,
        peak_tokens,
        longest_task_seconds: acc.longest_task_seconds,
        current_streak_days,
        longest_streak_days,
        days,
        source: source.to_string(),
    })
}

fn streaks(daily_tokens: &BTreeMap<NaiveDate, u64>) -> (u64, u64) {
    let mut longest = 0;
    let mut run = 0;
    let mut previous: Option<NaiveDate> = None;

    for date in daily_tokens.keys() {
        run = if previous
            .map(|prev| *date == prev + Duration::days(1))
            .unwrap_or(false)
        {
            run + 1
        } else {
            1
        };
        longest = longest.max(run);
        previous = Some(*date);
    }

    let mut current = 0;
    let mut cursor = Local::now().date_naive();
    while daily_tokens.contains_key(&cursor) {
        current += 1;
        cursor -= Duration::days(1);
    }

    (current, longest)
}

#[cfg(test)]
mod tests {
    use super::{claude_usage_tokens, streaks, token_usage_total};
    use chrono::NaiveDate;
    use serde_json::json;
    use std::collections::BTreeMap;

    #[test]
    fn sums_claude_top_level_usage_tokens() {
        let usage = json!({
            "input_tokens": 10,
            "output_tokens": 5,
            "cache_creation_input_tokens": 20,
            "cache_read_input_tokens": 30,
            "cache_creation": { "ephemeral_5m_input_tokens": 20 }
        });

        assert_eq!(claude_usage_tokens(&usage), 65);
    }

    #[test]
    fn prefers_codex_total_tokens() {
        let usage = json!({
            "input_tokens": 10,
            "cached_input_tokens": 20,
            "output_tokens": 5,
            "reasoning_output_tokens": 1,
            "total_tokens": 100
        });

        assert_eq!(token_usage_total(&usage), 100);
    }

    #[test]
    fn calculates_longest_streak() {
        let mut days = BTreeMap::new();
        days.insert(NaiveDate::from_ymd_opt(2026, 1, 1).unwrap(), 1);
        days.insert(NaiveDate::from_ymd_opt(2026, 1, 2).unwrap(), 1);
        days.insert(NaiveDate::from_ymd_opt(2026, 1, 4).unwrap(), 1);

        assert_eq!(streaks(&days).1, 2);
    }
}
