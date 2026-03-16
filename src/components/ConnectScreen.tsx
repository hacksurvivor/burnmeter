interface ConnectScreenProps {
  onRetry: () => void;
}

export function ConnectScreen({ onRetry }: ConnectScreenProps) {
  return (
    <div className="connect-screen crt crt--flicker">
      <pre className="connect-screen__box glow-orange">
{`╔══════════════════════════════════╗
║  CONNECT TO CLAUDE               ║
║                                  ║
║  Run in your terminal:           ║
║                                  ║
║  $ claude login                  ║
║                                  ║
╚══════════════════════════════════╝`}
      </pre>
      <button className="connect-screen__retry" onClick={onRetry}>
        [ Retry ]
      </button>
    </div>
  );
}
