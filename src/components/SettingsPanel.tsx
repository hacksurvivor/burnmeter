import type { UsageData, UsageError } from "../types/usage";
import {
  providerErrorDetail,
  providerErrorState,
  providerErrorTitle,
} from "../lib/usageErrors";
import { ProviderLogo } from "./ProviderLogo";

type ProviderConfig = {
  id: string;
  label: string;
  authLabel: string;
  command: string | null;
  available: boolean;
};

const PROVIDERS: ProviderConfig[] = [
  {
    id: "claude",
    label: "Claude",
    authLabel: "OAuth subscription",
    command: "claude login",
    available: true,
  },
  {
    id: "codex",
    label: "Codex",
    authLabel: "ChatGPT subscription",
    command: "codex login",
    available: true,
  },
  {
    id: "gemini",
    label: "Gemini",
    authLabel: "Google subscription",
    command: null,
    available: false,
  },
  {
    id: "grok",
    label: "Grok",
    authLabel: "xAI subscription",
    command: null,
    available: false,
  },
  {
    id: "cursor",
    label: "Cursor",
    authLabel: "Cursor subscription",
    command: null,
    available: false,
  },
  {
    id: "kimi",
    label: "Kimi K2",
    authLabel: "Moonshot AI subscription",
    command: null,
    available: false,
  },
  {
    id: "glm",
    label: "GLM",
    authLabel: "Z.ai subscription",
    command: null,
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
  const state = provider.available
    ? isConnected
      ? "Connected"
      : errorState ?? "Needs login"
    : "Planned";
  const stateClass = isConnected
    ? "settings__state--ok"
    : errorState === "Offline" || errorState === "Error"
    ? "settings__state--bad"
    : provider.available
    ? "settings__state--warn"
    : "";

  return (
    <div className="settings__row">
      <div className="settings__provider">
        <div className="settings__provider-name">
          <ProviderLogo label={provider.label} provider={provider.id} />
          <span>{provider.label}</span>
          <span className={`settings__state ${stateClass}`}>{state}</span>
        </div>
        <div className="settings__provider-meta">
          {plan ? `${provider.authLabel} · ${plan}` : provider.authLabel}
        </div>
        <ConnectAction isConnected={isConnected} command={provider.command} />
        {!isConnected && error ? (
          <div className="settings__error">
            {providerErrorTitle(error.message)} · {providerErrorDetail(provider.id, error.message)}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ConnectAction({
  isConnected,
  command,
}: {
  isConnected: boolean;
  command: string | null;
}) {
  if (isConnected || !command) return null;

  return (
    <div className="settings__connect">
      <code className="settings__command">{command}</code>
      <button className="settings__connect-btn" onClick={() => copyCommand(command)}>
        Connect
      </button>
    </div>
  );
}

function copyCommand(command: string) {
  navigator.clipboard?.writeText(command).catch(() => {});
}
