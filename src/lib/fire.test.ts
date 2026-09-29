import { describe, expect, it } from "vitest";
import { FireSim, letterHeat } from "./fire";

// Deterministic randomness so flame heights are stable across runs.
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function burn(used: number, out = false) {
  const sim = new FireSim(71, 20, seeded(7));
  sim.used = used;
  sim.out = out;
  let tallest = 0;
  for (let i = 0; i < 80; i++) {
    sim.step();
    if (i > 40) tallest = Math.max(tallest, sim.flameHeight());
  }
  return tallest;
}

describe("FireSim", () => {
  it("stays unlit while nothing is used", () => {
    expect(burn(0)).toBe(0);
  });

  it("burns taller as more of the limit is used", () => {
    const low = burn(0.3);
    const high = burn(0.9);
    expect(low).toBeGreaterThan(0);
    expect(high).toBeGreaterThan(low);
  });

  it("dies down to embers when the limit is spent", () => {
    expect(burn(1, true)).toBeLessThan(burn(0.3));
  });
});

describe("letterHeat", () => {
  it("heats letters from cream to orange", () => {
    expect(letterHeat(0)).toBe("rgb(250,249,245)");
    expect(letterHeat(1)).toBe("rgb(255,150,60)");
  });
});
