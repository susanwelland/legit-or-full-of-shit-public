// Addresses: "/" is the home page, "/utah" a state, "/utah/top20" a page inside it,
// "/utah/lake" an issue, "/rules" "/terms" "/privacy" the policy pages, "/feed" Feed the Eagle.
// The single-file preview has no server paths, so it keeps the same addresses after a "#".
const HASH = import.meta.env.VITE_SINGLE === "1" || (typeof location !== "undefined" && location.protocol === "file:");

import { OPEN_STATES } from "./data/states/index.js";

// Every open state by address. Utah's data is bundled; the others (src/data/states/) load on demand.
export const STATES = { utah: "Utah", ...Object.fromEntries(OPEN_STATES.map((s) => [s.slug, s.name])) };
// Postal code to address, for the map and the address lookup.
export const STATE_CODES = { UT: "utah", ...Object.fromEntries(OPEN_STATES.map((s) => [s.code, s.slug])) };
const POLICY = ["rules", "terms", "privacy", "corrections", "feed"];
// The merch shop is hidden unless the site is built with VITE_SHOP=on (a Render setting on the
// static site). Feed the Eagle and the evidence file use the same checkout and stay on.
export const SHOP_ON = import.meta.env.VITE_SHOP === "on";
// The Odds (prediction-market prices) is on. Build with VITE_ODDS=off to hide it.
export const ODDS_ON = import.meta.env.VITE_ODDS !== "off";
// Agree to Disagree, the comment board, is hidden unless the site is built with VITE_BOARD=on.
export const BOARD_ON = import.meta.env.VITE_BOARD === "on";
const STATE_VIEWS = ["match", "votes", "top20", ...(ODDS_ON ? ["odds"] : []), "action", ...(SHOP_ON ? ["shop"] : []), "blog"];
// Pages that exist only for Utah. Other states get the records, the roll call and, when their own
// votes make the questions, "Who votes like you".
const UTAH_ONLY = ["top20", "odds", "action", "shop", "blog", "board"];
export function viewsOf(state) {
  if (state === "utah") return STATE_VIEWS;
  const s = OPEN_STATES.find((x) => x.slug === state);
  return s && s.match ? ["match", "votes"] : ["votes"];
}

export function readRoute() {
  if (typeof location === "undefined") return { page: "home" };
  let raw = HASH ? location.hash.replace(/^#/, "") : location.pathname;
  // Links shared before states had their own address ("#lake", "#top20").
  if (!HASH && raw === "/" && location.hash.length > 1) raw = "/utah/" + location.hash.slice(1);
  if (HASH && raw && !raw.startsWith("/")) raw = "/utah/" + raw;
  const [a, b, c] = raw.split("/").filter(Boolean);
  if (!a) return { page: "home" };
  if (POLICY.includes(a)) return { page: "state", state: "utah", view: a };
  if (!STATES[a]) return { page: "home" };
  if (a !== "utah" && (UTAH_ONLY.includes(b) || (b === "match" && !viewsOf(a).includes("match")))) return { page: "state", state: a, view: "records" };
  // The board and its threads: /utah/board, /utah/board/<thread>, /utah/board/admin.
  if (b === "board" && BOARD_ON) return { page: "state", state: a, view: "board", thread: c && /^[a-z0-9-]{1,80}$/.test(c) ? c : null };
  if (POLICY.includes(b) || viewsOf(a).includes(b)) return { page: "state", state: a, view: b };
  // One person on one issue has its own address too: /utah/lake/owens (the pages search engines index).
  if (c && STATES[a] && /^[a-z0-9-]{1,80}$/.test(c)) return { page: "state", state: a, view: "records", issue: b, person: c };
  // A shared call links to one person on one issue: /utah/lake?who=owens
  const who = HASH ? null : new URLSearchParams(location.search).get("who");
  if (who && /^[a-z0-9-]{1,60}$/.test(who) && b) return { page: "state", state: a, view: "records", issue: b, person: who };
  if (b === "shop" || b === "board" || (b === "odds" && !ODDS_ON)) return { page: "state", state: a, view: "records" }; // hidden pages
  return { page: "state", state: a, view: "records", issue: b || null };
}

export function pathFor(r) {
  if (r.page === "home") return "/";
  if (POLICY.includes(r.view)) return "/" + r.view;
  if (r.view === "board") return `/${r.state}/board${r.thread ? "/" + r.thread : ""}`;
  if (r.view && r.view !== "records") return `/${r.state}/${r.view}`;
  return `/${r.state}${r.issue ? "/" + r.issue : ""}${r.issue && r.person ? "/" + r.person : ""}`;
}
// Addresses end in "/": the host serves each prerendered page (its own title, description and
// text) only at /path/. Without the slash every address gets the home page's copy.
const slashed = (p) => (p === "/" || p.endsWith("/") ? p : p + "/");

export function writeRoute(r, push = false) {
  const path = slashed(pathFor(r));
  try {
    history[push ? "pushState" : "replaceState"](null, "", HASH ? "#" + path : path);
  } catch {
    /* the address is a convenience only */
  }
}

// Files the site hosts itself (records it released) live under /records/. The single-file preview
// serves them next to the page, so there the address is relative.
export function fileUrl(u) {
  if (!u || !u.startsWith("/records/")) return u;
  return HASH ? u.slice(1) : u;
}
