interface HeaderProps {
  timezone: string;
  utcOffset: string;
}

export function Header({ timezone, utcOffset }: HeaderProps) {
  return (
    <div className="header">
      <div className="header__row">
        <span className="header__name">CLAUDE</span>
        <span className="header__tag">2x</span>
      </div>
      <div className="header__tz">
        <b>{timezone}</b> · {utcOffset}
      </div>
    </div>
  );
}
