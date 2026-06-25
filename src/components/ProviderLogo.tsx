import claudeLogo from "../assets/provider-logos/claude.svg";
import codexLogo from "../assets/provider-logos/codex.svg";

interface Props {
  provider: string;
  label: string;
}

const LOGOS: Record<string, string> = {
  claude: claudeLogo,
  codex: codexLogo,
};

export function ProviderLogo({ provider, label }: Props) {
  const logo = LOGOS[provider];

  if (logo) {
    return (
      <img
        alt=""
        aria-hidden="true"
        className={`provider-logo provider-logo--${provider}`}
        src={logo}
      />
    );
  }

  return (
    <span aria-hidden="true" className="provider-logo provider-logo--fallback">
      {label.slice(0, 1)}
    </span>
  );
}
