import { openUrl } from "@tauri-apps/plugin-opener";
import { invoke } from "@tauri-apps/api/core";
import { Heart } from "lucide-react";
import type { UpdateInfo, UsageData, UsageError } from "../types/usage";
import {
  providerErrorDetail,
  providerErrorState,
  providerErrorTitle,
} from "../lib/usageErrors";
import { ProviderLogo } from "./ProviderLogo";
import { Mascot } from "./Mascot";
import { MASCOT_IDS, MASCOT_STYLES, mascotName, mascotStyleName, type MascotId, type MascotStyle } from "../lib/mascots";
import {
  MENU_BAR_ROTATION_INTERVALS,
  type MenuBarProvider,
  type MenuBarRotationMinutes,
} from "../App";

const SUPPORT_URL = "https://github.com/sponsors/hacksurvivor";

export type ProviderConfig = {
  id: string;
  label: string;
  authLabel: string;
  command: string | null;
  connectUrl: string | null;
  actionLabel: string;
  available: boolean;
};

export const PROVIDERS: ProviderConfig[] = [
  {
    id: "claude",
    label: "Claude",
    authLabel: "Claude subscription",
    command: "claude login",
    connectUrl: null,
    actionLabel: "Login",
    available: true,
  },
  {
    id: "codex",
    label: "Codex",
    authLabel: "ChatGPT subscription",
    command: "codex login",
    connectUrl: null,
    actionLabel: "Login",
    available: true,
  },
];

interface Props {
  usage: UsageData | null;
  updateInfo: UpdateInfo | null;
  updateError: string | null;
  launchAtLogin: boolean | null;
  launchSettingsError: string | null;
  menuBarProvider: MenuBarProvider;
  menuBarRotationMinutes: MenuBarRotationMinutes;
  mascot: MascotId;
  mascotStyle: MascotStyle;
  onMascotChange: (mascot: MascotId) => void;
  onMascotStyleChange: (style: MascotStyle) => void;
  openWhenProviderStarts: boolean;
  onLaunchAtLoginChange: (enabled: boolean) => Promise<void>;
  onMenuBarProviderChange: (provider: MenuBarProvider) => void;
  onMenuBarRotationMinutesChange: (minutes: MenuBarRotationMinutes) => void;
  onOpenWhenProviderStartsChange: (enabled: boolean) => void;
  onClose: () => void;
}

export function SettingsPanel({
  usage,
  updateInfo,
  updateError,
  launchAtLogin,
  launchSettingsError,
  menuBarProvider,
  menuBarRotationMinutes,
  mascot,
  mascotStyle,
  onMascotChange,
  onMascotStyleChange,
  openWhenProviderStarts,
  onLaunchAtLoginChange,
  onMenuBarProviderChange,
  onMenuBarRotationMinutesChange,
  onOpenWhenProviderStartsChange,
  onClose,
}: Props) {
  const connected = new Map(
    usage?.providers.map((provider) => [provider.provider, provider]) ?? [],
  );
  const errors = new Map(
    usage?.errors.map((error) => [error.provider, error]) ?? [],
  );

  return (
    <aside className="settings" role="dialog" aria-label="Settings">
      <div className="settings__head">
        <div className="settings__title">Settings</div>
        <button className="settings__close" onClick={onClose} aria-label="Close settings">
          ×
        </button>
      </div>

      <MenuBarProviderPicker
        connected={connected}
        value={menuBarProvider}
        rotationMinutes={menuBarRotationMinutes}
        onChange={onMenuBarProviderChange}
        onRotationMinutesChange={onMenuBarRotationMinutesChange}
      />

      <MascotPicker value={mascot} style={mascotStyle} onChange={onMascotChange} onStyleChange={onMascotStyleChange} />

      <div className="settings__list">
        {PROVIDERS.map((provider) => (
          <ProviderRow
            key={provider.id}
            provider={provider}
            isConnected={connected.has(provider.id)}
            plan={connected.get(provider.id)?.plan_type}
            error={errors.get(provider.id)}
          />
        ))}
      </div>

      <div className="settings__utility">
        <UpdateRow updateInfo={updateInfo} updateError={updateError} />

        <LaunchOptions
          launchAtLogin={launchAtLogin}
          launchSettingsError={launchSettingsError}
          openWhenProviderStarts={openWhenProviderStarts}
          onLaunchAtLoginChange={onLaunchAtLoginChange}
          onOpenWhenProviderStartsChange={onOpenWhenProviderStartsChange}
        />

        <button className="settings__support" type="button" onClick={() => openProviderLogin(SUPPORT_URL)}>
          <Heart aria-hidden="true" />
          <span>Support Burnmeter</span>
        </button>
      </div>
    </aside>
  );
}

function MenuBarProviderPicker({
  connected,
  value,
  rotationMinutes,
  onChange,
  onRotationMinutesChange,
}: {
  connected: Map<string, UsageData["providers"][number]>;
  value: MenuBarProvider;
  rotationMinutes: MenuBarRotationMinutes;
  onChange: (provider: MenuBarProvider) => void;
  onRotationMinutesChange: (minutes: MenuBarRotationMinutes) => void;
}) {
  const options: Array<{ id: MenuBarProvider; label: string }> = [
    { id: "rotate", label: "Rotate" },
    { id: "claude", label: "Claude" },
    { id: "codex", label: "Codex" },
  ];

  return (
    <section className="settings__menu-provider" aria-label="Menu bar provider">
      <div className="settings__menu-provider-copy">
        <span>Menu bar</span>
        <span>Show one provider at a time in the menu bar.</span>
      </div>
      <div className="settings__provider-picker">
        {options.map((option) => {
          const disabled = option.id !== "rotate" && !connected.has(option.id);
          return (
            <button
              key={option.id}
              className="settings__provider-choice"
              type="button"
              aria-pressed={value === option.id}
              disabled={disabled}
              onClick={() => onChange(option.id)}
            >
              {option.id === "rotate" ? (
                <RotateMark />
              ) : (
                <ProviderLogo label={option.label} provider={option.id} />
              )}
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
      {value === "rotate" ? (
        <div className="settings__rotation-interval" aria-label="Rotation interval">
          <span>Change every</span>
          <div className="settings__interval-picker">
            {MENU_BAR_ROTATION_INTERVALS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                aria-pressed={rotationMinutes === minutes}
                onClick={() => onRotationMinutesChange(minutes)}
              >
                {minutes}m
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function MascotPicker({
  value,
  style,
  onChange,
  onStyleChange,
}: {
  value: MascotId;
  style: MascotStyle;
  onChange: (mascot: MascotId) => void;
  onStyleChange: (style: MascotStyle) => void;
}) {
  return (
    <section className="settings__mascot" aria-label="Mascot">
      <div className="settings__menu-provider-copy">
        <span>Mascot</span>
        <span>Burns down with your tightest limit.</span>
      </div>
      <div className="settings__mascot-picker">
        {MASCOT_IDS.map((id) => (
          <button
            key={id}
            className="settings__mascot-choice"
            type="button"
            aria-pressed={value === id}
            onClick={() => onChange(id)}
          >
            <Mascot id={id} mood="plenty" style={style} height={40} animate={false} />
            <span>{mascotName(id)}</span>
          </button>
        ))}
      </div>
      <div className="settings__rotation-interval" aria-label="Mascot style">
        <span>Style</span>
        <div className="settings__interval-picker settings__style-picker">
          {MASCOT_STYLES.map((option) => (
            <button key={option} type="button" aria-pressed={style === option} onClick={() => onStyleChange(option)}>
              {mascotStyleName(option)}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function RotateMark() {
  return (
    <svg className="settings__rotate-mark" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M14.4 6.6A5.8 5.8 0 0 0 4.1 5.1L2.7 6.5m0 0V3.2m0 3.3H6" />
      <path d="M3.6 11.4a5.8 5.8 0 0 0 10.3 1.5l1.4-1.4m0 0v3.3m0-3.3H12" />
    </svg>
  );
}

function LaunchOptions({
  launchAtLogin,
  launchSettingsError,
  openWhenProviderStarts,
  onLaunchAtLoginChange,
  onOpenWhenProviderStartsChange,
}: {
  launchAtLogin: boolean | null;
  launchSettingsError: string | null;
  openWhenProviderStarts: boolean;
  onLaunchAtLoginChange: (enabled: boolean) => Promise<void>;
  onOpenWhenProviderStartsChange: (enabled: boolean) => void;
}) {
  return (
    <div className="settings__launch">
      <ToggleRow
        title="Open at login"
        detail="Start Burnmeter when macOS starts."
        checked={launchAtLogin ?? false}
        disabled={launchAtLogin === null}
        onChange={onLaunchAtLoginChange}
      />
      <ToggleRow
        title="Wake with Claude or Codex"
        detail="Show the panel when either app starts."
        checked={openWhenProviderStarts}
        onChange={(enabled) => {
          onOpenWhenProviderStartsChange(enabled);
          return Promise.resolve();
        }}
      />
      {launchSettingsError ? <div className="settings__launch-error">{launchSettingsError}</div> : null}
    </div>
  );
}

function ToggleRow({
  title,
  detail,
  checked,
  disabled = false,
  onChange,
}: {
  title: string;
  detail: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (enabled: boolean) => Promise<void>;
}) {
  return (
    <label className={`settings__toggle-row${disabled ? " settings__toggle-row--disabled" : ""}`}>
      <span>
        <span className="settings__toggle-title">{title}</span>
        <span className="settings__toggle-detail">{detail}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.currentTarget.checked).catch(() => {});
        }}
      />
      <span className="settings__switch" aria-hidden="true" />
    </label>
  );
}

function UpdateRow({
  updateInfo,
  updateError,
}: {
  updateInfo: UpdateInfo | null;
  updateError: string | null;
}) {
  const targetUrl = updateInfo?.download_url ?? updateInfo?.release_url ?? "https://github.com/hacksurvivor/burnmeter/releases/latest";
  const status = updateInfo
    ? updateInfo.available
      ? `v${updateInfo.latest_version} available`
      : `v${updateInfo.current_version} · Up to date`
    : updateError
    ? "Update check failed"
    : "Checking for updates…";
  const detail = updateInfo?.available
    ? `You have v${updateInfo.current_version}`
    : updateInfo
    ? null
    : updateError;
  const action = updateInfo?.available ? "Update" : updateError ? "Open releases" : null;

  return (
    <div className={`settings__update${updateInfo?.available ? " settings__update--available" : ""}`}>
      <div>
        <div className="settings__update-title">Updates</div>
        <div className="settings__update-status">{status}</div>
        {detail ? <div className="settings__update-detail" title={detail}>{detail}</div> : null}
      </div>
      {action ? (
        <button
          className="settings__connect-btn settings__update-btn"
          type="button"
          onClick={() => openProviderLogin(targetUrl)}
        >
          {action}
        </button>
      ) : null}
    </div>
  );
}

function ProviderRow({
  provider,
  isConnected,
  plan,
  error,
}: {
  provider: ProviderConfig;
  isConnected: boolean;
  plan: string | null | undefined;
  error: UsageError | undefined;
}) {
  const errorState = error ? providerErrorState(error.message) : null;
  const state = isConnected ? "Connected" : provider.available ? errorState ?? "Needs login" : "Connect";
  const needsLogin = state === "Needs login";
  const showState = state !== "Connect" && !needsLogin && (isConnected || Boolean(error));
  const stateClass = isConnected
    ? "settings__state--ok"
    : errorState === "Offline" || errorState === "Error"
    ? "settings__state--bad"
    : provider.available || !isConnected
    ? "settings__state--warn"
    : "";

  return (
    <div className="settings__row">
      <ProviderLogo label={provider.label} provider={provider.id} />
      <div className="settings__provider-copy">
        <div className="settings__provider-name">{provider.label}</div>
        <div className="settings__provider-meta">
          {plan ? `${provider.authLabel} · ${plan}` : provider.authLabel}
        </div>
        {!isConnected && error ? (
          <div className="settings__error">
            {providerErrorTitle(error.message)} · {providerErrorDetail(provider.id, error.message)}
          </div>
        ) : null}
      </div>
      <div className="settings__provider-action">
        {showState ? (
          <span className={`settings__state ${stateClass}`}>{state}</span>
        ) : (
          <ConnectAction
            providerId={provider.id}
            isConnected={isConnected}
            command={provider.command}
            connectUrl={provider.connectUrl}
            actionLabel={provider.actionLabel}
            providerLabel={provider.label}
          />
        )}
      </div>
    </div>
  );
}

function ConnectAction({
  providerId,
  isConnected,
  command,
  connectUrl,
  actionLabel,
  providerLabel,
}: {
  providerId: string;
  isConnected: boolean;
  command: string | null;
  connectUrl: string | null;
  actionLabel: string;
  providerLabel: string;
}) {
  if (isConnected || (!command && !connectUrl)) return null;

  return (
    <div className="settings__connect">
      <button
        className="settings__connect-btn"
        onClick={() => {
          if (command) {
            openProviderCommand(providerId, command);
            return;
          }
          if (connectUrl) openProviderLogin(connectUrl);
        }}
        title={command ? `Open ${providerLabel} login in Terminal` : `Open ${providerLabel} login`}
      >
        {actionLabel}
      </button>
    </div>
  );
}

function openProviderCommand(providerId: string, command: string) {
  invoke("open_provider_login", { provider: providerId }).catch(() => {
    navigator.clipboard?.writeText(command).catch(() => {});
  });
}

function openProviderLogin(url: string) {
  openUrl(url).catch(() => {
    window.open(url, "_blank", "noopener,noreferrer");
  });
}
