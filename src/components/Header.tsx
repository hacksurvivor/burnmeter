interface HeaderProps {
  timezone: string;
  utcOffset: string;
}

export function Header({ timezone, utcOffset }: HeaderProps) {
  return (
    <div className="hdr">
      <div className="hdr__row">
        <span className="hdr__name">CLAUDE</span>
        <span className="hdr__tag">2x</span>
      </div>
      <div className="hdr__tz">
        <b>{timezone}</b> · {utcOffset}
      </div>
    </div>
  );
}
