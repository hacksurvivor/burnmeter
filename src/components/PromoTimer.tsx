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

  const { isPeak, timeLeftSeconds, nextTransitionLabel } = promo;
  const cardClass = isPeak ? "status-card--peak" : "status-card--offpeak";
  const statusClass = isPeak ? "status-card__status--peak" : "status-card__status--offpeak";

  return (
    <div className={`status-card ${cardClass}`}>
      <div className="status-card__header">
        <span className="status-card__label">Promo Status</span>
      </div>

      <div className="status-card__hero">
        <span className={`status-card__status ${statusClass}`}>
          {isPeak ? "PEAK" : "OFF-PEAK 2×"}
        </span>
        <span className="status-card__countdown">
          {formatCountdown(timeLeftSeconds)}
        </span>
      </div>

      <div className="status-card__next">{nextTransitionLabel}</div>

      <Timeline
        peakStart={peakStartLocal}
        peakEnd={peakEndLocal}
        currentHour={currentHour}
      />
    </div>
  );
}

function Timeline({
  peakStart,
  peakEnd,
  currentHour,
}: {
  peakStart: number;
  peakEnd: number;
  currentHour: number;
}) {
  const toPercent = (h: number) => `${(h / 24) * 100}%`;
  const nowPos = toPercent(currentHour);

  // Handle peak hours that may wrap around midnight
  const wraps = peakStart > peakEnd;

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="timeline">
      <div className="timeline__track">
        {wraps ? (
          <>
            <div
              className="timeline__peak"
              style={{ left: toPercent(peakStart), right: "0" }}
            />
            <div
              className="timeline__peak"
              style={{ left: "0", width: toPercent(peakEnd) }}
            />
          </>
        ) : (
          <div
            className="timeline__peak"
            style={{ left: toPercent(peakStart), width: toPercent(peakEnd - peakStart) }}
          />
        )}
        <div className="timeline__now" style={{ left: nowPos }} />
      </div>
      <div className="timeline__labels">
        <span>00:00</span>
        <span>{pad(peakStart)}:00</span>
        <span>{pad(peakEnd)}:00</span>
        <span>24:00</span>
      </div>
    </div>
  );
}

function formatCountdown(seconds: number): string {
  if (seconds < 60) return "< 1m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}
