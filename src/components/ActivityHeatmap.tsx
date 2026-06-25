import type { ActivitySummary } from "../types/usage";
import {
  HeatmapCells,
  HeatmapChart,
  HeatmapInteractionBoundary,
  HeatmapInteractionProvider,
  HeatmapLegend,
  HeatmapTooltip,
  HeatmapXAxis,
  type HeatmapColumn,
  type HeatmapLevelStyles,
} from "./charts/heatmap";

interface Props {
  activity: ActivitySummary;
  provider: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const HEATMAP_WEEKS = 30;
const HEATMAP_LEVEL_STYLES = [
  { color: "var(--chart-scale-01)", fillMode: "solid", pattern: "none" },
  { color: "var(--chart-scale-02)", fillMode: "solid", pattern: "none" },
  { color: "var(--chart-scale-03)", fillMode: "solid", pattern: "none" },
  { color: "var(--chart-scale-04)", fillMode: "solid", pattern: "none" },
  { color: "var(--chart-scale-05)", fillMode: "solid", pattern: "none" },
] as const satisfies HeatmapLevelStyles;

export function ActivityHeatmap({ activity, provider }: Props) {
  const { columns, tokensByDate } = buildHeatmapData(activity);

  return (
    <section className={`activity activity--${provider} activity--bklit`}>
      <div className="activity__stats">
        <ActivityStat value={formatTokens(activity.lifetime_tokens)} label="Lifetime tokens" />
        <ActivityStat value={`${activity.current_streak_days}d`} label="Current streak" />
        <div className="activity__statline">
          <span>
            <strong>{formatTokens(activity.peak_tokens)}</strong>
            peak day
          </span>
          <span>
            <strong>{formatDuration(activity.longest_task_seconds)}</strong>
            longest task
          </span>
          <span>
            <strong>{activity.longest_streak_days}d</strong>
            longest streak
          </span>
        </div>
      </div>

      <div className="activity__head">
        <span>Token activity</span>
        <span>{activity.source}</span>
      </div>

      <HeatmapInteractionProvider>
        <HeatmapInteractionBoundary className="activity__bklit-boundary">
          <div className="activity__bklit-chart">
            <HeatmapChart
              animate
              animationDuration={800}
              data={columns}
              gap={2}
              layout="fluid"
              levelStyles={HEATMAP_LEVEL_STYLES}
              margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
            >
              <HeatmapCells cornerRadius={3} fadedOpacity={1} />
              <HeatmapXAxis className="activity__axis-label" />
              <HeatmapTooltip
                backgroundColor="rgba(12,16,18,0.94)"
                className="activity__tooltip"
                formatLabel={(_, date) => `${formatTokens(tokensByDate.get(dateKey(date)) ?? 0)} on ${formatDate(date)}`}
                panelStyle={{
                  border: "1px solid rgba(219,226,234,0.14)",
                  boxShadow: "0 18px 40px rgba(0,0,0,0.4)",
                }}
              />
            </HeatmapChart>
          </div>
          <HeatmapLegend
            cellSize={9}
            className="activity__legend"
            cornerRadius={2}
            gap={3}
            levelStyles={HEATMAP_LEVEL_STYLES}
            lessLabel="Low"
            moreLabel="High"
          />
        </HeatmapInteractionBoundary>
      </HeatmapInteractionProvider>
    </section>
  );
}

function ActivityStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="activity__stat">
      <span>{value}</span>
      <span>{label}</span>
    </div>
  );
}

function buildHeatmapData(activity: ActivitySummary): {
  columns: HeatmapColumn[];
  tokensByDate: Map<string, number>;
} {
  const tokensByDate = new Map(activity.days.map((day) => [day.date, day.tokens]));
  const today = startOfDay(new Date());
  const start = new Date(today.getTime() - (HEATMAP_WEEKS * 7 - 1) * DAY_MS);
  start.setDate(start.getDate() - start.getDay());
  const peak = Math.max(activity.peak_tokens, 1);
  const columns: HeatmapColumn[] = [];

  for (
    let weekStart = startOfDay(start), column = 0;
    weekStart <= today;
    weekStart = new Date(weekStart.getTime() + 7 * DAY_MS), column += 1
  ) {
    const bins = Array.from({ length: 7 }, (_, day) => {
      const date = new Date(weekStart.getTime() + day * DAY_MS);
      const key = dateKey(date);
      const tokens = date <= today ? tokensByDate.get(key) ?? 0 : 0;
      return {
        bin: day,
        count: tokens > 0 ? Math.max(1, Math.ceil((tokens / peak) * 4)) : 0,
        date,
      };
    });
    columns.push({ bin: column, bins });
  }

  return { columns, tokensByDate };
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000_000) return `${trim(tokens / 1_000_000_000)}bn`;
  if (tokens >= 1_000_000) return `${trim(tokens / 1_000_000)}m`;
  if (tokens >= 1_000) return `${trim(tokens / 1_000)}k`;
  return `${Math.round(tokens)}`;
}

function trim(value: number): string {
  return value.toFixed(value >= 10 ? 1 : 2).replace(/\.0+$|(\.\d)0$/, "$1");
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0m";
  const totalMinutes = Math.round(seconds / 60);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
