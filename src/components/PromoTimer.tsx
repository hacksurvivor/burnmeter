import type { PromoStatus } from "../types/usage";

interface PromoTimerProps {
  promo: PromoStatus;
  peakStartLocal: number;
  peakEndLocal: number;
  currentHour: number;
}

export function PromoTimer({
  promo,
  peakStartLocal,
  peakEndLocal,
  currentHour,
}: PromoTimerProps) {
  if (!promo.isPromoActive) return null;

  const { isPeak, label, timeLeftSeconds, nextTransitionLabel } = promo;

  return (
    <div className="section">
      <div className="section__title">── PROMO STATUS ──────────────────</div>

      <div className="promo-status">
        <span className={isPeak ? "text-orange glow-orange" : "text-green glow-green"}>
          {isPeak ? "●" : "⚡"} {label}
        </span>
        <span className="text-muted">
          {"  ⏱  "}
          {formatSimpleCountdown(timeLeftSeconds)} left
        </span>
      </div>

      <div className="text-muted">{nextTransitionLabel}</div>

      <div className="timeline">
        <div className="timeline__label">Today's windows:</div>
        <TimelineBar
          peakStart={peakStartLocal}
          peakEnd={peakEndLocal}
          currentHour={currentHour}
        />
      </div>
    </div>
  );
}

function TimelineBar({
  peakStart,
  peakEnd,
  currentHour,
}: {
  peakStart: number;
  peakEnd: number;
  currentHour: number;
}) {
  const WIDTH = 36;
  const bar: string[] = [];

  for (let i = 0; i < WIDTH; i++) {
    const hour = (i / WIDTH) * 24;
    const isPeakHour = peakStart <= peakEnd
      ? hour >= peakStart && hour < peakEnd
      : hour >= peakStart || hour < peakEnd;
    bar.push(isPeakHour ? "█" : "░");
  }

  const markerPos = Math.min(Math.round((currentHour / 24) * WIDTH), WIDTH - 1);

  return (
    <div className="timeline__bar">
      <div>
        {bar.map((char, i) => (
          <span key={i} className={i === markerPos ? "text-green" : char === "█" ? "text-orange" : "text-muted"}>
            {i === markerPos ? "▌" : char}
          </span>
        ))}
      </div>
      <div className="timeline__labels text-muted">
        <span>0</span>
        <span>{peakStart}</span>
        <span>{peakEnd}</span>
        <span>24</span>
      </div>
    </div>
  );
}

function formatSimpleCountdown(seconds: number): string {
  if (seconds < 60) return "<1m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
