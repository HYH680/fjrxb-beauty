import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "public", "avatars", "presets");
fs.mkdirSync(dir, { recursive: true });

const palettes = [
  ["#7c5cff", "#2a1f4d"],
  ["#5c8cff", "#1a2740"],
  ["#ff6b9d", "#3d1a28"],
  ["#3dd6c3", "#14332e"],
  ["#f0b429", "#3d2e0a"],
  ["#ff8a5c", "#3d2218"],
  ["#6ee7b7", "#163028"],
  ["#a78bfa", "#2a2040"],
  ["#38bdf8", "#0c2a3a"],
  ["#fb7185", "#3a1520"],
  ["#34d399", "#0f2e24"],
  ["#fbbf24", "#3a2a08"],
  ["#c084fc", "#2a1840"],
  ["#22d3ee", "#0a2e36"],
  ["#f472b6", "#3a1528"],
  ["#4ade80", "#143020"],
  ["#818cf8", "#1e1a40"],
  ["#f87171", "#3a1818"],
  ["#2dd4bf", "#0f2e2a"],
  ["#eab308", "#3a3008"],
  ["#60a5fa", "#152038"],
  ["#e879f9", "#2e1838"],
  ["#94a3b8", "#1e2430"],
  ["#fdba74", "#3a2818"],
  ["#86efac", "#183028"],
  ["#93c5fd", "#182840"],
  ["#f9a8d4", "#3a2030"],
  ["#67e8f9", "#0e2a30"],
  ["#c4b5fd", "#242038"],
  ["#fcd34d", "#3a3010"],
  ["#6ee7b7", "#1a3028"],
  ["#fda4af", "#3a2028"],
  ["#7dd3fc", "#0c2838"],
  ["#d8b4fe", "#281838"],
  ["#bef264", "#283018"],
  ["#fca5a5", "#381818"],
  ["#5eead4", "#0c3028"],
  ["#fde047", "#383010"],
  ["#a5b4fc", "#181830"],
  ["#fb923c", "#382010"],
  ["#4ade80", "#103820"],
  ["#e11d48", "#381018"],
  ["#0ea5e9", "#082838"],
  ["#84cc16", "#203010"],
  ["#ec4899", "#381028"],
  ["#14b8a6", "#0c3028"],
  ["#f59e0b", "#382808"],
  ["#8b5cf6", "#201838"],
];

const shapes = [
  (c, a) =>
    `<circle cx="64" cy="64" r="52" fill="${c}"/><circle cx="64" cy="58" r="22" fill="${a}" opacity="0.35"/><circle cx="50" cy="54" r="5" fill="#0f0d0b"/><circle cx="78" cy="54" r="5" fill="#0f0d0b"/><path d="M48 74c8 10 24 10 32 0" stroke="#0f0d0b" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  (c, a) =>
    `<rect x="12" y="12" width="104" height="104" rx="28" fill="${c}"/><circle cx="48" cy="56" r="8" fill="${a}"/><circle cx="80" cy="56" r="8" fill="${a}"/><rect x="44" y="78" width="40" height="10" rx="5" fill="${a}"/>`,
  (c, a) =>
    `<polygon points="64,10 118,118 10,118" fill="${c}"/><circle cx="52" cy="78" r="6" fill="#0f0d0b"/><circle cx="76" cy="78" r="6" fill="#0f0d0b"/><circle cx="64" cy="52" r="10" fill="${a}" opacity="0.5"/>`,
  (c, a) =>
    `<ellipse cx="64" cy="64" rx="54" ry="48" fill="${c}"/><path d="M40 58h16M72 58h16" stroke="#0f0d0b" stroke-width="6" stroke-linecap="round"/><path d="M48 82c10 12 22 12 32 0" stroke="${a}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  (c, a) =>
    `<circle cx="64" cy="64" r="52" fill="${c}"/><rect x="36" y="44" width="18" height="18" rx="4" fill="#0f0d0b"/><rect x="74" y="44" width="18" height="18" rx="4" fill="#0f0d0b"/><circle cx="64" cy="84" r="12" fill="${a}"/>`,
  (c, a) =>
    `<path d="M64 12c28 0 52 24 52 52s-24 52-52 52S12 92 12 64 36 12 64 12z" fill="${c}"/><circle cx="48" cy="56" r="7" fill="#fff" opacity="0.9"/><circle cx="80" cy="56" r="7" fill="#fff" opacity="0.9"/><circle cx="48" cy="56" r="3" fill="#0f0d0b"/><circle cx="80" cy="56" r="3" fill="#0f0d0b"/><path d="M50 76h28" stroke="${a}" stroke-width="5" stroke-linecap="round"/>`,
  (c, a) =>
    `<rect x="16" y="16" width="96" height="96" rx="48" fill="${c}"/><path d="M40 50c0-6 6-10 12-10s12 4 12 10M64 50c0-6 6-10 12-10s12 4 12 10" stroke="#0f0d0b" stroke-width="4" fill="none"/><circle cx="64" cy="78" r="14" fill="${a}" opacity="0.55"/>`,
  (c, a) =>
    `<circle cx="64" cy="64" r="52" fill="${c}"/><circle cx="64" cy="64" r="28" fill="${a}" opacity="0.25"/><path d="M40 50l12 8 12-8M64 50l12 8 12-8" stroke="#0f0d0b" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M46 80c10 14 26 14 36 0" stroke="#0f0d0b" stroke-width="4" fill="none" stroke-linecap="round"/>`,
];

const ids = [];
for (let i = 0; i < 48; i++) {
  const id = String(i + 1).padStart(2, "0");
  const [c, a] = palettes[i];
  const body = shapes[i % shapes.length](c, a);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Avatar ${id}">${body}</svg>\n`;
  fs.writeFileSync(path.join(dir, `avatar-${id}.svg`), svg);
  ids.push(`avatar-${id}`);
}
console.log("wrote", ids.length, "presets to", dir);
