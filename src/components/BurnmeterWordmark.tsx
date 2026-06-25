const LETTERS = "BURNMETER".split("");

export function BurnmeterWordmark() {
  return (
    <div className="wordmark" aria-label="Burnmeter" role="img">
      <span className="wordmark__letters" aria-hidden="true">
        {LETTERS.map((letter, index) => (
          <span className="wordmark__letter" data-letter={letter} key={`${letter}-${index}`}>
            {letter}
          </span>
        ))}
      </span>
    </div>
  );
}
