// Flattens the Vite build into one self-contained file for sharing a preview.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
const dir = "dist/assets";
const files = readdirSync(dir);
const css = readFileSync(`${dir}/${files.find((f) => f.endsWith(".css"))}`, "utf8");
const js = readFileSync(`${dir}/${files.find((f) => f.endsWith(".js"))}`, "utf8").replace(/<\/script/g, "<\\/script").replace(/\uFFFD/g, "\\uFFFD");
const fonts = readFileSync("index.html", "utf8").match(/<link rel="stylesheet"[^>]+>/)[0];
mkdirSync("preview", { recursive: true });
writeFileSync("preview/legit-or-full-of-shit.html",
  `<meta charset="utf-8">\n<title>Legit or Full of Shit</title>\n${fonts}\n<style>${css}</style>\n<div id="root"></div>\n<script type="module">${js}</script>\n`);
