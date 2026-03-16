interface QuickInfoProps {
  plan: string | null;
  isPromoActive: boolean;
  promoEndDate: string;
  lastUpdated: Date | null;
  error: string | null;
}

export function QuickInfo({
  plan,
  isPromoActive,
  promoEndDate,
  lastUpdated,
  error,
}: QuickInfoProps) {
  return (
    <div className="section quick-info">
      <div className="section__title">── QUICK INFO ────────────────────</div>
      <div className="quick-info__row">
        {plan && (
          <span>
            Plan: <span className="text-info">{plan.charAt(0).toUpperCase() + plan.slice(1)}</span>
          </span>
        )}
        {isPromoActive && (
          <span className="text-muted"> │ Promo ends: {promoEndDate}</span>
        )}
      </div>
      {error && (
        <div className="quick-info__error text-orange">⚠ {error}</div>
      )}
      {lastUpdated && (
        <div className="quick-info__updated text-muted">
          Updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
