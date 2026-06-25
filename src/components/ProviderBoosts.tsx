import type { ProviderBoost } from "../types/usage";

interface Props {
  boosts: ProviderBoost[];
}

export function ProviderBoosts({ boosts }: Props) {
  if (boosts.length === 0) return null;

  return (
    <div className="boosts" aria-label="Limit boosts">
      {boosts.map((boost) => (
        <div className="boost" key={boost.id}>
          <span className="boost__label">{boost.label}</span>
          <span className="boost__meta">{boostMeta(boost)}</span>
        </div>
      ))}
    </div>
  );
}

function boostMeta(boost: ProviderBoost): string {
  if (boost.windows.length > 0) {
    return boost.windows.map((window) => formatRemaining(window.used_percent)).join(" · ");
  }
  return boost.description ?? boost.kind.replace(/_/g, " ");
}

function formatRemaining(usedPercent: number | null): string {
  if (usedPercent === null) return "available";
  return `${Math.max(0, Math.round(100 - usedPercent))}% left`;
}
