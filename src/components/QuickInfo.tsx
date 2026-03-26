interface Props {
  isPromoActive: boolean;
  promoEndDate: string;
  lastUpdated: Date | null;
  error: string | null;
}

export function QuickInfo({ isPromoActive, promoEndDate, lastUpdated, error }: Props) {
  const dayName = new Date().toLocaleDateString("en-US", { weekday: "short" });

  return (
    <div className="foot">
      <span>
        {error ? (
          <span className="foot__err">{error}</span>
        ) : lastUpdated ? (
          <>{dayName} · {lastUpdated.toLocaleTimeString()}</>
        ) : null}
      </span>
      <span>{isPromoActive && promoEndDate ? `Ends ${promoEndDate}` : ""}</span>
    </div>
  );
}
