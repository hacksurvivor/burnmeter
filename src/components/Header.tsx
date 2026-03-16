import { ClaudeMark } from "./ClaudeMark";

interface HeaderProps {
  timezone: string;
  utcOffset: string;
}

export function Header({ timezone, utcOffset }: HeaderProps) {
  return (
    <div className="hdr">
      <div className="hdr__row">
        <ClaudeMark size={28} />
        <span className="hdr__tag">2x</span>
      </div>
      <div className="hdr__tz">
        <b>{timezone}</b> · {utcOffset}
      </div>
    </div>
  );
}
