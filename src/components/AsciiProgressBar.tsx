interface AsciiProgressBarProps {
  percent: number;
  width?: number;
  colorClass?: string;
}

const FULL = "█";
const EMPTY = "░";

export function AsciiProgressBar({
  percent,
  width = 20,
  colorClass = "",
}: AsciiProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const filled = Math.round((clamped / 100) * width);
  const empty = width - filled;

  return (
    <span className="progress-bar">
      <span className="progress-bracket">[</span>
      <span className={`progress-filled ${colorClass}`}>
        {FULL.repeat(filled)}
      </span>
      <span className="progress-empty">{EMPTY.repeat(empty)}</span>
      <span className="progress-bracket">]</span>
    </span>
  );
}
