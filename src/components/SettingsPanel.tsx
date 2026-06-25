import { openUrl } from "@tauri-apps/plugin-opener";
import type { UsageData, UsageError } from "../types/usage";
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
  available: boolean;
};

export const PROVIDERS: ProviderConfig[] = [
  {
    id: "claude",
    label: "Claude",
    authLabel: "OAuth subscription",
    command: "claude login",
    connectUrl: null,
    available: true,
  },
  {
    id: "codex",
    label: "Codex",
    authLabel: "ChatGPT subscription",
    command: "codex login",
    connectUrl: null,
    available: true,
  },
  {
    id: "gemini",
    label: "Gemini",
    authLabel: "Google subscription",
    command: null,
    connectUrl: "https://gemini.google.com/",
    available: false,
  },
  {
    id: "grok",
    label: "Grok",
    authLabel: "xAI subscription",
    command: null,
    connectUrl: "https://grok.com/",
    available: false,
  },
  {
    id: "cursor",
    label: "Cursor",
    authLabel: "Cursor subscription",
    command: null,
    connectUrl: "https://cursor.com/",
    available: false,
  },
  {
    id: "kimi",
    label: "Kimi K2",
    authLabel: "Moonshot AI subscription",
    command: null,
    connectUrl: "https://www.kimi.com/en",
    available: false,
  },
  {
    id: "glm",
    label: "GLM",
    authLabel: "Z.ai subscription",
    command: null,
    connectUrl: "https://z.ai/chat",
    available: false,
  },
];

interface Props {
  usage: UsageData | null;
  onClose: () => void;
}

export function SettingsPanel({ usage, onClose }: Props) {
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
  const showState = state !== "Connect" && (isConnected || Boolean(error));
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
            isConnected={isConnected}
            command={provider.command}
            connectUrl={provider.connectUrl}
            providerLabel={provider.label}
          />
        )}
      </div>
    </div>
  );
}

function ConnectAction({
  isConnected,
  command,
  connectUrl,
  providerLabel,
}: {
  isConnected: boolean;
  command: string | null;
  connectUrl: string | null;
  providerLabel: string;
}) {
  if (isConnected || (!command && !connectUrl)) return null;

  return (
    <div className="settings__connect">
      {command ? <code className="settings__command">{command}</code> : null}
      <button
        className="settings__connect-btn"
        onClick={() => {
          if (command) {
            copyCommand(command);
            return;
          }
          if (connectUrl) openProviderLogin(connectUrl);
        }}
        title={command ? `Copy ${providerLabel} login command` : `Open ${providerLabel} login`}
      >
        Connect
      </button>
    </div>
  );
}

function copyCommand(command: string) {
  navigator.clipboard?.writeText(command).catch(() => {});
}

function openProviderLogin(url: string) {
  openUrl(url).catch(() => {
    window.open(url, "_blank", "noopener,noreferrer");
  });
}
