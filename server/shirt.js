// "Wear your call" shirt. Front: the eagle and SHOW ME THE RECEIPTS (src/data/shirtArt.js). Back: drawn
// the same way as the mock-up on the site (src/ShirtMock.jsx): the person's name, "I voted", and
// the visitor's call.
// The name always comes from the site's own data, never from text a visitor typed.
import { Resvg } from "@resvg/resvg-js";
import { fileURLToPath } from "node:url";
import { people } from "./data/utah.js";
import { shirtFront } from "./data/shirtArt.js";
import { statePerson } from "./states.js";

const FONT_DIR = fileURLToPath(new URL("./fonts/", import.meta.url));
const FONTS = [FONT_DIR + "BricolageGrotesque-ExtraBold.ttf", FONT_DIR + "PublicSans-Italic.ttf"];
const DISPLAY = "Bricolage Grotesque 96pt ExtraBold";
const BODY = "Public Sans Thin"; // the 400 italic cut; its internal name says Thin
export const CALLS = { legit: "Legit!", fos: "Full of Shit!" };
// Back print area on Printful's standard tee is 12 x 16 inches; 300 dpi.
const WIDTH = 3600;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export function shirtPerson(id) {
  const other = statePerson(id);
  const p = people.find((x) => x.id === id) || (other && other.person);
  return p && !p.blank ? p : null;
}

// SVG of the back print. Same coordinates as the mock-up; the frame is 3:4 like the print area.
export function backSvg(name, call) {
  const parts = String(name).toUpperCase().split(" ");
  const last = parts.pop();
  const first = parts.join(" ");
  const fit = (text, max) => Math.min(max, 104 / (0.68 * Math.max(text.length, 1)));
  const nameStyle = (size) => `font-family="${DISPLAY}" font-weight="800" font-size="${size.toFixed(2)}" letter-spacing="${(size * 0.02).toFixed(2)}" fill="#e9efec"`;
  const callPart =
    call === "legit"
      ? `<text x="120" y="160" text-anchor="middle" font-family="${DISPLAY}" font-weight="800" font-size="24" fill="#e9efec">${CALLS.legit}</text>`
      : `<g transform="rotate(-2 120 154)"><rect x="66" y="140" width="108" height="28" fill="#ffe14a"/>` +
        `<text x="120" y="161" text-anchor="middle" font-family="${DISPLAY}" font-weight="800" font-size="17" fill="#14201f">${esc(CALLS.fos)}</text></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="60 52 120 160" width="${WIDTH}" height="${WIDTH * 4 / 3}">
${first ? `<text x="120" y="78" text-anchor="middle" ${nameStyle(fit(first, 15))}>${esc(first)}</text>` : ""}
<text x="120" y="102" text-anchor="middle" ${nameStyle(fit(last, 24))}>${esc(last)}</text>
<line x1="84" y1="112" x2="156" y2="112" stroke="#56655f" stroke-width="1.5"/>
<text x="120" y="130" text-anchor="middle" font-family="${BODY}" font-style="italic" font-size="13" fill="#9fb0aa">I voted</text>
${callPart}
</svg>`;
}

// The front print: the eagle and SHOW ME THE RECEIPTS, from the same drawing the site shows.
export function frontSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" width="${WIDTH}" height="${WIDTH * 4 / 3}">${shirtFront({ font: DISPLAY })}</svg>`;
}

const render = (svg) =>
  new Resvg(svg, {
    fitTo: { mode: "width", value: WIDTH },
    font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: DISPLAY },
    background: "rgba(0,0,0,0)",
  }).render().asPng();

let front = null;
export function frontPng() {
  if (!front) front = render(frontSvg());
  return front;
}

const cache = new Map();
export function backPng(personId, call) {
  const p = shirtPerson(personId);
  if (!p || !CALLS[call]) return null;
  const key = `${p.id}:${call}`;
  if (!cache.has(key)) {
    const png = render(backSvg(p.name, call));
    if (cache.size > 400) cache.clear();
    cache.set(key, png);
  }
  return cache.get(key);
}

// Printful downloads the print files from here when it makes the shirt.
export function mountShirt({ app }) {
  app.get("/api/shirt/front.png", (_req, res) => {
    res.set({ "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" }).send(frontPng());
  });
  app.get("/api/shirt/back.png", (req, res) => {
    const png = backPng(String(req.query.person || ""), String(req.query.call || ""));
    if (!png) return res.sendStatus(404);
    res.set({ "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" }).send(png);
  });
}
