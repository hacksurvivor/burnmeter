import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { summarizeUsageErrors } from "../lib/usageErrors";
import type { UsageData } from "../types/usage";

const POLL_INTERVAL = 60_000;

interface UseUsageDataReturn {
  usage: UsageData | null;
  error: string | null;
  lastUpdated: Date | null;
  isStale: boolean;
  retry: () => void;
}

export function useUsageData(): UseUsageDataReturn {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isStale =
    lastUpdated !== null && Date.now() - lastUpdated.getTime() > 5 * 60_000;

  const fetchData = useCallback(async () => {
    try {
      const data = await invoke<UsageData>("get_usage");
      if (data.providers.length === 0) {
        setUsage((current) =>
          current && current.providers.length > 0
            ? { ...current, errors: data.errors }
            : data,
        );
        setError(summarizeUsageErrors(data.errors) ?? "Connect Claude or Codex to show usage.");
        return;
      }

      setUsage(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (e: any) {
      const msg = typeof e === "string" ? e : e.message || "Unknown error";
      setUsage((current) =>
        current ?? {
          providers: [],
          errors: [
            { provider: "claude", label: "Claude", message: msg },
            { provider: "codex", label: "Codex", message: msg },
          ],
        },
      );
      setError(summarizeUsageErrors([{ provider: "app", label: "App", message: msg }]) ?? "Usage refresh failed");
    }
  }, []);

  const retry = useCallback(() => {
    setError(null);
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { usage, error, lastUpdated, isStale, retry };
}
