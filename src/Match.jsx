// "Who votes like you": the Eagle asks a few yes/no questions, each tied to one real recorded vote,
// then shows how the people in your races actually voted. It counts votes; it does not endorse
// anyone. Answers stay in this browser tab and are never sent anywhere.
import { useEffect, useMemo, useState } from "react";
import { QUESTIONS as UTAH_QUESTIONS, sideOf } from "./data/match.js";
import { Mark } from "./Eagle.jsx";
import { track } from "./analytics.js";

function voteOn(person, q) {
  const e = person.entries[q.issue];
  if (!e) return null;
  const names = q.measures || [q.measure];
  // `last`: the person's final recorded vote on the measure (final passage), not an earlier reading.
  const did = q.last ? [...e.did].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)) : e.did;
  const r = did.find((d) => names.includes(d.measure) && sideOf(d.vote)) || did.find((d) => names.includes(d.measure));
  return r ? { side: sideOf(r.vote), vote: r.vote, record: r } : null;
}

export default function Match({ people, placed, mine, open, goFinder, questions = UTAH_QUESTIONS, gaps = [], stateSlug = null }) {
  const QUESTIONS = questions;
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(0);
  const [everyone, setEveryone] = useState(!placed);
  const done = step >= QUESTIONS.length;

  // quiz_started fires once per visit to the questions (the home page's state links fire their own).
  useEffect(() => { track("quiz_started", { state: stateSlug, state_open: true, where: "state_page" }); }, []);

  function answer(id, value) {
    setAnswers((a) => ({ ...a, [id]: value }));
    const next = step + 1;
    setStep(next);
    track("quiz_question_answered", { state: stateSlug, n: next, of: QUESTIONS.length, skipped: value === "skip" });
    if (next >= QUESTIONS.length) track("quiz_completed", { state: stateSlug, of: QUESTIONS.length, answered: Object.keys({ ...answers, [id]: value }).filter((k) => ({ ...answers, [id]: value })[k] !== "skip").length });
  }

  const asked = QUESTIONS.filter((q) => answers[q.id] === "yes" || answers[q.id] === "no");
  const rows = useMemo(() => {
    if (!done) return [];
    const pool = everyone || !placed ? people : people.filter(mine);
    return pool
      .map((p) => {
        const marks = asked.map((q) => {
          const v = voteOn(p, q);
          return { q, v, same: v && v.side ? v.side === answers[q.id] : null };
        });
        const compared = marks.filter((m) => m.v && m.v.side);
        const same = compared.filter((m) => m.same).length;
        return { p, marks, compared: compared.length, same };
      })
      .sort((a, b) => (b.compared ? b.same / b.compared : -1) - (a.compared ? a.same / a.compared : -1) || b.compared - a.compared || a.p.name.localeCompare(b.p.name));
  }, [done, everyone, placed, answers]);
  const withVotes = rows.filter((r) => r.compared > 0);
  // In your races, everyone is listed. Statewide, only those with something said on file.
  const noVotes = rows.filter((r) => r.compared === 0 && ((placed && !everyone) || Object.values(r.p.entries).some((e) => e.said.length)));

  return (
    <section className="doc match" aria-label="Who votes like you">
      {gaps.map((g) => (
        <p className="gap-notice" role="status" key={g.label}>
          <strong>{g.label}: we don't have the official candidate list yet.</strong> {g.note} That race is left out of this comparison until the official list is in.
        </p>
      ))}
      <div className="match-head">
        <Mark />
        <div>
          <h2 className="doc-title">Who votes like you?</h2>
          <p className="doc-lede">
            The Eagle asks {QUESTIONS.length} quick questions. Each one is a real vote. Then you see how the people in your races
            actually voted, with the roll call. It counts votes. It doesn't tell you who to vote for.
          </p>
        </div>
      </div>

      {!done && (
        <div className="match-q" key={QUESTIONS[step].id}>
          <p className="match-step">Question {step + 1} of {QUESTIONS.length}</p>
          <h3>{QUESTIONS[step].ask}</h3>
          <div className="match-answers">
            <button type="button" className="panel-go" id="match-yes" onClick={() => answer(QUESTIONS[step].id, "yes")}>Yes</button>
            <button type="button" className="panel-go" id="match-no" onClick={() => answer(QUESTIONS[step].id, "no")}>No</button>
            <button type="button" className="linkish" id="match-skip" onClick={() => answer(QUESTIONS[step].id, "skip")}>Not sure, skip</button>
          </div>
          <p className="match-src">The real vote: {QUESTIONS[step].note}</p>
          {step > 0 && (
            <button type="button" className="linkish" onClick={() => setStep(step - 1)}>Back</button>
          )}
        </div>
      )}

      {done && asked.length === 0 && (
        <div className="match-q">
          <h3>You skipped every question, so there's nothing to compare.</h3>
          <button type="button" className="panel-go" onClick={() => { setAnswers({}); setStep(0); }}>Start over</button>
        </div>
      )}

      {done && asked.length > 0 && (
        <>
          <div className="match-bar">
            <p>
              {everyone || !placed ? "Everyone on file" : "People in your races"} · compared on {asked.length}{" "}
              {asked.length === 1 ? "vote" : "votes"}
            </p>
            <div className="match-tools">
              {placed ? (
                <button type="button" className="linkish" onClick={() => setEveryone(!everyone)}>
                  {everyone ? "Only my races" : "Show everyone on file"}
                </button>
              ) : (
                <button type="button" className="linkish" onClick={goFinder}>Pick where you vote</button>
              )}
              <button type="button" className="linkish" onClick={() => { setAnswers({}); setStep(0); }}>Start over</button>
            </div>
          </div>

          <p className="match-fine">
            This only counts recorded votes on these measures. A vote can be about more than one thing, and missing a vote
            isn't counted either way. Read their file before you decide.
          </p>

          <ol className="match-list">
            {withVotes.map(({ p, marks, compared, same }) => (
              <li className="match-row" key={p.id}>
                <div className="match-who">
                  <button type="button" className="match-name" onClick={() => open(p.id, (marks.find((m) => m.v && m.v.side) || marks[0]).q.issue)}>
                    {p.name}
                  </button>
                  <span className="pick-office">{p.office} · {p.party}</span>
                </div>
                <p className="match-score">
                  <strong>Voted your way on {same} of {compared}</strong>
                </p>
                <ul className="match-marks">
                  {marks.map(({ q, v, same: s }) => (
                    <li key={q.id} className={v && v.side ? (s ? "same" : "diff") : "none"}>
                      <span className="match-icon" aria-hidden="true">{v && v.side ? (s ? "✓" : "✗") : "–"}</span>
                      <span>
                        {q.ask} <em>You: {answers[q.id] === "yes" ? "Yes" : "No"}.</em>{" "}
                        {v && v.side ? (
                          <>
                            They voted <a href={v.record.url} target="_blank" rel="noreferrer" onClick={() => track("vote_source_clicked", { where: "quiz" })}>{v.vote}</a> ({v.record.measure}, {v.record.date}).
                          </>
                        ) : v ? (
                          <>
                            Recorded as <a href={v.record.url} target="_blank" rel="noreferrer" onClick={() => track("vote_source_clicked", { where: "quiz" })}>{v.vote.toLowerCase()}</a>, not counted.
                          </>
                        ) : (
                          "No vote on this."
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>

          {noVotes.length > 0 && (
            <div className="backdrop">
              <h3>No votes to compare</h3>
              <p className="rank-poll">
                These people haven't voted on these measures. Some have said where they stand: open their file to read it.
              </p>
              <ul className="match-novote">
                {noVotes.map(({ p }) => {
                  const issue = Object.keys(p.entries).find((k) => p.entries[k].said.length) || Object.keys(p.entries)[0];
                  return (
                    <li key={p.id}>
                      {issue ? (
                        <button type="button" className="linkish" onClick={() => open(p.id, issue)}>{p.name}</button>
                      ) : (
                        <span>{p.name}</span>
                      )}{" "}
                      <span className="pick-office">{p.office}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
