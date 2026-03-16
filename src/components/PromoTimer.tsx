import type { PromoStatus } from "../types/usage";

interface Props {
  promo: PromoStatus;
  peakStartLocal: number;
  peakEndLocal: number;
  currentHour: number;
  isWeekend: boolean;
}

export function PromoTimer({ promo, peakStartLocal, peakEndLocal, currentHour, isWeekend }: Props) {
  if (!promo.isPromoActive) return null;
  const { isPeak, timeLeftSeconds } = promo;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className={`promo ${isPeak ? "promo--peak" : ""}`}>
      <div className="promo__row">
        <span className="promo__status">
          {isPeak ? "PEAK" : "OFF-PEAK 2x"}
        </span>
        <span className="promo__countdown">{fmt(timeLeftSeconds)}</span>
      </div>

      {isWeekend ? (
        <div className="promo__sub">Weekend — all day free bonus tokens</div>
      ) : (
        <div className="promo__schedule">
          <div className="promo__schedule-row promo__schedule-row--free">
            <span className="promo__schedule-label">FREE 2x</span>
            <span className="promo__schedule-hours">
              {pad(peakEndLocal)}:00 – {pad(peakStartLocal)}:00
            </span>
          </div>
          <div className="promo__schedule-row promo__schedule-row--paid">
            <span className="promo__schedule-label">YOUR PLAN</span>
            <span className="promo__schedule-hours">
              {pad(peakStartLocal)}:00 – {pad(peakEndLocal)}:00
            </span>
          </div>
        </div>
      )}

      {!isWeekend && (
        <TL start={peakStartLocal} end={peakEndLocal} now={currentHour} />
      )}
    </div>
  );
}

function TL({ start, end, now }: { start: number; end: number; now: number }) {
  const p = (h: number) => `${(h / 24) * 100}%`;
  const wraps = start > end;

  return (
    <div className="tl">
      <div className="tl__bar">
        {wraps ? (
          <>
            <div className="tl__seg tl__seg--off" style={{ left: p(end), width: p(start - end) }} />
            <div className="tl__seg tl__seg--peak" style={{ left: p(start), right: "0" }} />
            <div className="tl__seg tl__seg--peak" style={{ left: "0", width: p(end) }} />
          </>
        ) : (
          <>
            {start > 0 && <div className="tl__seg tl__seg--off" style={{ left: "0", width: p(start) }} />}
            <div className="tl__seg tl__seg--peak" style={{ left: p(start), width: p(end - start) }} />
            {end < 24 && <div className="tl__seg tl__seg--off" style={{ left: p(end), width: p(24 - end) }} />}
          </>
        )}
        <div className="tl__now" style={{ left: p(now) }} />
      </div>
    </div>
  );
}

function fmt(s: number): string {
  if (s < 60) return "<1m";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
