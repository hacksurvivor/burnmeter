interface Props {
  plan: string | null;
  isPromoActive: boolean;
  promoEndDate: string;
  lastUpdated: Date | null;
  error: string | null;
}

export function QuickInfo({ isPromoActive, promoEndDate, lastUpdated, error }: Props) {
  return (
    <div className="foot">
      <span>
        {error ? (
          <span className="foot__err">{error}</span>
        ) : lastUpdated ? (
          <>Updated {lastUpdated.toLocaleTimeString()}</>
        ) : null}
      </span>
      <span>{isPromoActive ? `Ends ${promoEndDate}` : ""}</span>
    </div>
  );
}
