import { SlidersHorizontal } from "lucide-react";
import { BurnmeterWordmark } from "./BurnmeterWordmark";

interface HeaderProps {
  settingsOpen: boolean;
  updateAvailable: boolean;
  onSettingsClick: () => void;
}

export function Header({ settingsOpen, updateAvailable, onSettingsClick }: HeaderProps) {
  return (
    <header className="hdr">
      <BurnmeterWordmark />
      <button
        className={`settings-toggle${settingsOpen ? " settings-toggle--active" : ""}`}
        onClick={onSettingsClick}
        aria-label={settingsOpen ? "Close settings" : "Open settings"}
        title={updateAvailable ? "Settings · update available" : "Settings"}
      >
        <SlidersHorizontal aria-hidden="true" />
        {updateAvailable ? <span className="settings-toggle__dot" aria-hidden="true" /> : null}
      </button>
    </header>
  );
}
