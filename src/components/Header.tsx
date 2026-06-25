import { openUrl } from "@tauri-apps/plugin-opener";
import { Heart, SlidersHorizontal } from "lucide-react";
import { BurnmeterWordmark } from "./BurnmeterWordmark";

const SUPPORT_URL = "https://github.com/sponsors/hacksurvivor";

interface HeaderProps {
  timezone: string;
  utcOffset: string;
  settingsOpen: boolean;
  onSettingsClick: () => void;
}

export function Header({ timezone, utcOffset, settingsOpen, onSettingsClick }: HeaderProps) {
  const handleSupportClick = () => {
    openUrl(SUPPORT_URL).catch(() => {
      window.open(SUPPORT_URL, "_blank", "noopener,noreferrer");
    });
  };

  return (
    <header className="hdr">
      <button className="support-link" type="button" onClick={handleSupportClick} title="Support Burnmeter">
        <Heart aria-hidden="true" />
        <span>Support me</span>
      </button>
      <div className="hdr__copy">
        <div className="hdr__row">
          <BurnmeterWordmark />
        </div>
        <div className="hdr__tz">
          <b>{timezone}</b> · {utcOffset}
        </div>
      </div>
      <button
        className={`settings-toggle${settingsOpen ? " settings-toggle--active" : ""}`}
        onClick={onSettingsClick}
        aria-label={settingsOpen ? "Close provider settings" : "Open provider settings"}
        title="Provider settings"
      >
        <SlidersHorizontal aria-hidden="true" />
      </button>
    </header>
  );
}
