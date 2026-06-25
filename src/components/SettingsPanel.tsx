import { openUrl } from "@tauri-apps/plugin-opener";
import { invoke } from "@tauri-apps/api/core";
import type { UpdateInfo, UsageData, UsageError } from "../types/usage";
import {
  providerErrorDetail,
  providerErrorState,
  providerErrorTitle,
} from "../lib/usageErrors";
import { ProviderLogo } from "./ProviderLogo";

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
    authLabel: "OAuth subscription",
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
  openWhenProviderStarts: boolean;
  onLaunchAtLoginChange: (enabled: boolean) => Promise<void>;
  onOpenWhenProviderStartsChange: (enabled: boolean) => void;
  onClose: () => void;
}

export function SettingsPanel({
  usage,
  updateInfo,
  updateError,
  launchAtLogin,
  launchSettingsError,
  openWhenProviderStarts,
  onLaunchAtLoginChange,
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
    <aside className="settings" role="dialog" aria-label="Provider settings">
      <div className="settings__grabber" aria-hidden="true" />
      <div className="settings__head">
        <div>
          <div className="settings__title">Providers</div>
          <div className="settings__sub">OAuth and subscription accounts</div>
        </div>
        <button className="settings__close" onClick={onClose} aria-label="Close settings">
          ×
        </button>
      </div>

      <UpdateRow updateInfo={updateInfo} updateError={updateError} />

      <LaunchOptions
        launchAtLogin={launchAtLogin}
        launchSettingsError={launchSettingsError}
        openWhenProviderStarts={openWhenProviderStarts}
        onLaunchAtLoginChange={onLaunchAtLoginChange}
        onOpenWhenProviderStartsChange={onOpenWhenProviderStartsChange}
      />

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
    </aside>
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
      : `v${updateInfo.current_version} installed`
    : updateError
    ? "Update check failed"
    : "Checking for updates";
  const detail = updateInfo?.available
    ? updateInfo.asset_name ?? "Installer ready"
    : updateInfo
    ? "Burnmeter is up to date"
    : updateError ?? "Looking for the latest release";

  return (
    <div className={`settings__update${updateInfo?.available ? " settings__update--available" : ""}`}>
      <div>
        <div className="settings__update-title">Updates</div>
        <div className="settings__update-status">{status}</div>
        <div className="settings__update-detail">{detail}</div>
      </div>
      <button
        className="settings__connect-btn settings__update-btn"
        type="button"
        disabled={!updateInfo?.available && !updateError}
        onClick={() => openProviderLogin(targetUrl)}
      >
        {updateInfo?.available ? "Update" : updateError ? "Open releases" : "Current"}
      </button>
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
