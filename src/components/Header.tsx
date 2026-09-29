import { SlidersHorizontal } from "lucide-react";
import { BurnWordmark } from "./BurnWordmark";
import { Mascot } from "./Mascot";
import { mascotQuip, moodFor, type MascotId, type MascotStyle } from "../lib/mascots";
import type { TightestLimit } from "../lib/limits";
import { formatDuration } from "../lib/pace";

interface HeaderProps {
  mascot: MascotId;
  mascotStyle: MascotStyle;
  tightest: TightestLimit | null;
  settingsOpen: boolean;
  updateAvailable: boolean;
  onSettingsClick: () => void;
}

export function Header({ mascot, mascotStyle, tightest, settingsOpen, updateAvailable, onSettingsClick }: HeaderProps) {
  const mood = moodFor(tightest ? tightest.remainingPct : null);

  return (
    <header className="hdr">
      <div className="brand">
        <Mascot id={mascot} mood={mood} style={mascotStyle} height={48} title={limitSummary(tightest)} />
        <div className="brand__text">
          <BurnWordmark remainingPct={tightest ? tightest.remainingPct : null} />
          <div className={`brand__quip brand__quip--${mood}`}>{mascotQuip(mascot, mood)}</div>
        </div>
      </div>
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

function limitSummary(tightest: TightestLimit | null): string {
  if (!tightest) return "Waiting for usage data";
  const left = `${tightest.providerLabel} ${tightest.windowLabel}: ${Math.round(tightest.remainingPct)}% left`;
  const resetMs = tightest.resetsAt ? new Date(tightest.resetsAt).getTime() - Date.now() : NaN;
  return Number.isFinite(resetMs) && resetMs > 0 ? `${left} · resets in ${formatDuration(resetMs / 1000)}` : left;
}
