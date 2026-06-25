import claudeLogo from "../assets/provider-logos/claude.svg";
import codexLogo from "../assets/provider-logos/codex.svg";
import cursorLogo from "../assets/provider-logos/cursor.svg";
import geminiLogo from "../assets/provider-logos/gemini.svg";
import glmLogo from "../assets/provider-logos/glm.svg";
import grokLogo from "../assets/provider-logos/grok.svg";
import kimiLogo from "../assets/provider-logos/kimi.svg";

interface Props {
  provider: string;
  label: string;
}

const LOGOS: Record<string, string> = {
  claude: claudeLogo,
  codex: codexLogo,
  cursor: cursorLogo,
  gemini: geminiLogo,
  glm: glmLogo,
  grok: grokLogo,
  kimi: kimiLogo,
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
