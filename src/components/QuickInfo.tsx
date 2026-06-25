interface Props {
  isPromoActive: boolean;
  promoEndDate: string;
  error: string | null;
}

export function QuickInfo({ isPromoActive, promoEndDate, error }: Props) {
  const promoText = isPromoActive && promoEndDate ? `Ends ${promoEndDate}` : "";

  if (!error && !promoText) return null;

  return (
    <div className="foot">
      <span>
        {error ? <span className="foot__err">{error}</span> : null}
      </span>
      <span>{promoText}</span>
    </div>
  );
}
