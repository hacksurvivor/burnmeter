// Voxel modeling kit + three Burnmeter mascots (match, dev, wallet) in three moods.
// Grid: x → right, y → up, z → toward the viewer. Front of the scene is high z.
(function () {
  const W = 32, H = 40, D = 22;

  // ── Grid ──
  function model() { return { c: new Array(W * H * D).fill(null), e: new Uint8Array(W * H * D) }; }
  const idx = (x, y, z) => x + W * (y + H * z);
  const inside = (x, y, z) => x >= 0 && x < W && y >= 0 && y < H && z >= 0 && z < D;
  function set(m, x, y, z, col, emissive = 0) { if (inside(x, y, z) && col) { m.c[idx(x, y, z)] = col; m.e[idx(x, y, z)] = emissive; } }
  function clear(m, x, y, z) { if (inside(x, y, z)) m.c[idx(x, y, z)] = null; }
  function get(m, x, y, z) { return inside(x, y, z) ? m.c[idx(x, y, z)] : null; }

  // ── Noise & color ──
  function hash(x, y, z, s = 0) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1442695041) ^ Math.imul(s | 0, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  function rgb(hex) { const n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function hex(r, g, b) { return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join(""); }
  function shade(h, f) { const [r, g, b] = rgb(h); return f >= 0 ? hex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f) : hex(r * (1 + f), g * (1 + f), b * (1 + f)); }
  function mixc(a, b, t) { const A = rgb(a), B = rgb(b); return hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }

  // ── Materials: (x, y, z) → color ──
  const flat = (c) => () => c;
  const speckle = (c, amt = 0.08, seed = 1) => (x, y, z) => shade(c, (hash(x, y, z, seed) - 0.5) * amt * 2);
  const wood = (x, y, z) => {
    const ring = Math.sin((x * 1.7 + z * 1.1) + Math.floor(y / 4) * 0.9 + hash(x, 0, z, 7) * 2);
    return ring > 0.55 ? "#c98f4b" : hash(x, y, z, 3) > 0.85 ? "#e6b572" : "#dca464";
  };
  const deskWood = (x, y, z) => ((x + Math.floor(z / 3)) % 7 === 0 ? "#6e4424" : hash(x, y, z, 5) > 0.8 ? "#8f5c33" : "#83532d");
  const leather = (x, y, z) => { const n = hash(x, y, z, 11); return n > 0.94 ? "#86461f" : "#914f26"; };
  const charred = (f) => (x, y, z) => { const n = hash(x, y, z, 13); return n > 0.93 ? (hash(x, y, z, f + 20) > 0.5 ? "#ff6a1c" : "#ffb347") : n > 0.6 ? "#2a1f1a" : "#1d1512"; };
  const ash = (x, y, z) => { const n = hash(x, y, z, 17); return n > 0.8 ? "#a39e98" : n < 0.25 ? "#6f6a65" : "#8a8580"; };
  const matchRed = (x, y, z) => { const n = hash(x, y, z, 19); return n > 0.86 ? "#f0624a" : n < 0.12 ? "#b52a1c" : "#d93a28"; };
  const hoodie = speckle("#3f63d9", 0.05, 23);
  const skin = speckle("#f0c39b", 0.03, 29);
  const bone = (x, y, z) => { const n = hash(x, y, z, 31); return n > 0.9 ? "#fffaf0" : n < 0.1 ? "#d9cfb6" : "#efe6cf"; };
  const hair = (x, y, z) => (hash(x, y, z, 37) > 0.7 ? "#4a3326" : "#35241a");
  const cash = (x, y, z) => (hash(x, y, z, 41) > 0.85 ? "#9fe0a8" : "#6cc27a");
  const gold = (x, y, z) => (hash(x, y, z, 43) > 0.8 ? "#ffe680" : "#f2c230");

  // ── Primitives (inclusive integer bounds; tests at voxel centers) ──
  function box(m, x0, y0, z0, x1, y1, z1, mat, em = 0) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) set(m, x, y, z, mat(x, y, z), em);
  }
  function rbox(m, x0, y0, z0, x1, y1, z1, r, mat) {
    const cx = (x0 + x1 + 1) / 2, cy = (y0 + y1 + 1) / 2, cz = (z0 + z1 + 1) / 2;
    const hx = (x1 - x0 + 1) / 2 - r, hy = (y1 - y0 + 1) / 2 - r, hz = (z1 - z0 + 1) / 2 - r;
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
      const dx = Math.max(Math.abs(x + 0.5 - cx) - hx, 0), dy = Math.max(Math.abs(y + 0.5 - cy) - hy, 0), dz = Math.max(Math.abs(z + 0.5 - cz) - hz, 0);
      if (dx * dx + dy * dy + dz * dz <= r * r + 0.01) set(m, x, y, z, mat(x, y, z));
    }
  }
  function ell(m, cx, cy, cz, rx, ry, rz, mat, em = 0) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
        for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) {
          const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, dz = (z + 0.5 - cz) / rz;
          if (dx * dx + dy * dy + dz * dz <= 1) set(m, x, y, z, mat(x, y, z), em);
        }
  }
  function cyl(m, cx, cz, y0, y1, r, mat) {
    for (let y = y0; y <= y1; y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) {
      const dx = x + 0.5 - cx, dz = z + 0.5 - cz;
      if (dx * dx + dz * dz <= r * r) set(m, x, y, z, mat(x, y, z));
    }
  }
  function line(m, a, b, mat, t = 0) {
    const n = Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2]))) * 2 + 1;
    for (let i = 0; i <= n; i++) {
      const x = a[0] + (b[0] - a[0]) * i / n, y = a[1] + (b[1] - a[1]) * i / n, z = a[2] + (b[2] - a[2]) * i / n;
      for (let ox = -t; ox <= t; ox++) for (let oy = -t; oy <= t; oy++) set(m, Math.round(x + ox), Math.round(y + oy), Math.round(z), mat(Math.round(x), Math.round(y), Math.round(z)));
    }
  }
  // Paint a 2D stamp onto the front-most surface. Rows run top-down from yTop.
  // "_" carves a 2-deep hole; other characters look up the palette.
  function decal(m, x0, yTop, rows, pal, carve = 2) {
    rows.forEach((row, r) => [...row].forEach((ch, i) => {
      if (ch === ".") return;
      const x = x0 + i, y = yTop - r;
      let z = D - 1;
      while (z >= 0 && !get(m, x, y, z)) z--;
      if (z < 0) return;
      if (ch === "_") { for (let k = 0; k < carve; k++) clear(m, x, y, z - k); set(m, x, y, z - carve, "#0c0a09"); return; }
      set(m, x, y, z, pal[ch]);
    }));
  }

  // ── Effects ──
  function flame(m, cx, by, cz, h, r, f, lean = 0) {
    for (let y = by; y < by + h; y++) {
      const t = (y - by) / h;
      const wx = Math.sin(t * 4.2 + f * 1.9) * t * 1.7 + lean * t * t * 3;
      const wz = Math.cos(t * 3.1 + f * 1.3) * t * 0.9;
      const rad = r * Math.pow(1 - t, 0.72) * (0.86 + 0.28 * hash(0, y, 0, f + 3));
      for (let x = Math.floor(cx - r - 3); x <= Math.ceil(cx + r + 3); x++) for (let z = Math.floor(cz - r - 2); z <= Math.ceil(cz + r + 2); z++) {
        const dx = x + 0.5 - (cx + wx), dz = z + 0.5 - (cz + wz);
        const d = Math.sqrt(dx * dx + dz * dz) / Math.max(rad, 0.01);
        if (d > 1) continue;
        if (d > 0.55 && hash(x, y, z, f + 9) < t * 0.55) continue;   // ragged tips
        const heat = (1 - d) * 0.55 + (1 - t) * 0.65;
        const col = heat > 0.98 ? "#fffbe6" : heat > 0.8 ? "#ffe066" : heat > 0.58 ? "#ffab1f" : heat > 0.36 ? "#ff6a1a" : "#d6331a";
        set(m, x, y, z, col, 1);
      }
    }
    for (let i = 0; i < 3; i++) {   // embers drifting up
      const rise = (f * 3 + i * 5) % 9;
      set(m, Math.round(cx + (hash(i, 0, 0, 51) - 0.5) * r * 2.4), by + h + rise - 3, Math.round(cz), rise > 5 ? "#ff8a1c" : "#ffd23f", 1);
    }
  }
  function smoke(m, cx, by, cz, f, puffs = 4, drift = 1) {
    for (let i = 0; i < puffs; i++) {
      const k = (i * 4 + f * 2) % (puffs * 4);
      const y = by + k, r = 1.1 + k * 0.12;
      ell(m, cx + Math.sin(k * 0.7 + i) * drift, y, cz, r, r * 0.9, r, (x, yy, z) => (hash(x, yy, z, 61) > 0.5 ? "#9aa1a8" : "#7d848b"));
    }
  }
  function sweat(m, x, y, z, f) { set(m, x, y - f, z, "#9ad8ff"); set(m, x, y - f - 1, z, "#5fb6f2"); }

  // ── Characters ──
  const INK = "#161210", WHITE = "#fbf8f0";

  const match = {
    plenty(m, f) {
      box(m, 14, 4, 8, 17, 22, 11, wood);
      ell(m, 15.9, 27.5, 9.9, 5.6, 6.6, 5.1, matchRed);
      line(m, [14, 15, 10], [11, 12, 10], wood); line(m, [11, 12, 10], [12, 10, 10], wood);        // hand on hip
      line(m, [17, 16, 10], [20, 19, 10], wood); line(m, [20, 19, 10], [21, 22 + f, 10], wood);    // wave
      box(m, 14, 0, 9, 14, 3, 10, wood); box(m, 17, 0, 9, 17, 3, 10, wood);
      box(m, 12, 0, 9, 14, 0, 11, flat("#2b2320")); box(m, 17, 0, 9, 19, 0, 11, flat("#2b2320"));
      decal(m, 12, 31, [
        "xx....x.",
        "......xx",
        "WW....WW",
        "Wx....Wx",
        "........",
        "....x...",
        ".xxxx...",
      ], { x: INK, W: WHITE });
    },
    low(m, f) {
      box(m, 14, 4, 8, 17, 20, 11, (x, y, z) => (y > 16 ? charred(f)(x, y, z) : wood(x, y, z)));
      ell(m, 15.9, 26, 9.9, 5.4, 6.2, 5, charred(f));
      flame(m, 15.9, 31, 9.9, 12, 4.8, f);
      line(m, [14, 16, 10], [10, 20, 10], wood); line(m, [17, 16, 10], [21, 21, 10], wood);          // arms up in panic
      box(m, 14, 0, 9, 14, 3, 10, wood); box(m, 17, 0, 9, 17, 3, 10, wood);
      box(m, 12, 0, 9, 14, 0, 11, flat("#2b2320")); box(m, 17, 0, 9, 19, 0, 11, flat("#2b2320"));
      decal(m, 12, 29, [
        "WWW..WWW",
        "WxW..WxW",
        "WWW..WWW",
        "........",
        "...xxx..",
        "..xRRRx.",
        "...xxx..",
      ], { x: INK, W: WHITE, R: "#e8401c" });
      sweat(m, 21, 27, 12, f);
      sweat(m, 10, 25, 12, 1 - f);
    },
    out(m, f) {
      ell(m, 16, 1.2, 10, 8.5, 1.6, 6, ash);                                                          // ash pile
      box(m, 14, 2, 8, 17, 13, 11, charred(f));
      ell(m, 15.9, 17, 9.9, 4.8, 4.8, 4.4, ash);
      for (let i = 0; i < 7; i++) clear(m, 11 + Math.floor(hash(i, 0, 0, 71) * 10), 20 + Math.floor(hash(i, 1, 0, 71) * 2), 8 + Math.floor(hash(i, 2, 0, 71) * 4));
      line(m, [14, 10, 10], [12, 5, 11], charred(f)); line(m, [17, 10, 10], [19, 5, 11], charred(f));
      decal(m, 12, 19, [
        "x.x..x.x",
        ".x....x.",
        "x.x..x.x",
        "........",
        "..xxxx..",
      ], { x: INK });
      smoke(m, 16, 22, 10, f, 4, 1.3);
    },
  };

  function desk(m, extras) {
    box(m, 1, 0, 2, 30, 8, 18, (x, y, z) => (y === 8 ? deskWood(x, y, z) : z === 18 ? "#6b4226" : "#5c381f"));
    box(m, 1, 8, 18, 30, 8, 18, flat("#94623a"));                               // front lip highlight
    if (extras) extras();
  }
  function laptop(m, sticker = true) {
    box(m, 8, 9, 12, 23, 9, 17, flat("#4a525b"));                               // base on desk
    box(m, 8, 10, 12, 23, 17, 12, (x, y) => (y === 17 || x === 8 || x === 23 ? "#3a4148" : "#58616b")); // lid back
    if (sticker) decal(m, 13, 15, [
      "..OO..",
      ".OYYO.",
      "OYWWYO",
      ".OYYO.",
    ], { O: "#ff6a1a", Y: "#ffd23f", W: "#fff6d6" });
  }
  function mug(m, f, { steam = false, mold = false, tipped = false } = {}) {
    if (tipped) {
      for (let x = 23; x <= 28; x++) for (let y = 10; y <= 12; y++) for (let z = 13; z <= 16; z++) {
        const dy = y - 11, dz = z - 14.5; if (dy * dy + dz * dz * 0.6 <= 3) set(m, x, y, z, "#e9e4d8");
      }
      box(m, 20, 9, 13, 30, 9, 17, (x, y, z) => (hash(x, y, z, 81) > 0.4 && (x - 25) ** 2 + (z - 15) ** 2 < 12 ? "#5a3719" : null));
      return;
    }
    cyl(m, 26.5, 15, 9, 14, 2.3, (x, y) => (y === 14 ? (mold ? "#6b8f3a" : "#4a2c17") : "#e9e4d8"));
    box(m, 29, 11, 15, 29, 13, 15, flat("#d6d0c3"));
    if (steam) smoke(m, 26.5, 16, 15, f, 3, 0.6);
  }
  function plant(m, dead = false) {
    box(m, 3, 9, 13, 6, 12, 16, flat("#b5653a"));
    box(m, 3, 12, 13, 6, 12, 16, flat("#8f4a26"));
    if (dead) { line(m, [4, 13, 14], [3, 15, 15], flat("#7a5a33")); line(m, [5, 13, 14], [7, 14, 15], flat("#6b4a2a")); return; }
    for (const [x, y] of [[4, 13], [4, 14], [4, 15], [4, 16], [5, 17], [5, 13], [3, 15], [6, 16]]) set(m, x, y, 14, y > 15 ? "#6fd06a" : "#3f9a4a");
    set(m, 4, 17, 14, "#ff7ab8");
  }
  function devBody(m) {
    rbox(m, 9, 9, 5, 22, 17, 11, 2, hoodie);                                    // torso
    box(m, 13, 16, 9, 18, 17, 11, flat("#2f4fb8"));                             // hood collar
    line(m, [9, 13, 9], [9, 10, 14], hoodie, 0); line(m, [22, 13, 9], [22, 10, 14], hoodie, 0);
  }
  function devHead(m) {
    rbox(m, 10, 18, 5, 21, 28, 13, 2, skin);
    rbox(m, 9, 26, 4, 22, 31, 13, 2, hair);                                     // hair cap
    for (let x = 10; x <= 21; x++) for (let y = 18; y <= 25; y++) for (let z = 5; z <= 13; z++) if (get(m, x, y, z) && z >= 12 && y > 24) set(m, x, y, z, hair(x, y, z));
    set(m, 10, 22, 11, "#e2ad84"); set(m, 21, 22, 11, "#e2ad84");               // ears
  }

  const dev = {
    plenty(m, f) {
      desk(m); devBody(m); devHead(m); laptop(m); mug(m, f, { steam: true }); plant(m);
      decal(m, 11, 25, [
        "..........",
        "GGGGG.GGGGG",
        "GWxWG.GWxWG",
        "GGGGG.GGGGG",
        "..........",
        "....xx....",
        "...x..x...",
        "....xx....",
      ].map((r) => r.slice(0, 10)), { G: "#1c1f24", W: WHITE, x: INK });
    },
    low(m, f) {
      desk(m); devBody(m); devHead(m); laptop(m); mug(m, f, { tipped: true }); plant(m);
      flame(m, 15.5, 31, 8.5, 9, 6.5, f, 0.3);
      for (const [x, c] of [[4, "#39d353"], [7, "#ff4fa3"], [26, "#39d353"]]) cyl(m, x + 0.5, 11, 9, 13, 1.3, (xx, y) => (y === 13 ? "#c9ced4" : y === 11 ? "#15181b" : c));
      decal(m, 11, 25, [
        "GGGGG.GGGGG",
        "GWWWG.GWWWG",
        "GWxWG.GWxWG",
        "GGGGG.GGGGG",
        "..........",
        ".xxxxxxx..",
        ".xWxWxWx..",
        ".xxxxxxx..",
      ], { G: "#1c1f24", W: WHITE, x: INK });
      sweat(m, 23, 27, 11, f); sweat(m, 8, 25, 11, 1 - f);
    },
    out(m, f) {
      desk(m); devBody(m);
      rbox(m, 10, 18, 5, 21, 28, 13, 2, bone);
      rbox(m, 8, 21, 3, 23, 32, 11, 2, hoodie);                                 // hood up over the skull
      box(m, 11, 19, 12, 20, 29, 13, bone);
      decal(m, 11, 26, [
        "_____..____",
        "_____..____",
        "_____..____",
        "...........",
        "....__.....",
        "...........",
        "..x.x.x.x..",
        "..xxxxxxx..",
      ], { x: "#3a3530" }, 2);
      laptop(m); mug(m, f, { mold: true }); plant(m, true);
      for (let i = 0; i <= 6; i++) set(m, 21 + i, 28 - i, 14, "#d9dde2");      // cobweb strands
      for (let i = 0; i <= 4; i++) set(m, 23 + i, 24, 14, "#c3c8ce");
      set(m, 25, 26, 14, "#c3c8ce"); set(m, 24, 25, 14, "#c3c8ce");
    },
  };

  function walletBody(m, z0, z1, mat = leather) {
    rbox(m, 6, 5, z0, 25, 21, z1, 2, mat);
    for (let y = 6; y <= 20; y++) set(m, 15, y, z1, "#6e3717");                // fold seam
    box(m, 6, 5, z0, 25, 5, z1, flat("#5e2e12"));                               // bottom trim
    for (let x = 8; x <= 23; x += 2) { set(m, x, 19, z1, "#d6a36b"); set(m, x, 7, z1, "#d6a36b"); }   // stitching
    for (let y = 9; y <= 17; y += 2) { set(m, 8, y, z1, "#d6a36b"); set(m, 23, y, z1, "#d6a36b"); }
  }
  function walletLegs(m) {
    box(m, 10, 0, 8, 11, 4, 9, flat("#5e3519")); box(m, 20, 0, 8, 21, 4, 9, flat("#5e3519"));
    box(m, 9, 0, 8, 12, 0, 11, flat("#2b2320")); box(m, 19, 0, 8, 22, 0, 11, flat("#2b2320"));
  }
  function bills(m, count, f) {
    for (let i = 0; i < count; i++) {
      const x0 = 8 + i * 2, y0 = 20 + ((i + f) % 2), z = 8 + i;
      box(m, x0, y0, z, x0 + 13, y0 + 5, z, cash);
      decal(m, x0 + 5, y0 + 4, ["..", ".."], {});
      set(m, x0 + 6, y0 + 3, z, "#2f7a3b"); set(m, x0 + 6, y0 + 2, z, "#2f7a3b"); set(m, x0 + 7, y0 + 3, z, "#2f7a3b");
    }
  }
  function coins(m, x, n, melted = false) {
    if (melted) { ell(m, x, 0.6, 15, 3.5, 1, 2.5, gold); return; }
    for (let i = 0; i < n; i++) cyl(m, x, 15, i, i, 2.2, (xx, y, z) => (y % 2 ? "#d9a520" : gold(xx, y, z)));
  }

  const wallet = {
    plenty(m, f) {
      bills(m, 3, f); walletBody(m, 7, 12); walletLegs(m); coins(m, 28, 6);
      decal(m, 10, 16, [
        "..........MMM",
        "WWW......MWWWM",
        "WxW......MWxWM",
        "WWW.......MMM",
        "............M",
        "...x.....x..M",
        "....xxxxx...M",
      ], { W: WHITE, x: INK, M: "#ffd23f" });
    },
    low(m, f) {
      bills(m, 2, f);
      flame(m, 13, 22, 9, 10, 4.5, f); flame(m, 19, 22, 9.5, 8, 3.5, f + 1);
      walletBody(m, 8, 11); walletLegs(m); coins(m, 28, 0, true);
      set(m, 28, 12 - f, 13, "#ffd23f"); set(m, 29, 13 - f, 13, "#ffd23f"); set(m, 27, 13 - f, 13, "#ffd23f");   // monocle falling
      decal(m, 10, 16, [
        "WWW......WWW",
        "WxW......WxW",
        "WWW......WWW",
        "............",
        "....xxxx....",
        "...xRRRRx...",
        "....xxxx....",
      ], { W: WHITE, x: INK, R: "#e8401c" });
      sweat(m, 5, 19, 11, f); sweat(m, 26, 17, 11, 1 - f);
    },
    out(m, f) {
      rbox(m, 4, 0, 5, 27, 3, 16, 1, leather);                                   // flat, empty
      box(m, 6, 3, 7, 25, 3, 14, flat("#5c2f16"));
      box(m, 20, 4, 9, 23, 12, 9, (x, y) => (y % 2 === 0 ? "#f4f1ea" : "#e0dbcf"));   // receipt
      for (let y = 5; y <= 11; y += 2) set(m, 21, y, 9, "#d6331a");
      decal(m, 8, 3, ["x.x...x.x"], { x: INK });
      const wy = 16 + f * 2, wx = 13 + f;                                         // moth escaping
      box(m, wx, wy, 9, wx + 1, wy + 3, 10, flat("#6e655b"));
      set(m, wx, wy + 4, 10, "#3b342e"); set(m, wx + 1, wy + 4, 10, "#3b342e");
      set(m, wx - 1, wy + 5, 10, "#6e655b"); set(m, wx + 2, wy + 5, 10, "#6e655b");
      const up = f === 1;
      for (let i = 1; i <= 4; i++) for (let j = 0; j <= (up ? 4 - i : 2); j++) {
        const dy = up ? 1 + j : 2 - j + Math.floor(i / 2);
        set(m, wx - i, wy + dy, 9, i === 4 ? "#a79e90" : "#d4ccbd");
        set(m, wx + 1 + i, wy + dy, 9, i === 4 ? "#a79e90" : "#d4ccbd");
      }
    },
  };

  const CHARACTERS = { match, dev, wallet };
  function build(id, mood, frame) { const m = model(); CHARACTERS[id][mood](m, frame % 2); return m; }

  window.VX = { W, H, D, build, get, idx, shade, mixc, rgb };
})();
