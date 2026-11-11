// Product analytics with PostHog, only on the live site (legitorfullofshit.com), never in previews
// or local development. The project key is public by design: PostHog keys of this kind only send
// events and ship inside every page. VITE_POSTHOG_KEY at build time overrides it.
// No cookies or browser storage (memory only), no automatic click capture, no session recording.
// Events carry what was viewed or bought (a candidate id, an issue), never names, emails or answers.
import posthog from "posthog-js";

const KEY = import.meta.env.VITE_POSTHOG_KEY || "phc_z3EZJyx6dns38uWnmE7oKFYaMhh4u2PRws7VRnWKHabJ";
const LIVE = typeof location !== "undefined" && /(^|\.)legitorfullofshit\.com$/.test(location.hostname);
let on = false;

// Team devices: open any page once with ?team=1 and this browser stops sending analytics, so our
// own testing never counts as "direct" traffic. ?team=0 turns it back on. Kept in this browser only.
const TEAM_KEY = "lofs-team";
function isTeamDevice() {
  try {
    const q = new URLSearchParams(location.search).get("team");
    if (q === "1") localStorage.setItem(TEAM_KEY, "1");
    if (q === "0") localStorage.removeItem(TEAM_KEY);
    return localStorage.getItem(TEAM_KEY) === "1";
  } catch {
    return false;
  }
}

export function startAnalytics() {
  if (!KEY || !LIVE || on || typeof window === "undefined") return;
  if (isTeamDevice()) return;
  posthog.init(KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com",
    persistence: "memory",
    autocapture: false,
    capture_pageview: "history_change",
    capture_pageleave: false,
    disable_session_recording: true,
    disable_surveys: true,
    mask_all_text: true,
    mask_all_element_attributes: true,
  });
  on = true;
}

// Sent with every event: which home page this visitor saw, where they came from (a utm_source
// or the referring site's name, never a full address), and the state in view, if any.
export const PAGE_VARIANT = "new_hero"; // the Oct 2026 ZIP hero; "old_hero" is the earlier Utah-first page
// The first source seen in this tab is kept for the rest of the visit (sessionStorage), so a reload
// or an in-site link that drops the ?utm_source still credits the post that brought them.
const SOURCE = (() => {
  if (typeof location === "undefined") return "direct";
  try {
    const utm = new URLSearchParams(location.search).get("utm_source");
    let src = utm ? utm.toLowerCase().replace(/[^a-z0-9_.-]/g, "").slice(0, 40) : "";
    if (!src) {
      const ref = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, "") : "";
      src = ref && ref !== location.hostname ? ref : "";
    }
    try {
      const kept = sessionStorage.getItem("lofs-src");
      if (!src && kept) return kept;
      if (src && !kept) sessionStorage.setItem("lofs-src", src);
      if (kept) return kept;
    } catch {
      /* no storage: this page load only */
    }
    return src || "direct";
  } catch {
    return "direct";
  }
})();
let context = { state: null, state_open: null };
export function setPageContext(next) {
  context = { ...context, ...next };
}

export function track(event, props = {}) {
  if (on) posthog.capture(event, { page_variant: PAGE_VARIANT, source: SOURCE, ...context, ...props });
}
