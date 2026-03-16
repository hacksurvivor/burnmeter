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

  return (
    <div className={`promo ${isPeak ? "promo--peak" : "promo--offpeak"}`}>
      <div className="promo__top">
        <span className={`promo__status ${isPeak ? "promo__status--peak" : "promo__status--offpeak"}`}>
          {isPeak ? "PEAK 1x" : "OFF-PEAK 2x"}
        </span>
        <span className="promo__time">{fmt(timeLeftSeconds)}</span>
      </div>
      <div className="promo__next">{nextTransitionLabel}</div>
      <Timeline peakStart={peakStartLocal} peakEnd={peakEndLocal} currentHour={currentHour} />
    </div>
  );
}

function Timeline({ peakStart, peakEnd, currentHour }: { peakStart: number; peakEnd: number; currentHour: number }) {
  const pct = (h: number) => `${(h / 24) * 100}%`;
  const pad = (n: number) => n.toString().padStart(2, "0");
  const wraps = peakStart > peakEnd;

  return (
    <div className="timeline">
      <div className="timeline__track">
        {/* Off-peak segments */}
        {wraps ? (
          <div className="timeline__segment timeline__segment--offpeak"
            style={{ left: pct(peakEnd), width: pct(peakStart - peakEnd) }} />
        ) : (
          <>
            {peakStart > 0 && (
              <div className="timeline__segment timeline__segment--offpeak"
                style={{ left: "0", width: pct(peakStart) }} />
            )}
            {peakEnd < 24 && (
              <div className="timeline__segment timeline__segment--offpeak"
                style={{ left: pct(peakEnd), width: pct(24 - peakEnd) }} />
            )}
          </>
        )}
        {/* Peak segments */}
        {wraps ? (
          <>
            <div className="timeline__segment timeline__segment--peak"
              style={{ left: pct(peakStart), right: "0" }} />
            <div className="timeline__segment timeline__segment--peak"
              style={{ left: "0", width: pct(peakEnd) }} />
          </>
        ) : (
          <div className="timeline__segment timeline__segment--peak"
            style={{ left: pct(peakStart), width: pct(peakEnd - peakStart) }} />
        )}
        <div className="timeline__now" style={{ left: pct(currentHour) }} />
      </div>
      <div className="timeline__labels">
        <span>00</span>
        <span>{pad(peakStart)}</span>
        <span>{pad(peakEnd)}</span>
        <span>24</span>
      </div>
    </div>
  );
}

function fmt(s: number): string {
  if (s < 60) return "< 1m";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}
