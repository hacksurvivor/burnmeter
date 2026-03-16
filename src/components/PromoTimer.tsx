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
  const { isPeak, timeLeftSeconds, nextTransitionLabel } = promo;

  return (
    <div className={`promo ${isPeak ? "promo--peak" : ""}`}>
      <div className="promo__status">
        {isPeak ? "PEAK 1x" : "OFF-PEAK 2x"}
      </div>
      <div className="promo__explain">
        {isPeak
          ? "Standard rate · uses your plan tokens"
          : "Double usage · bonus tokens from Anthropic"}
      </div>
      <div className="promo__countdown">{fmt(timeLeftSeconds)}</div>
      <div className="promo__next">{nextTransitionLabel}</div>

      {isWeekend ? (
        <div className="tl">
          <div className="tl__bar">
            <div className="tl__seg tl__seg--off" style={{ left: "0", width: "100%" }} />
            <div className="tl__now" style={{ left: `${(currentHour / 24) * 100}%` }} />
          </div>
          <div className="tl__labels">
            <span>00</span>
            <span style={{ flex: 1, textAlign: "center" }}>All day 2x</span>
            <span>24</span>
          </div>
        </div>
      ) : (
        <TL start={peakStartLocal} end={peakEndLocal} now={currentHour} />
      )}
    </div>
  );
}

function TL({ start, end, now }: { start: number; end: number; now: number }) {
  const p = (h: number) => `${(h / 24) * 100}%`;
  const pad = (n: number) => String(n).padStart(2, "0");
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
      <div className="tl__labels">
        <span>00</span>
        <span>{pad(start)}</span>
        <span>{pad(end)}</span>
        <span>24</span>
      </div>
    </div>
  );
}

function fmt(s: number): string {
  if (s < 60) return "<1m left";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}
