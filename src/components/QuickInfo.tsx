interface QuickInfoProps {
  plan: string | null;
  isPromoActive: boolean;
  promoEndDate: string;
  lastUpdated: Date | null;
  error: string | null;
}

export function QuickInfo({
  isPromoActive,
  promoEndDate,
  lastUpdated,
  error,
}: QuickInfoProps) {
  return (
    <div className="footer">
      <div>
        {error ? (
          <span className="footer__error">{error}</span>
        ) : lastUpdated ? (
          <span>Updated {lastUpdated.toLocaleTimeString()}</span>
        ) : null}
      </div>
      <div>
        {isPromoActive && (
          <span className="footer__promo-end">Ends {promoEndDate}</span>
        )}
      </div>
    </div>
  );
}
