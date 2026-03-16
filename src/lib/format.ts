export function formatCountdown(totalSeconds: number): string {
  if (totalSeconds < 60) return "<1m";

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatPercent(usagePercent: number): string {
  const remaining = Math.max(0, Math.round(100 - usagePercent));
  return `${remaining}%`;
}

export function formatTimeRange(startHour: number, endHour: number): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(startHour)}:00 - ${pad(endHour)}:00`;
}
