// Doom-style pixel fire: heat rises from the bottom row, drifting sideways and cooling as it goes.

type Rgba = readonly [number, number, number, number];

/** Black → red → orange → yellow → white, transparent at the cold end. */
export const FIRE_PALETTE: readonly Rgba[] = [
  [7, 7, 7, 0], [31, 7, 7, 70], [47, 15, 7, 120], [71, 15, 7, 160], [87, 23, 7, 190], [103, 31, 7, 210],
  [119, 31, 7, 225], [143, 39, 7, 235], [159, 47, 7, 245], [175, 63, 7, 255], [191, 71, 7, 255], [199, 71, 7, 255],
  [223, 79, 7, 255], [223, 87, 7, 255], [223, 87, 7, 255], [215, 95, 7, 255], [215, 103, 15, 255], [207, 111, 15, 255],
  [207, 119, 15, 255], [207, 127, 15, 255], [207, 135, 23, 255], [199, 135, 23, 255], [199, 143, 23, 255], [199, 151, 31, 255],
  [191, 159, 31, 255], [191, 159, 31, 255], [191, 167, 39, 255], [191, 167, 39, 255], [191, 175, 47, 255], [183, 175, 47, 255],
  [183, 183, 47, 255], [183, 183, 55, 255], [207, 207, 111, 255], [223, 223, 159, 255], [239, 239, 199, 255], [255, 255, 255, 255],
];
const MAX_HEAT = FIRE_PALETTE.length - 1;

export class FireSim {
  readonly heat: Uint8Array;
  /** Share of the limit used, 0–1. Drives how hot and tall the flames get. */
  used = 0;
  /** Limit spent: the fire dies down to stray embers. */
  out = false;
  private readonly columnHeat: number[];

  constructor(readonly width: number, readonly height: number, private readonly random: () => number = Math.random) {
    this.heat = new Uint8Array(width * height);
    this.columnHeat = Array.from({ length: width }, () => random());
  }

  step() {
    this.seed();
    const { width: w, height: h, heat } = this;
    // Cooling per row is picked so flames top out near a usage-based target height.
    const target = this.out ? 2 : 2.5 + this.used * (h - 4);
    const cool = (2 * MAX_HEAT * 0.8) / target;
    for (let y = 1; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const src = y * w + x;
        const r = this.random();
        const dst = src - w - Math.floor(r * 3) + 1;
        if (dst >= 0) heat[dst] = Math.max(0, heat[src]! - Math.floor(r * cool));
      }
    }
  }

  /** Highest row (counted from the bottom) that currently holds any heat. */
  flameHeight(): number {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) if (this.heat[y * this.width + x]) return this.height - y;
    }
    return 0;
  }

  paint(image: ImageData) {
    const data = image.data;
    for (let i = 0; i < this.heat.length; i++) {
      const [r, g, b, a] = FIRE_PALETTE[this.heat[i]!]!;
      data[i * 4] = r;
      data[i * 4 + 1] = g;
      data[i * 4 + 2] = b;
      data[i * 4 + 3] = this.heat[i] ? a : 0;
    }
  }

  private seed() {
    const { width: w, height: h, heat, columnHeat } = this;
    const bottom = (h - 1) * w;
    for (let x = 0; x < w; x++) {
      columnHeat[x] = Math.min(1, Math.max(0, columnHeat[x]! + (this.random() - 0.5) * 0.35));
      const inset = Math.min(1, Math.min(x - 4, w - 5 - x) / 5);          // taper at the word's ends
      if (this.out) {
        heat[bottom + x] = this.random() < 0.05 ? 7 : 0;
      } else if (inset <= 0 || this.used <= 0) {
        heat[bottom + x] = 0;
      } else {
        heat[bottom + x] = Math.round(MAX_HEAT * inset * (0.45 + 0.55 * columnHeat[x]!) * (0.55 + 0.45 * Math.min(1, this.used * 1.6)));
      }
    }
  }
}

/** Letter color heating from cream toward hot orange as the limit is used. */
export function letterHeat(used: number): string {
  const stops = [[250, 249, 245], [255, 214, 150], [255, 150, 60]] as const;
  const t = Math.min(1, Math.max(0, used)) * 2;
  const i = Math.min(1, Math.floor(t));
  const f = t - i;
  const a = stops[i]!, b = stops[i + 1]!;
  return `rgb(${a.map((v, k) => Math.round(v + (b[k]! - v) * f)).join(",")})`;
}
