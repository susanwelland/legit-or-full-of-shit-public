// A state that is not open yet: leave an email and the issues you care about, then go see Utah.
import { useState } from "react";
import { SIGNUP_ISSUES, STATE_NAMES } from "./data/signup.js";
import { track } from "./analytics.js";

const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

// `compact`: the version that opens right under the ZIP box: just the email box and the button.
export default function StateSignup({ state, next, openUtah, title, lede, compact = false, where = "home" }) {
  const name = STATE_NAMES[state] || state;
  const [email, setEmail] = useState("");
  const [picked, setPicked] = useState([]);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | done | error
  const [error, setError] = useState("");
  const toggle = (i) => setPicked(picked.includes(i) ? picked.filter((x) => x !== i) : [...picked, i]);

  async function send(e) {
    e.preventDefault();
    if (!API) {
      setStatus("error");
      setError("Sign-ups work on the live site.");
      return;
    }
    setStatus("sending");
    try {
      const r = await fetch(`${API}/api/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, state, issues: picked, note }),
      });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error || "That did not go through. Try again.");
      setStatus("done");
      track("closed_state_email_submitted", { state, state_open: false, where, issues: picked.length });
    } catch (err) {
      setStatus("error");
      setError(err.message);
    }
  }

  const emailRow = (
    <div className="signup-row">
      <label className="field" htmlFor={`signup-email-${where}`}>
        Your email
        <input id={`signup-email-${where}`} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </label>
      <button type="submit" className="home-go" id={`signup-send-${where}`} disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : `Tell me when ${name} opens`}
      </button>
    </div>
  );

  if (status === "done") {
    return (
      <section className="signup done" id={compact ? `state-signup-${where}` : "state-signup"} aria-live="polite">
        <h3>Thanks. You're on the list for {name}.</h3>
        <p>We'll email you when {name} opens{picked.length ? `, starting with ${picked.slice(0, 2).join(" and ").toLowerCase()}` : ""}. Until then, see how it works in Utah: real quotes next to real votes, and you make the call.</p>
        <button type="button" className="home-go" id="signup-utah" onClick={openUtah}>Check out Utah</button>
      </section>
    );
  }

  return (
    <section className={compact ? "signup compact" : "signup"} id={compact ? `state-signup-${where}` : "state-signup"} aria-label={`Sign up for ${name}`}>
      <h3>{title || `${next ? `${name} is next.` : `${name} isn't open yet.`} Want in first?`}</h3>
      <p>{lede || `Tell us what you're worried about there, and we'll email you the day ${name} opens. Your answers decide what we dig into first.`}</p>
      <form onSubmit={send}>
        {compact && emailRow}
        {!compact && <fieldset className="signup-issues">
          <legend>What issues matter most to you in {name}?</legend>
          {SIGNUP_ISSUES.map((i) => (
            <label key={i} className={picked.includes(i) ? "chip on" : "chip"}>
              <input type="checkbox" checked={picked.includes(i)} onChange={() => toggle(i)} />
              {i}
            </label>
          ))}
        </fieldset>}
        {!compact && (<label className="field" htmlFor={`signup-note-${where}`}>
          Anything else? (optional)
          <input id={`signup-note-${where}`} type="text" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="A race, an official, a vote you want checked" />
        </label>)}
        {!compact && emailRow}
        {status === "error" && <p className="call-note" role="alert">{error}</p>}
        <p className="signup-fine">
          We'll email you when {name} opens and now and then with site news. No spam, never sold, and you can ask us to remove you any time at eagle@legitorfullofshit.com.
        </p>
      </form>
      {!compact && <p className="signup-fine">
        Not ready? <button type="button" className="linkish" onClick={openUtah}>Look around Utah first</button>.
      </p>}
    </section>
  );
}
