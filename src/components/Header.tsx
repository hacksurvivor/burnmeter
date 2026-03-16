interface HeaderProps {
  timezone: string;
  utcOffset: string;
}

export function Header({ timezone, utcOffset }: HeaderProps) {
  return (
    <div className="header">
      <div className="header__brand">
        <span className="header__logo-text">CLAUDE</span>
        <span className="header__badge">2×</span>
      </div>
      <div className="header__location">
        <span className="header__location-tz">{timezone}</span>
        {" · "}
        {utcOffset}
      </div>
    </div>
  );
}
