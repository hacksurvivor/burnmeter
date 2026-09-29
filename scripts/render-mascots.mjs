#!/usr/bin/env node
// Regenerates src/assets/mascots/*.png from the voxel models in scripts/mascots/models.js.
// Needs Google Chrome (override with CHROME_PATH) and network access for three.js from cdnjs.
// Usage: pnpm mascots:render
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const page = pathToFileURL(join(root, "scripts/mascots/render.html")).href;
const outDir = join(root, "src/assets/mascots");
const chrome = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const dom = execFileSync(chrome, [
  "--headless=new",
  "--use-angle=swiftshader",
  "--enable-unsafe-swiftshader",
  "--allow-file-access-from-files",
  "--virtual-time-budget=20000",
  "--dump-dom",
  page,
], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });

const json = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/)?.[1];
if (!json) throw new Error("Renderer produced no output. Is three.js reachable?");
const files = JSON.parse(json.replace(/&quot;/g, '"').replace(/&amp;/g, "&"));

mkdirSync(outDir, { recursive: true });
for (const name of readdirSync(outDir)) if (name.endsWith(".png")) rmSync(join(outDir, name));
for (const [name, dataUrl] of Object.entries(files)) {
  writeFileSync(join(outDir, name), Buffer.from(dataUrl.split(",")[1], "base64"));
}
console.log(`Wrote ${Object.keys(files).length} mascot frames to src/assets/mascots`);
