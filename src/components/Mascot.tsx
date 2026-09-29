import { useEffect, useState } from "react";
import {
  MASCOT_FRAME_COUNT,
  mascotFrame,
  type MascotId,
  type MascotMood,
  type MascotStyle,
} from "../lib/mascots";

const FRAME_MS = 300;

interface Props {
  id: MascotId;
  mood: MascotMood;
  style: MascotStyle;
  /** Rendered height in CSS pixels; width follows the frame's aspect ratio. */
  height: number;
  animate?: boolean;
  title?: string;
}

export function Mascot({ id, mood, style, height, animate = true, title }: Props) {
  const frame = useFrame(animate);

  // Warm the cache so the frame swap never flashes an empty image.
  useEffect(() => {
    for (let i = 0; i < MASCOT_FRAME_COUNT; i++) new Image().src = mascotFrame(style, id, mood, i);
  }, [id, mood, style]);

  return (
    <img
      className={`mascot mascot--${style}`}
      src={mascotFrame(style, id, mood, frame)}
      style={{ height }}
      alt={title ?? ""}
      title={title}
      aria-hidden={title ? undefined : true}
      draggable={false}
    />
  );
}

// Choppy two-frame loop. Stops for reduced motion and while the panel is hidden.
function useFrame(animate: boolean): number {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!animate) return;
    const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let timer: number | undefined;

    const sync = () => {
      window.clearInterval(timer);
      timer = undefined;
      if (document.hidden || motion?.matches) {
        setFrame(0);
        return;
      }
      timer = window.setInterval(() => setFrame((current) => (current + 1) % MASCOT_FRAME_COUNT), FRAME_MS);
    };

    sync();
    document.addEventListener("visibilitychange", sync);
    motion?.addEventListener?.("change", sync);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", sync);
      motion?.removeEventListener?.("change", sync);
    };
  }, [animate]);

  return frame;
}
