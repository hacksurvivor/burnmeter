import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
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
      // Usage data comes from local JSONL files — no auth needed
      const data = await invoke<UsageData>("get_usage");
      setUsage(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (e: any) {
      const msg = typeof e === "string" ? e : e.message || "Unknown error";
      setError(msg);
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
