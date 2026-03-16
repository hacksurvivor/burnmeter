interface HeaderProps {
  timezone: string;
  utcOffset: string;
}

export function Header({ timezone, utcOffset }: HeaderProps) {
  return (
    <div className="header">
      <div className="header__brand">
        <span className="header__title">CLAUDE</span>
        <span className="header__badge">2x</span>
      </div>
      <div className="header__tz">
        <span className="header__tz-name">{timezone}</span>
        {" · "}
        <span>{utcOffset}</span>
      </div>
      <div className="header__divider" />
    </div>
  );
}
