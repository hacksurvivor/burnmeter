import { useEffect, useRef } from "react";
import { FireSim, letterHeat } from "../lib/fire";
import "../styles/wordmark.css";

const FIRE_COLS = 71;
const FIRE_ROWS = 20;
const FRAME_MS = 88;
const WARMUP_STEPS = 40;

interface Props {
  /** Tightest remaining limit in percent; null while usage is loading. */
  remainingPct: number | null;
}

/** BURNMETER with pixel fire rising off it; the fire grows as the tightest limit is used up. */
export function BurnWordmark({ remainingPct }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<FireSim | null>(null);
  const used = remainingPct === null ? 0 : Math.min(1, Math.max(0, 1 - remainingPct / 100));
  const out = remainingPct !== null && remainingPct <= 0;

  useEffect(() => {
    const sim = (simRef.current ??= new FireSim(FIRE_COLS, FIRE_ROWS));
    sim.used = used;
    sim.out = out;
  }, [used, out]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const sim = (simRef.current ??= new FireSim(FIRE_COLS, FIRE_ROWS));
    const image = ctx.createImageData(FIRE_COLS, FIRE_ROWS);
    const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let timer: number | undefined;

    const frame = () => {
      sim.step();
      sim.paint(image);
      ctx.putImageData(image, 0, 0);
    };
    const sync = () => {
      window.clearInterval(timer);
      timer = undefined;
      if (motion?.matches) {
        for (let i = 0; i < WARMUP_STEPS; i++) sim.step();
        sim.paint(image);
        ctx.putImageData(image, 0, 0);
        return;
      }
      if (!document.hidden) timer = window.setInterval(frame, FRAME_MS);
    };

    for (let i = 0; i < WARMUP_STEPS; i++) sim.step();
    sync();
    document.addEventListener("visibilitychange", sync);
    motion?.addEventListener?.("change", sync);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", sync);
      motion?.removeEventListener?.("change", sync);
    };
  }, []);

  return (
    <div
      className={`burnmark${out ? " burnmark--out" : ""}`}
      style={{
        ["--heat" as string]: letterHeat(used),
        ["--glow" as string]: out || used === 0 ? "transparent" : `rgba(255,110,30,${(0.15 + used * 0.55).toFixed(2)})`,
      }}
    >
      <canvas ref={canvasRef} className="burnmark__fire" width={FIRE_COLS} height={FIRE_ROWS} aria-hidden="true" />
      <span className="burnmark__text">Burnmeter</span>
    </div>
  );
}
