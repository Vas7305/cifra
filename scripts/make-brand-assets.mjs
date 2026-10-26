#!/usr/bin/env node
/**
 * Render the Cifra isotype into every Android launcher icon and splash PNG.
 * Re-run after changing the mark (public/brand/):
 *
 *   node scripts/make-brand-assets.mjs
 *
 * Drives the installed Chrome or Edge headless over the DevTools protocol.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const root = join(import.meta.dirname, "..");
const res = join(root, "android/app/src/main/res");

const CYPRUS = "#004643";
const SAND = "#f0ede5";
const POINT = "#5dbba9";

// The isotype glyph on its 64-unit tile (see src/components/brand/logo.tsx).
const glyph = `<path d="M43.6 21.4A15 15 0 1 0 43.6 42.6" fill="none" stroke="${SAND}" stroke-width="8" stroke-linecap="round"/><circle cx="33" cy="32" r="5" fill="${POINT}"/>`;
const svg = (viewBox, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="100%" height="100%">${body}</svg>`;

// Adaptive-icon foreground: 108dp canvas, glyph kept inside the 66dp safe circle.
const foreground = svg("-17 -17 98 98", glyph);
// Legacy square icon, with the platform's customary transparent margin.
const legacy = svg("-4 -4 72 72", `<rect width="64" height="64" rx="15" fill="${CYPRUS}"/>${glyph}`);
const round = svg("-2 -2 68 68", `<circle cx="32" cy="32" r="32" fill="${CYPRUS}"/>${glyph}`);

const logotype = readFileSync(join(root, "public/brand/cifra-logotype.svg"), "utf8").replace(
  /<title>.*?<\/title>/,
  "",
);

function splash(w, h) {
  const size = Math.round(Math.min(w, h) * 0.24);
  return `<div style="width:${w}px;height:${h}px;background:${SAND};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${Math.round(size * 0.28)}px">
    <div style="width:${size}px;height:${size}px">${svg("0 0 64 64", `<rect width="64" height="64" rx="16" fill="${CYPRUS}"/>${glyph}`)}</div>
    <div style="height:${Math.round(size * 0.42)}px;display:flex">${logotype.replace("<svg ", '<svg height="100%" ')}</div>
  </div>`;
}

const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const SPLASH = {
  "drawable/splash.png": [480, 320],
  "drawable-land-mdpi/splash.png": [480, 320],
  "drawable-land-hdpi/splash.png": [800, 480],
  "drawable-land-xhdpi/splash.png": [1280, 720],
  "drawable-land-xxhdpi/splash.png": [1600, 960],
  "drawable-land-xxxhdpi/splash.png": [1920, 1280],
  "drawable-port-mdpi/splash.png": [320, 480],
  "drawable-port-hdpi/splash.png": [480, 800],
  "drawable-port-xhdpi/splash.png": [720, 1280],
  "drawable-port-xxhdpi/splash.png": [960, 1600],
  "drawable-port-xxxhdpi/splash.png": [1280, 1920],
};

const jobs = [];
for (const [density, scale] of Object.entries(DENSITIES)) {
  const icon = Math.round(48 * scale);
  const fg = Math.round(108 * scale);
  jobs.push([`mipmap-${density}/ic_launcher.png`, icon, icon, legacy]);
  jobs.push([`mipmap-${density}/ic_launcher_round.png`, icon, icon, round]);
  jobs.push([`mipmap-${density}/ic_launcher_foreground.png`, fg, fg, foreground]);
}
for (const [file, [w, h]] of Object.entries(SPLASH)) jobs.push([file, w, h, splash(w, h)]);

const browser = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find(existsSync);
if (!browser) throw new Error("Chrome or Edge is required to render the brand assets");

const port = 9400 + Math.floor(Math.random() * 400);
const profile = join(tmpdir(), `cifra-brand-${port}`);
const chrome = spawn(browser, [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  "about:blank",
]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

try {
  let targets;
  for (let i = 0; i < 40 && !targets; i++) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    } catch {
      await sleep(250);
    }
  }
  const page = targets.find((target) => target.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve) => (ws.onopen = resolve));
  let id = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    pending.get(message.id)?.(message);
    pending.delete(message.id);
  };
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      pending.set(++id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });

  await send("Page.enable");
  await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
  for (const [file, width, height, body] of jobs) {
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
    const html = `<!doctype html><style>html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden}</style>${body}`;
    await send("Page.navigate", { url: `data:text/html;base64,${Buffer.from(html).toString("base64")}` });
    await sleep(120);
    const shot = await send("Page.captureScreenshot", { format: "png" });
    const out = join(res, file);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, Buffer.from(shot.result.data, "base64"));
  }
  ws.close();
} finally {
  chrome.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true, maxRetries: 3 });
}

// Adaptive-icon background behind the foreground glyph.
writeFileSync(
  join(res, "values/ic_launcher_background.xml"),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${CYPRUS.toUpperCase()}</color>\n</resources>\n`,
);
console.log(`Rendered ${jobs.length} brand assets into android/app/src/main/res`);
