interface HeaderProps {
  timezone: string;
  utcOffset: string;
}

const LOGO = `  ╔═╗ ╦   ╔═╗ ╦ ╦ ╔╦╗ ╔═╗
  ║   ║   ╠═╣ ║ ║  ║║ ╠═
  ╚═╝ ╩═╝ ╩ ╩ ╚═╝ ═╩╝ ╚═╝`;

export function Header({ timezone, utcOffset }: HeaderProps) {
  return (
    <div className="header">
      <pre className="header__logo glow-orange">{LOGO}</pre>
      <div className="header__subtitle">×2 TRACKER</div>
      <div className="header__divider">{'─'.repeat(38)}</div>
      <div className="header__timezone">
        <span className="text-muted">📍 You: </span>
        <span className="text-info">{timezone}</span>
        <span className="text-muted"> ({utcOffset})</span>
      </div>
    </div>
  );
}
