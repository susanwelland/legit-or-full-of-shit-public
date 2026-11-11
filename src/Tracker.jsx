// Donkey Tracker. Follow the Ass. Pay $5 in PayPal sandbox to follow one candidate and get an email
// when their record changes. Demo only: shown when the site is built with VITE_TRACKER=on, or in a
// browser opened once with ?tracker=1 (?tracker=0 hides it again). The server must also have
// TRACKER=on. No tracking period is promised, and alerts are sent by hand with the demo trigger.
import { useEffect, useState } from "react";
import { Checkout, Receipt } from "./Shop.jsx";
import { voterId } from "./tallies.js";

const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const FLAG = "lofs-tracker";
const MINE = "lofs-trackers"; // candidate id -> tracker id, so a reload shows where it stands
const ADMIN = "lofs-board-admin"; // the same admin token the board's queue uses, this tab only
export const CONSENT = "Email me when this candidate's record changes.";

const store = {
  get(k, fallback) { try { return localStorage.getItem(k) ?? fallback; } catch { return fallback; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* this visit only */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* nothing kept */ } },
};
export function trackerShown() {
  if (typeof location !== "undefined") {
    const q = new URLSearchParams(location.search).get("tracker");
    if (q === "1") store.set(FLAG, "1");
    if (q === "0") store.del(FLAG);
  }
  if (import.meta.env.VITE_TRACKER === "on") return true;
  return store.get(FLAG, "") === "1";
}
const mine = () => { try { return JSON.parse(store.get(MINE, "{}")) || {}; } catch { return {}; } };
const money = (c) => `$${(c / 100).toFixed(c % 100 ? 2 : 0)}`;
const json = (r) => r.json().catch(() => ({}));

export default function Tracker({ person, issue }) {
  const [shop, setShop] = useState(null);
  const [step, setStep] = useState("idle"); // idle | form | pay | active | error
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [sub, setSub] = useState(mine()[person.id] || null);
  const [status, setStatus] = useState(null);
  const [note, setNote] = useState("");
  const headers = { "Content-Type": "application/json", "X-Voter": voterId() };

  useEffect(() => {
    if (!API) return;
    fetch(`${API}/api/shop`).then(json).then(setShop).catch(() => setShop({ mode: "off" }));
  }, []);
  async function refresh(id = sub) {
    if (!id) return;
    const r = await fetch(`${API}/api/tracker/${id}`, { headers });
    if (!r.ok) return;
    const b = await json(r);
    setStatus(b);
    if (b.status === "active") setStep("active");
  }
  useEffect(() => { refresh(); }, []);

  if (!API || !shop || !shop.trackerOn) return null;
  const price = money(shop.trackerCents || 500);

  async function start(e) {
    e.preventDefault();
    setNote("");
    const r = await fetch(`${API}/api/tracker/start`, { method: "POST", headers, body: JSON.stringify({ person: person.id, email, consent }) });
    const b = await json(r);
    if (!r.ok) { setNote(b.error || "That did not go through. Try again."); return; }
    setSub(b.tracker);
    store.set(MINE, JSON.stringify({ ...mine(), [person.id]: b.tracker }));
    setEmail(""); // not kept in the page once the server has it
    setStep("pay");
  }

  return (
    <section className="evidence tracker" id="donkey-tracker" aria-label="Donkey Tracker">
      <h3>Donkey Tracker. Follow the Ass. <span className="kind">Pilot</span></h3>
      <p>Get an email when {person.name}'s record changes: what changed, with the source. No verdicts from us.</p>

      {step === "idle" && (
        <button className="panel-go" id="tracker-open" onClick={() => setStep("form")}>
          Track this candidate - {price}
        </button>
      )}

      {step === "form" && (
        <form className="tracker-form" onSubmit={start}>
          <label htmlFor="tracker-email">Your email</label>
          <input id="tracker-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
          <label className="tracker-consent">
            <input type="checkbox" id="tracker-consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />{" "}
            {CONSENT}
          </label>
          <p className="sandbox-flag" role="note">
            <strong>{price} in PayPal sandbox. No real money moves.</strong> Demo only: no tracking period is promised. You'll get an
            email to confirm your address, and every email has an unsubscribe link.
          </p>
          <button className="panel-go" id="tracker-continue" disabled={!consent || !email}>Continue to PayPal</button>
          {note && <p className="call-note" role="alert">{note}</p>}
        </form>
      )}

      {step === "pay" && sub && (
        <div className="evidence-offer">
          <p className="sandbox-flag" role="note"><strong>Track {person.name} for {price} in PayPal sandbox.</strong> No real money moves.</p>
          <Checkout item={{ tracker: sub }} shop={shop} paidText="" onDone={() => refresh(sub)} />
        </div>
      )}

      {step === "active" && status && (
        <p className="paid" role="status">
          Payment confirmed by the server. You're tracking {status.name || person.name}.{" "}
          {status.confirmed
            ? "Your email is confirmed: alerts will reach you."
            : "Check your email and confirm your address. Alerts go only to confirmed addresses."}
        </p>
      )}
      {step === "active" && status && <Receipt r={status.receipt} />}

      {/* Owner's demo trigger: only in a browser opened once with ?tracker=1, never for visitors. */}
      {store.get(FLAG, "") === "1" && <DemoTrigger person={person} issue={issue} />}
    </section>
  );
}

// The demo trigger: the owner sends one alert by hand. Labeled as a demo on the page and in the
// email, never presented as live monitoring. Needs the admin token; every call is checked by the server.
function DemoTrigger({ person, issue }) {
  const did = (person.entries && issue && person.entries[issue.id] && person.entries[issue.id].did) || [];
  const first = did[0];
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState(() => { try { return sessionStorage.getItem(ADMIN) || ""; } catch { return ""; } });
  const [summary, setSummary] = useState(first ? `${first.measure}: ${person.name} voted ${first.vote}. ${first.motion || ""}`.trim() : "");
  const [source, setSource] = useState(first ? first.url : "");
  const [result, setResult] = useState("");

  async function send(e) {
    e.preventDefault();
    try { sessionStorage.setItem(ADMIN, token); } catch { /* this request only */ }
    const r = await fetch(`${API}/api/admin/tracker/alert`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin": token },
      body: JSON.stringify({ person: person.id, summary, source, demo: true }),
    });
    const b = await json(r);
    if (r.status === 404) return setResult("That admin token did not work.");
    if (!r.ok) return setResult(b.error || "The alert did not go out.");
    setResult(
      `Sent ${b.sent}. Already had this change: ${b.alreadySent}. Failed: ${b.failed}.` +
        (b.unconfirmed ? ` ${b.unconfirmed} not confirmed yet, so not sent.` : "")
    );
  }

  if (!open) return <button className="linkish tracker-demo-open" onClick={() => setOpen(true)}>Demo trigger (owner only)</button>;
  return (
    <form className="tracker-form tracker-demo" onSubmit={send}>
      <p className="sandbox-flag" role="note"><strong>Demo trigger.</strong> Sends one alert by hand. This is not live monitoring.</p>
      <label htmlFor="tracker-admin">Admin token</label>
      <input id="tracker-admin" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} required />
      <label htmlFor="tracker-summary">What changed (quote the record)</label>
      <textarea id="tracker-summary" rows={3} maxLength={600} value={summary} onChange={(e) => setSummary(e.target.value)} required />
      <label htmlFor="tracker-source">Source link</label>
      <input id="tracker-source" type="url" value={source} onChange={(e) => setSource(e.target.value)} required />
      <button className="panel-go" id="tracker-send">Send demo alert</button>
      {result && <p className="call-note" role="status">{result}</p>}
    </form>
  );
}
