import { useState, useEffect, useCallback } from "react";
import type { PromoConfig } from "../types/promo";
import { isValidPromoConfig } from "../types/promo";

const CONFIG_URL =
  "https://raw.githubusercontent.com/hacksurvivor/burnmeter/main/promo.json";
const REFETCH_INTERVAL = 60 * 60 * 1000; // 1 hour

export function usePromoConfig() {
  const [config, setConfig] = useState<PromoConfig | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(CONFIG_URL, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (isValidPromoConfig(data)) {
        setConfig(data);
      }
    } catch {
      // Keep cached config on failure
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    const interval = setInterval(fetchConfig, REFETCH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchConfig]);

  return config;
}
