import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { UsageData } from "../types/usage";

const POLL_INTERVAL = 60_000;
const BACKOFF_INTERVAL = 300_000;

interface UseUsageDataReturn {
  usage: UsageData | null;
  connected: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isStale: boolean;
  retry: () => void;
}

export function useUsageData(): UseUsageDataReturn {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [connected, setConnected] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [pollInterval, setPollInterval] = useState(POLL_INTERVAL);

  const isStale =
    lastUpdated !== null && Date.now() - lastUpdated.getTime() > 5 * 60_000;

  const fetchData = useCallback(async () => {
    try {
      const hasAuth = await invoke<boolean>("check_auth").catch(() => false);
      if (!hasAuth) {
        setConnected(false);
        return;
      }
      setConnected(true);

      const data = await invoke<UsageData>("get_usage");
      setUsage(data);
      setLastUpdated(new Date());
      setError(null);
      setPollInterval(POLL_INTERVAL);
    } catch (e: any) {
      const msg = typeof e === "string" ? e : e.message || "Unknown error";
      if (msg === "UNAUTHORIZED") {
        setConnected(false);
        setError("Token expired. Run `claude login` again.");
      } else if (msg === "RATE_LIMITED") {
        setError("Rate limited. Backing off...");
        setPollInterval(BACKOFF_INTERVAL);
      } else {
        setError(msg);
      }
    }
  }, []);

  const retry = useCallback(() => {
    setError(null);
    setPollInterval(POLL_INTERVAL);
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, pollInterval);
    return () => clearInterval(interval);
  }, [fetchData, pollInterval]);

  return { usage, connected, error, lastUpdated, isStale, retry };
}
