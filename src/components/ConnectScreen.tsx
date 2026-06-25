interface ConnectScreenProps {
  onRetry: () => void;
}

export function ConnectScreen({ onRetry }: ConnectScreenProps) {
  return (
    <div className="connect-screen crt crt--flicker">
      <pre className="connect-screen__box glow-orange">
{`╔══════════════════════════════════╗
║  CONNECT A PROVIDER              ║
║                                  ║
║  Run one of these commands:      ║
║                                  ║
║  $ claude login                  ║
║  $ codex login                   ║
║                                  ║
╚══════════════════════════════════╝`}
      </pre>
      <button className="connect-screen__retry" onClick={onRetry}>
        [ Retry ]
      </button>
    </div>
  );
}
