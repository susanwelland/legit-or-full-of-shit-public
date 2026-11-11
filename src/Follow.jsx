// Follow a candidate by email or text. Only the contact and who they follow are kept; a visitor's
// calls are never linked to it.
import { useState } from "react";
import { TEXT_CONSENT } from "./data/signup.js";
import { track } from "./analytics.js";

const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const KEY = "lofs-following";
const readFollowing = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};

export default function Follow({ person }) {
  const [open, setOpen] = useState(false);
  const [how, setHow] = useState("email");
  const [contact, setContact] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | sending | error
  const [error, setError] = useState("");
  const [following, setFollowing] = useState(readFollowing);
  const isFollowing = following.includes(person.id);

  async function send(e) {
    e.preventDefault();
    if (!API) {
      setStatus("error");
      setError("Following works on the live site.");
      return;
    }
    setStatus("sending");
    try {
      const body = how === "text" ? { person: person.id, phone: contact, consent } : { person: person.id, email: contact };
      const r = await fetch(`${API}/api/follow`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error || "That did not go through. Try again.");
      const next = [...new Set([...following, person.id])];
      setFollowing(next);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* remembered for this visit only */
      }
      setOpen(false);
      setStatus("idle");
      track("follow", { person: person.id, how });
    } catch (err) {
      setStatus("error");
      setError(err.message);
    }
  }

  if (isFollowing) {
    return <p className="follow-on" role="status">★ Following {person.name}. We'll tell you when their file changes.</p>;
  }
  if (!open) {
    return (
      <button type="button" className="follow-go" id="follow-open" onClick={() => setOpen(true)}>
        ☆ Follow {person.name}
      </button>
    );
  }
  return (
    <form className="follow" onSubmit={send} aria-label={`Follow ${person.name}`}>
      <p className="follow-lede">Get a heads-up when a new quote, vote or record lands on {person.name}'s file. Your calls are never attached to this.</p>
      <div className="follow-how" role="radiogroup" aria-label="How should we reach you?">
        {["email", "text"].map((h) => (
          <label key={h} className={how === h ? "chip on" : "chip"}>
            <input type="radio" name="follow-how" value={h} checked={how === h} onChange={() => { setHow(h); setContact(""); }} />
            {h === "email" ? "Email" : "Text"}
          </label>
        ))}
      </div>
      <div className="follow-row">
        <label className="sr" htmlFor="follow-contact">{how === "email" ? "Your email" : "Your mobile number"}</label>
        <input
          id="follow-contact"
          type={how === "email" ? "email" : "tel"}
          inputMode={how === "email" ? "email" : "tel"}
          autoComplete={how === "email" ? "email" : "tel"}
          required
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder={how === "email" ? "you@example.com" : "801-555-0123"}
        />
        <button type="submit" className="panel-go" id="follow-send" disabled={status === "sending" || (how === "text" && !consent)}>
          {status === "sending" ? "Saving…" : "Follow"}
        </button>
      </div>
      {how === "text" && (
        <label className="follow-consent">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> {TEXT_CONSENT}
        </label>
      )}
      {status === "error" && <p className="call-note" role="alert">{error}</p>}
      <p className="follow-fine">
        Only about the people you follow. Never sold. <button type="button" className="linkish" onClick={() => setOpen(false)}>Cancel</button>
      </p>
    </form>
  );
}
