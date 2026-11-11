import { track } from "./analytics.js";
// Where calls are counted. Three backends, picked at load:
//   "api"     the site's own tally service (server/), when VITE_API_URL is set at build time
//   "shared"  the shared store of a published preview page
//   "local"   this device only, when neither is available
const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const LS_CALLS = "lofs-calls";
const LS_VOTER = "lofs-voter";

function lsGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}
function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: state lasts for this visit only */
  }
}
export function voterId() {
  let id = lsGet(LS_VOTER, null);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now();
    lsSet(LS_VOTER, id);
  }
  return id;
}
const clean = (calls) => Object.fromEntries(Object.entries(calls).filter(([, v]) => v === "legit" || v === "fos"));

function countDocs(docs) {
  const counts = {};
  for (const d of docs) {
    const calls = (d.data() || {}).calls || {};
    for (const [key, v] of Object.entries(calls)) {
      if (v !== "legit" && v !== "fos") continue;
      counts[key] = counts[key] || { legit: 0, fos: 0 };
      counts[key][v] += 1;
    }
  }
  return counts;
}

// push({ mode, counts, mine, canCall }) is called whenever anything changes.
export function connectTallies(push) {
  const state = { mode: "local", counts: null, mine: clean(lsGet(LS_CALLS, {})), canCall: true };
  const emit = () => push({ ...state, mine: { ...state.mine } });
  let cast = async (key, value) => {
    state.mine = clean({ ...state.mine, [key]: value });
    lsSet(LS_CALLS, state.mine);
    emit();
  };
  let stop = () => {};
  emit();

  (async () => {
    if (API) {
      const voter = voterId();
      const load = async () => {
        const r = await fetch(`${API}/api/tallies`, { headers: { "X-Voter": voter } });
        if (!r.ok) throw new Error("tallies unavailable");
        const body = await r.json();
        state.mode = "api";
        state.counts = body.counts;
        state.week = body.week || 0;
        state.mine = clean(body.mine);
        emit();
      };
      cast = async (key, value) => {
        const r = await fetch(`${API}/api/calls`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Voter": voter },
          body: JSON.stringify({ key, value: value || null }),
        });
        if (r.ok) {
          track("call_made", { item: key, value });
          await load();
        }
      };
      try {
        await load();
      } catch {
        /* service down: keep working on this device */
      }
      return;
    }

    const claude = typeof window !== "undefined" ? window.claude : null;
    if (!claude || !claude.use) return;
    const [db, user] = await Promise.all([claude.use("db"), claude.use("user")]);
    if (!db) return;
    const me = user ? await user.id() : null;
    state.mode = "shared";
    state.mine = {};
    state.canCall = Boolean(me);
    stop = db.collection("votes").onSnapshot(
      (snap) => {
        state.counts = countDocs(snap.docs);
        const mineDoc = me && snap.docs.find((d) => d.id === me);
        state.mine = clean((mineDoc && (mineDoc.data() || {}).calls) || {});
        emit();
      },
      () => {
        state.counts = state.counts || {};
        emit();
      }
    );
    let chain = Promise.resolve();
    cast = (key, value) => {
      if (!me) return Promise.resolve();
      const next = clean({ ...state.mine, [key]: value });
      state.mine = next;
      emit();
      chain = chain
        .then(() => db.doc(`votes/${me}`).set({ calls: next }))
        .catch(() => {
          state.canCall = false;
          emit();
        });
      return chain;
    };
  })();

  return { cast: (key, value) => cast(key, value), stop: () => stop() };
}
