// The front door: one real record to read, then pick a state.
import { wantPost } from "./Pages.jsx";
import { useEffect, useRef, useState } from "react";
import { issues, people } from "./data/utah.js";
import { Bird, Mark } from "./Eagle.jsx";
import IssueReel from "./IssueReel.jsx";
import { FeedNudge } from "./Feed.jsx";
import { STATES, STATE_CODES } from "./route.js";
import { OPEN_STATES } from "./data/states/index.js";
import { proof } from "./data/states/proof.js";
import { QUESTIONS as UTAH_QUESTIONS } from "./data/match.js";
import StateSignup from "./StateSignup.jsx";
import { stateHeadlines } from "./data/stateHeadlines.js";
import { stateWatch } from "./data/stateWatch.js";
import { stateOfZip, STATE_NAMES, handZip } from "./zip.js";
import { track, setPageContext } from "./analytics.js";

// Open states by postal code: Utah plus every state in src/data/states/index.js.
const OPEN = STATE_CODES;
// States being built now (staging folders in progress as of Oct 20, 2026). Each opens only when
// its candidate list and votes are verified. Keep this list true: remove a state if work stops.
const CHECKING = new Set([]);
const NEXT = new Set([...stateHeadlines.map((h) => h.code), ...CHECKING].filter((c) => !OPEN[c]));
const OPEN_NAMES = Object.values(STATES);
const OPEN_LIST = OPEN_NAMES.length > 1 ? `${OPEN_NAMES.slice(0, -1).join(", ")} and ${OPEN_NAMES[OPEN_NAMES.length - 1]} are open.` : `${OPEN_NAMES[0]} is open.`;
// What is on file, counted from the data itself (Utah bundled, the rest from the build index).
const ON_FILE = (() => {
  const n = { people: people.length, quotes: 0, votes: 0 };
  for (const p of people) for (const e of Object.values(p.entries || {})) { n.quotes += (e.said || []).length; n.votes += (e.did || []).length; }
  for (const st of OPEN_STATES) if (st.onFile) { n.people += st.onFile.people; n.quotes += st.onFile.quotes; n.votes += st.onFile.votes; }
  return n;
})();
const roundDown = (n) => (n >= 1000 ? Math.floor(n / 100) * 100 : n >= 100 ? Math.floor(n / 10) * 10 : n);
// "Who votes like you" by state, with its number of questions, for people who don't know their ZIP.
const QUIZZES = [
  { slug: "utah", name: "Utah", n: UTAH_QUESTIONS.length },
  ...OPEN_STATES.filter((s) => s.match).map((s) => ({ slug: s.slug, name: s.name, n: s.questions || null })),
].sort((a, b) => a.name.localeCompare(b.name));
// Every other state and DC, for the plain list that replaced the tile map.
const ALL_CODES = Object.keys(STATE_NAMES).filter((c) => c !== "PR").sort((a, b) => STATE_NAMES[a].localeCompare(STATE_NAMES[b]));

export default function Home({ go }) {
  useEffect(() => {
    document.title = "Is your politician legit or full of shit? Check by ZIP | Legit or Full of Shit";
    setPageContext({ state: null, state_open: null });
    track("hero_viewed", {});
  }, []);
  const [wings, setWings] = useState(false);
  const [asked, setAsked] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setWings(true), 350);
    return () => clearTimeout(t);
  }, []);

  const openState = (slug) => go({ page: "state", state: slug, view: "records" });
  const openIssue = (id) => go({ page: "state", state: "utah", view: "records", issue: id });
  const askFor = (code) => {
    setAsked(code);
    setTimeout(() => document.getElementById("state-signup")?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  };

  return (
    <div className="home">
      <header className="home-hero" style={{ paddingBottom: 28 }}>
        <div className="home-hero-in">
          <div className="home-bird" aria-hidden="true">
            <Bird sky={false} spread={wings} />
          </div>
          <p className="home-brand">
            Legit <span className="or">or</span> <mark>Full of Shit</mark>
          </p>
          <h1 className="home-ask">
            Is your politician <span className="legit">legit</span> or <mark>full of shit</mark>?
          </h1>
          <p className="home-lede">Type your zip. Get the answer in 10 seconds, with the votes to prove it.</p>
          <ZipBox where="hero" go={go} openState={openState} />
          <QuizStart go={go} />
          <p className="home-who" id="who">
            The 2026 election is over. The record stays: what legislators, members of Congress and statewide officials said,
            next to what they did, and whether they now vote the way they talked. Word for word, with the source. No scores
            from us. You make the call.
          </p>
        </div>
      </header>

      {proof && <Proof go={go} />}

      <section className="home-how">
        <h2>How it works</h2>
        <ol>
          <li><strong>Find your officials.</strong> Type your ZIP or pick your state, and see everyone who was on your 2026 ballot.</li>
          <li><strong>Read both columns.</strong> Their words on one side, their votes and records on the other, each linked to its source.</li>
          <li><strong>Make the call.</strong> Legit, or full of shit. Then see how everyone else called it, and tell the official yourself.</li>
        </ol>
      </section>

      <div className="home-reel">
        <IssueReel issues={issues.filter((i) => i.id === "lake")} people={people} onOpen={openIssue} heading="The first proof state: Utah" />
      </div>

      <section className="home-next" aria-labelledby="next-head">
        <h2 id="next-head">Open now</h2>
        <p className="home-next-lede">The biggest fight on the record in each open state. Each state opened only when its candidate list and votes were verified.</p>
        <ul className="next-grid">
          {stateHeadlines.map((h) => (
            <li className="next-card" key={h.code}>
              <p className="next-state">{h.state}</p>
              <h3>{h.head}</h3>
              <p className="next-line">{h.line}</p>
              <p className="next-src"><a href={h.url} target="_blank" rel="noreferrer">{h.source}</a></p>
              {OPEN[h.code] ? (
                <a className="card-link" id={`next-${h.code}`} href={`/${OPEN[h.code]}/`} onClick={(e) => { e.preventDefault(); openState(OPEN[h.code]); }}>
                  See {h.state}'s records
                </a>
              ) : (
                <button type="button" className="linkish card-link" id={`next-${h.code}`} onClick={() => askFor(h.code)}>
                  Tell me when {h.state} opens
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="home-watch" aria-labelledby="watch-head">
        <h2 id="watch-head">Across the country</h2>
        <p className="home-next-lede">One fight on the record in every other state, each checked against its source. Swipe through, and ask to be told when your state opens.</p>
        <ul className="watch-row">
          {stateWatch.map((h) => (
            <li className="next-card watch-card" key={h.code}>
              <p className="next-state">{h.state}</p>
              <h3>{h.head}</h3>
              <p className="next-line">{h.line}</p>
              <p className="next-src"><a href={h.url} target="_blank" rel="noreferrer">{h.source}</a></p>
              <button type="button" className="linkish card-link" id={`watch-${h.code}`} onClick={() => askFor(h.code)}>
                Tell me when {h.state} opens
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="home-again" aria-label="Check your politicians by ZIP code">
        <h2>Check yours</h2>
        <ZipBox where="repeat" go={go} openState={openState} />
      </section>

      <section className="home-states" id="states">
        <h2>Every state</h2>
        <p>
          <strong>Open:</strong>{" "}
          {Object.entries(STATES).map(([slug, name], i, all) => (
            <span key={slug}>
              <a href={`/${slug}/`} id={`state-${slug}`} onClick={(e) => { e.preventDefault(); openState(slug); }}>{name}</a>
              {i < all.length - 1 ? " · " : ""}
            </span>
          ))}
        </p>
        <p className="home-states-rest">
          <strong>Not open yet</strong> (tap one to be told the day it opens):{" "}
          {ALL_CODES.filter((c) => !OPEN[c]).map((c, i, all) => (
            <span key={c}>
              <button type="button" className="linkish" id={`tile-${c}`} aria-pressed={asked === c} onClick={() => askFor(c)}>
                {STATE_NAMES[c]}
              </button>
              {CHECKING.has(c) ? " (being checked now)" : ""}
              {i < all.length - 1 ? " · " : ""}
            </span>
          ))}
        </p>
        {asked && <StateSignup key={asked} state={asked} next={NEXT.has(asked)} openUtah={() => openState("utah")} />}
      </section>

      <aside className="why home-why">
        <p>
          <strong>Why this exists.</strong> Every election I felt like I was getting the shaft, and I didn't know which
          politicians to trust. I was judging a book by its cover. I needed to truly know who I was voting for, so I put what
          they said next to what they did. It started at home in Utah, with the Great Salt Lake and the data centers.{" "}
          <button className="linkish" onClick={() => { wantPost("why-i-built-this"); go({ page: "state", state: "utah", view: "blog" }); }}>Read the story</button>
        </p>
      </aside>

      <footer className="foot home-foot">
        <FeedNudge plain where="home" onFeed={() => { go({ page: "state", state: "utah", view: "feed" }); window.scrollTo(0, 0); }} />
        <p className="foot-line foot-brand"><Mark /> The tallies are your opinion, not ours.</p>
        <nav className="foot-links" aria-label="Site rules and policies">
          {[["rules", "House rules"], ["terms", "Terms of service"], ["privacy", "Privacy"], ["corrections", "Send a correction"]].map(([id, label]) => (
            <button key={id} className="linkish" onClick={() => go({ page: "state", state: "utah", view: id })}>{label}</button>
          ))}
          <a className="linkish" id="foot-source" href="https://github.com/susanwelland/legit-or-full-of-shit-public" target="_blank" rel="noreferrer">Source code</a>
        </nav>
      </footer>
    </div>
  );
}

// One real record, straight from the data: a quote, then the same person's official vote on the
// same bill, each with its source. No label of ours on it; the reader makes the call.
function Proof({ go }) {
  const { person, said, did, measure, issue, context, state, stateName } = proof;
  const first = person.name.split(" ")[0];
  return (
    <section className="proof" aria-labelledby="proof-head">
      <p className="proof-kicker">One real record · {stateName}</p>
      <h2 id="proof-head" className="proof-name">
        {person.name} <span className="proof-office">({person.party}, {person.office})</span>
      </h2>
      <div className="proof-cols">
        <div className="proof-col">
          <p className="proof-label">What she said about {measure.id}</p>
          <blockquote className="proof-quote">“{said.text}”</blockquote>
          <p className="proof-src">
            {said.date}. {said.venue}.{" "}
            <a href={said.url} target="_blank" rel="noreferrer" onClick={() => track("quote_source_clicked", { state, where: "proof" })}>{said.source}</a>
          </p>
        </div>
        <div className="proof-col">
          <p className="proof-label">What she did</p>
          <p className="proof-vote"><strong>Voted {did.vote}</strong> on {did.measure}</p>
          <p className="proof-src">
            {did.date}. {did.motion}. {did.tally}.{" "}
            <a href={did.url} target="_blank" rel="noreferrer" onClick={() => track("vote_source_clicked", { state, state_open: true, where: "proof" })}>Official roll call (leginfo.legislature.ca.gov)</a>
          </p>
        </div>
      </div>
      <p className="proof-context">{context}</p>
      <p className="proof-call">
        Legit, or full of shit? You make the call.{" "}
        <a
          href={`/${state}/${issue.id}/${person.id}/`}
          id="proof-open"
          onClick={(e) => { e.preventDefault(); go({ page: "state", state, view: "records", issue: issue.id, person: person.id }); window.scrollTo(0, 0); }}
        >
          See {first}'s full record
        </a>
      </p>
    </section>
  );
}

// No ZIP handy: pick a state and take its "Who votes like you" questions.
function QuizStart({ go }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="quiz-start">
      <button type="button" className="linkish" id="quiz-start" aria-expanded={open} onClick={() => setOpen(!open)}>
        Don't know who to vote for? Ask the Eagle <span aria-hidden="true">🦅</span>
      </button>
      {open && (
        <p className="quiz-states">
          Pick your state:{" "}
          {QUIZZES.map((q, i) => (
            <span key={q.slug}>
              <a
                href={`/${q.slug}/match/`}
                id={`quiz-${q.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  track("quiz_link_clicked", { state: q.slug, state_open: true, where: "home" });
                  go({ page: "state", state: q.slug, view: "match" });
                  window.scrollTo(0, 0);
                }}
              >
                {q.name}{q.n ? ` (${q.n})` : ""}
              </a>
              {i < QUIZZES.length - 1 ? " · " : ""}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

// The front door: a ZIP in, the visitor's state out. The ZIP is read in the browser (first three
// digits to state); it is never sent anywhere, and analytics get only the state. The street address,
// for "only my races", is asked for on the state page, once the visitor wants it.
function ZipBox({ where, openState }) {
  const [zip, setZip] = useState("");
  const [result, setResult] = useState(null); // { code } after a ZIP outside the open states
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const id = (x) => (where === "hero" ? x : `${x}-${where}`);
  const boxRef = useRef(null);

  function submit(e) {
    e.preventDefault();
    const clean = zip.trim();
    const code = stateOfZip(clean);
    if (!code) {
      setResult(null);
      setError(/^\d{5}(-\d{4})?$/.test(clean) ? "We couldn't place that ZIP in a state. Check the five digits." : "Type a five-digit ZIP, like 84103.");
      track("zip_invalid", { where });
      return;
    }
    setError("");
    const slug = OPEN[code];
    track("zip_submitted", { state: code, state_open: !!slug, where });
    if (slug) {
      handZip(clean.slice(0, 5));
      openState(slug);
      window.scrollTo(0, 0);
      return;
    }
    setResult({ code });
    track("result_viewed", { state: code, state_open: false, where });
    // On a phone the result opens below the fold: bring the email box up into view.
    setTimeout(() => boxRef.current?.querySelector(".zip-result")?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
  }

  const name = result && (STATE_NAMES[result.code] || result.code);
  const checking = result && CHECKING.has(result.code);
  return (
    <div className="zip" ref={boxRef}>
      <form className="zip-form" onSubmit={submit} role="search" aria-label="Check your politicians by ZIP code">
        <label htmlFor={id("zip-input")} className="zip-label">Your ZIP code</label>
        <div className="zip-row">
          <input
            id={id("zip-input")}
            className="zip-input"
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={10}
            placeholder="ZIP code"
            value={zip}
            aria-describedby={id("zip-help")}
            aria-invalid={error ? true : undefined}
            onFocus={() => { if (!touched) { setTouched(true); track("zip_started", { where }); } }}
            onChange={(e) => setZip(e.target.value.replace(/[^\d-]/g, ""))}
          />
          <button type="submit" id={id("zip-go")} className="zip-go">Check my politicians</button>
        </div>
        <p id={id("zip-help")} className="zip-help" role={error ? "alert" : undefined}>
          {error || "Your ZIP stays in your browser. It is never sent or stored."}
        </p>
        <p className="zip-facts">
          {roundDown(ON_FILE.people).toLocaleString("en-US")}+ officials and candidates on file. Every quote linked to its source and every vote to its official record. Zero scores from us.
        </p>
      </form>
      {result && (
        <div className="zip-result" role="status">
          <StateSignup
            key={result.code}
            compact
            where={`zip-${where}`}
            state={result.code}
            next={checking}
            openUtah={() => openState("utah")}
            title={checking ? `We're checking ${name} now.` : `${name} isn't open yet.`}
            lede={`Drop your email and we'll tell you the day ${name} opens.`}
          />
          <p className="zip-open-now">Open now: {OPEN_LIST.replace(/ are open\.$| is open\.$/, "")}.</p>
        </div>
      )}
    </div>
  );
}
