// One real receipt for the home page: a person's own words next to their own recorded vote on the
// same issue, each with its source, and one button to make the call. Picked at random from
// people who have both, so no one is always first. No verdict: the visitor decides.
import { useMemo, useState } from "react";
import { issues, people } from "./data/utah.js";

const YN = /^(yea|aye|yes|nay|no)$/i;
const NO_PUBLIC = /\b(damn|hell|shit)\b/i; // keep profanity off the front page, even in quotes

export function receipts() {
  const out = [];
  for (const p of people) {
    for (const i of issues) {
      const e = p.entries[i.id];
      if (!e) continue;
      const q = e.said.find((x) => x.text && x.text.length <= 170 && !NO_PUBLIC.test(x.text));
      const d = e.did.find((x) => YN.test(String(x.vote).trim()));
      if (!q || !d) continue;
      const m = i.measures.find((x) => x.id === d.measure);
      out.push({ person: p, issue: i, said: q, did: d, measure: m });
    }
  }
  return out;
}

const word = (v) => {
  const s = String(v).trim();
  return s[0].toUpperCase() + s.slice(1).toLowerCase();
};

export default function Receipt({ onOpen }) {
  const all = useMemo(receipts, []);
  const [n, setN] = useState(() => Math.floor(Math.random() * Math.max(all.length, 1)));
  if (!all.length) return null;
  const r = all[n % all.length];
  return (
    <article className="receipt" aria-label={`A receipt: ${r.person.name} on ${r.issue.name}`}>
      <p className="receipt-kicker">A real receipt · {r.issue.name}</p>
      <h2 className="receipt-who">
        {r.person.name} <span>{r.person.office}</span>
      </h2>
      <div className="receipt-cols">
        <div className="receipt-said">
          <p className="receipt-label">Said</p>
          <blockquote>“{r.said.text}”</blockquote>
          <p className="receipt-src">
            {r.said.date.replace(/^Published /, "")} ·{" "}
            <a href={r.said.url} target="_blank" rel="noreferrer">{r.said.source}</a>
          </p>
        </div>
        <div className="receipt-did">
          <p className="receipt-label">Did</p>
          <p className="receipt-vote">
            Voted <strong>{word(r.did.vote)}</strong> on {r.did.measure}
          </p>
          {r.measure && <p className="receipt-what">{r.measure.title}</p>}
          <p className="receipt-src">
            {r.did.date} ·{" "}
            <a href={r.did.url} target="_blank" rel="noreferrer">Roll call</a>
          </p>
        </div>
      </div>
      <div className="receipt-go">
        <button type="button" className="home-go" id="receipt-call" onClick={() => onOpen(r.person.id, r.issue.id)}>
          Legit or full of shit? Make the call
        </button>
        <button type="button" className="linkish receipt-next" id="receipt-next" onClick={() => setN((x) => x + 1 + Math.floor(Math.random() * 5))}>
          Show another
        </button>
      </div>
    </article>
  );
}
