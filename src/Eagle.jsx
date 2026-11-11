import { useEffect, useRef, useState } from "react";
import { founders } from "./founders.js";
import { askEagle, canNotify, notifyMe } from "./research.js";

const IDEAS = ["Who funds the campaign?", "Other votes on this issue", "What did they say before this year?"];

// One feather: a leaf shape pointing up from the origin, `len` long and `w` wide.
const feather = (len, w) =>
  `M0 0 C${w} ${-len * 0.25} ${w * 1.1} ${-len * 0.8} 0 ${-len} C${-w * 1.1} ${-len * 0.8} ${-w} ${-len * 0.25} 0 0Z`;

// A fanned wing for the bird's right side (viewer's left). The other side is its mirror image.
function Wing() {
  const flight = [];
  const coverts = [];
  const n = 11;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const angle = -114 + t * 88; // from pointing out and slightly down, up to nearly vertical
    const len = 52 + 34 * Math.sin(Math.PI * (0.12 + t * 0.7));
    const fold = -186 + t * 20; // folded: every feather hangs down along the body
    flight.push(<path key={i} className="e-wing feather" d={feather(len, 7)} style={{ "--a": `${angle}deg`, "--f": `${fold}deg` }} />);
    coverts.push(<path key={i} className="e-cover feather" d={feather(len * 0.56, 6.5)} style={{ "--a": `${angle + 3}deg`, "--f": `${fold + 2}deg` }} />);
  }
  return (
    <g transform="translate(105 74)">
      {flight}
      {coverts}
      <ellipse className="e-body" cx="-8" cy="-6" rx="17" ry="12" transform="rotate(-38)" />
    </g>
  );
}

function star(cx, cy, r) {
  const pts = [];
  for (let k = 0; k < 10; k++) {
    const rad = (Math.PI / 5) * k - Math.PI / 2;
    const rr = k % 2 ? r * 0.42 : r;
    pts.push(`${(cx + rr * Math.cos(rad)).toFixed(1)},${(cy + rr * Math.sin(rad)).toFixed(1)}`);
  }
  return pts.join(" ");
}

// The logo mark: the eagle's head on a dark tile. Same drawing as public/favicon.svg.
export function Mark() {
  return (
    <svg className="mark" viewBox="85 28 60 60" aria-hidden="true">
      <rect x="85" y="28" width="60" height="60" rx="11" fill="#14201f" />
      <path d="M100 88C98 78 100 70 104 64H137C141 70 143 78 141 88Z" fill="#4a2f1b" />
      <path d="M107 66C102 53 106 38 120 36C133 35 140 45 137 58L140 72L133 67L130 76L125 68L120 77L115 68L110 75Z" fill="#fff" />
      <path d="M109 45L96 46C91 47 89 53 93 59C94 54 98 52 104 53L112 55Z" fill="#ffc21a" />
      <path d="M108 41L125 38" fill="none" stroke="#14201f" strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="117" cy="45.5" r="3" fill="#ffc21a" />
      <circle cx="116.6" cy="45.5" r="1.5" fill="#14201f" />
    </svg>
  );
}

// Wings stay folded until the bird is busy, unless `spread` keeps them open.
export function Bird({ busy, sky = true, spread = false }) {
  const tail = [-34, -17, 0, 17, 34];
  return (
    <svg className={`bird${busy ? " busy" : ""}${busy || spread ? " open" : ""}`} viewBox="0 0 240 156" role="img" aria-label="A bald eagle with wings spread and a stars-and-stripes shield on its chest">
      <defs>
        <clipPath id="eagle-shield">
          <path d="M109 82h22v15c0 9-7 13-11 15c-4-2-11-6-11-15z" />
        </clipPath>
      </defs>
      {sky && <rect className="e-sky" width="240" height="156" />}
      <g className="wing wing-l"><Wing /></g>
      <g className="wing wing-r"><g transform="translate(240 0) scale(-1 1)"><Wing /></g></g>

      {[[97, 14, 3.4], [108, 9, 3.8], [120, 7, 4.3], [132, 9, 3.8], [143, 14, 3.4]].map(([x, y, r]) => (
        <polygon key={x} className="e-star" points={star(x, y, r)} />
      ))}

      <g transform="translate(120 116)">
        {tail.map((a) => (
          <path key={a} className="e-white e-edge" d={feather(34, 6.5)} transform={`rotate(${180 + a})`} />
        ))}
      </g>
      <path className="e-gold" d="M108 116l-6 12m6-12l0 13m0-13l6 11M132 116l-6 11m6-11l0 13m0-13l6 12" />

      <path className="e-body" d="M102 66C96 86 101 110 120 121C139 110 144 86 138 66Z" />
      <g clipPath="url(#eagle-shield)">
        <rect className="e-white" x="109" y="82" width="22" height="30" />
        <path className="e-red" d="M109 89h3.2v23h-3.2zM115.3 89h3.1v23h-3.1zM121.6 89h3.1v23h-3.1zM127.9 89h3.1v23h-3.1z" />
        <rect className="e-blue" x="109" y="82" width="22" height="8" />
      </g>
      <path className="e-shield-edge" d="M109 82h22v15c0 9-7 13-11 15c-4-2-11-6-11-15z" />

      <path className="e-white e-edge" d="M107 66C102 53 106 38 120 36C133 35 140 45 137 58L140 72L133 67L130 76L125 68L120 77L115 68L110 75Z" />
      <path className="e-beak" d="M109 45L96 46C91 47 89 53 93 59C94 54 98 52 104 53L112 55Z" />
      <path className="e-brow" d="M108 41L125 38" />
      <circle className="e-gold-fill" cx="117" cy="45" r="2.7" />
      <circle className="e-eye" cx="116.6" cy="45" r="1.3" />
    </svg>
  );
}

// The Eagle's first line back. It only claims a search happened when one did, and "found nothing"
// never becomes "there is nothing".
function opening(m, person) {
  const q = m.question ? `"${m.question.length > 90 ? m.question.slice(0, 87) + "..." : m.question}"` : "that";
  if (m.local) return `Good question. I noted ${q} on this device, but the research list is not connected on this copy of the site.`;
  if (!m.saved) return m.text ? "" : "Your question was not saved.";
  const list = "It is now on our research list, where a person checks it against the record.";
  if (m.preview && m.text) return `Good question. Here is what ${person.name}'s file on this page says about ${q}. ${list}`;
  if (m.searched && m.leads && m.leads.length) return `Good question. I searched for ${q} and found these leads on ${person.name}. ${list}`;
  if (m.searched) return `Good question. I searched and found no public source I could link that answers ${q} about ${person.name}. That does not mean none exists. ${list}`;
  return `Good question. Nothing in ${person.name}'s file here answers ${q} yet. ${list}`;
}

function Notify({ id }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("ask"); // ask | sending | done
  const [error, setError] = useState("");
  if (state === "done") return <p className="notify-done" role="status">Got it. We will email you what we find, with the sources.</p>;
  async function save(e) {
    e.preventDefault();
    setState("sending");
    setError("");
    const r = await notifyMe(id, email).catch(() => ({ ok: false, error: "That did not save. Try again in a minute." }));
    if (r.ok) setState("done");
    else { setError(r.error); setState("ask"); }
  }
  return (
    <form className="notify" onSubmit={save}>
      <label htmlFor={`notify-${id}`}>Want the findings? Leave an email and we will send what we find. No account needed.</label>
      <div className="notify-row">
        <input id={`notify-${id}`} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
        <button type="submit" disabled={state === "sending"}>Email me the findings</button>
      </div>
      {error && <p className="notify-error" role="alert">{error}</p>}
    </form>
  );
}

export default function Eagle({ person, issue, onMatch, questions = 5 }) {
  const [text, setText] = useState("");
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState(0);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  useEffect(() => {
    if (!busy) return undefined;
    const t = setInterval(() => setQuote((q) => (q + 1) % founders.length), 4500);
    return () => clearInterval(t);
  }, [busy]);

  function send(e) {
    e.preventDefault();
    ask(text.trim());
  }

  // One tap on a suggested question asks it.
  async function ask(question) {
    if (question.length < 5 || busy) return;
    setText("");
    setBusy(true);
    setQuote(Math.floor(Math.random() * founders.length));
    setLog((l) => [...l, { from: "you", text: question }]);
    const started = Date.now();
    let res;
    try {
      res = { ...(await askEagle({ person, issue, question })), question };
    } catch {
      res = { saved: false, text: "The Eagle lost the connection. Try again in a minute.", leads: [] };
    }
    const wait = Math.max(0, 3000 - (Date.now() - started));
    setTimeout(() => {
      if (!alive.current) return;
      setLog((l) => [...l, { from: "eagle", ...res }]);
      setBusy(false);
    }, wait);
  }

  const f = founders[quote];
  return (
    <section className="eagle" id="eagle" aria-label="Ask the Eagle">
      <Bird busy={busy} />
      <div className="eagle-talk">
        <p className="eagle-ask">
          <strong>Ask the Eagle.</strong> What else should we dig up on {person.name}?
        </p>

        {log.map((m, i) =>
          m.from === "you" ? (
            <p className="bubble you" key={i}>{m.text}</p>
          ) : (
            <div className="bubble" key={i}>
              <p className="saved">{opening(m, person)}</p>
              {m.text && <p className="found">{m.text}</p>}
              {m.leads && m.leads.length > 0 && (
                <ul className="leads">
                  {m.leads.map((l) => (
                    <li key={l.url}>
                      <a href={l.url} target="_blank" rel="noreferrer">{l.title || l.url}</a>
                    </li>
                  ))}
                </ul>
              )}
              {(m.text || (m.leads && m.leads.length > 0)) && (
                <p className="warn">
                  {m.preview
                    ? "Answered from the records on this page only. The live site also searches the web."
                    : "These are leads from an automated search, not records. Nothing here is checked until it appears above with a source."}
                </p>
              )}
              {m.saved && m.id && canNotify && <Notify id={m.id} />}
            </div>
          )
        )}

        {busy && (
          <figure className="founder" aria-live="polite">
            <p className="hunting">The Eagle is searching…</p>
            <blockquote>“{f.text}”</blockquote>
            <figcaption>{f.who} · {f.where}</figcaption>
          </figure>
        )}

        <form className="eagle-form" onSubmit={send}>
          <label className="sr" htmlFor="eagle-q">Your research question</label>
          <input
            id="eagle-q"
            value={text}
            maxLength={300}
            onChange={(e) => setText(e.target.value)}
            placeholder="A vote, a donor, a contract, a past statement…"
            disabled={busy}
          />
          <button id="eagle-send" type="submit" disabled={busy || text.trim().length < 5}>Send it</button>
        </form>
        <div className="ideas">
          {IDEAS.map((idea) => (
            <button key={idea} type="button" onClick={() => ask(idea)} disabled={busy}>{idea}</button>
          ))}
        </div>
        <p className="call-note">Public conduct only: votes, official actions, statements, filings. No home addresses, family or private life.</p>
        {onMatch && (
          <button type="button" className="eagle-match" id="eagle-match" onClick={onMatch}>
            Not sure who fits you? <strong>Let the Eagle ask you {questions} questions →</strong>
          </button>
        )}
      </div>
    </section>
  );
}
