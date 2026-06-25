import type { UsageError } from "../types/usage";

export function summarizeUsageErrors(errors: UsageError[]): string | null {
  if (errors.length === 0) return null;
  if (errors.every((error) => isRateLimited(error.message))) {
    return "Usage refresh rate limited";
  }
  if (errors.every((error) => isNetworkError(error.message))) {
    return "Usage refresh failed · network unavailable";
  }
  if (errors.some((error) => isRateLimited(error.message))) {
    return "Some usage providers are rate limited";
  }
  if (errors.some((error) => isAuthError(error.message))) {
    return "Usage refresh failed · account login needed";
  }
  return "Usage refresh failed";
}

export function providerErrorTitle(message: string): string {
  if (isRateLimited(message)) return "Temporarily rate limited";
  if (isNetworkError(message)) return "Network unavailable";
  if (isAuthError(message)) return "Login required";
  if (message.includes("API error")) return "Provider rejected request";
  if (message.includes("Parse error") || message.includes("parse error")) {
    return "Unexpected provider response";
  }
  return "Usage unavailable";
}

export function providerErrorDetail(provider: string, message: string): string {
  if (isRateLimited(message)) {
    return provider === "claude"
      ? "Claude usage endpoint asked us to retry later."
      : "Codex usage endpoint asked us to retry later.";
  }
  if (isNetworkError(message)) {
    return provider === "codex"
      ? "Could not reach the ChatGPT subscription usage endpoint."
      : "Could not reach the Claude subscription usage endpoint.";
  }
  if (isAuthError(message)) {
    return "Refresh the OAuth subscription login from settings.";
  }
  return stripUrl(message);
}

export function providerErrorState(message: string): "Offline" | "Limited" | "Needs login" | "Error" {
  if (isRateLimited(message)) return "Limited";
  if (isNetworkError(message)) return "Offline";
  if (isAuthError(message)) return "Needs login";
  return "Error";
}

function isRateLimited(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("rate_limited") ||
    normalized.includes("rate limited") ||
    normalized.includes("too many requests") ||
    normalized.includes("429")
  );
}

function isNetworkError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("network error") ||
    normalized.includes("error sending request") ||
    normalized.includes("connection") ||
    normalized.includes("timed out") ||
    normalized.includes("dns")
  );
}

function isAuthError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("unauthorized") ||
    normalized.includes("expired") ||
    normalized.includes("no ") ||
    normalized.includes("not found") ||
    normalized.includes("login")
  );
}

function stripUrl(message: string): string {
  return message
    .replace(/\s*\(https?:\/\/[^)]+\)/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
