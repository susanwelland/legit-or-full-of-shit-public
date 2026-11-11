import { useMemo, useState } from "react";
import { contacts } from "./data/contacts.js";

export function buildEmail({ person, issue, call, name, place }) {
  const e = person.entries[issue.id];
  const legit = call === "legit";
  const subject = legit ? `Thank you for your record on ${issue.name}` : `Please explain your record on ${issue.name}`;
  const lines = [];
  lines.push(`Dear ${person.name},`, "");
  lines.push(`I am a voter in ${place || "[your city or ZIP]"}. I looked up what you have said and done on ${issue.name}.`, "");
  lines.push(
    legit
      ? "From what I found, your record holds up, and I wanted to say thank you."
      : "From what I found, your words and your record do not line up, and I would like you to explain."
  );
  lines.push("");
  if (e.said.length) {
    lines.push("What you said:");
    for (const q of e.said) lines.push(`"${q.text}" (${q.date}, ${q.venue}) ${q.url}`);
  } else {
    lines.push(`I could not find a public statement from you on ${issue.name}.`);
  }
  lines.push("");
  if (e.did.length) {
    lines.push("What the record shows:");
    for (const r of e.did) lines.push(`${r.measure}, ${r.motion}, ${r.date}: ${r.vote}. ${r.url}`);
  } else {
    lines.push(`I could not find a vote or official record from you on ${issue.name}.`);
  }
  lines.push("");
  lines.push(
    legit
      ? "Please keep it up. I will be watching how you handle this going forward."
      : "Please tell me how these fit together, and what you plan to do about it."
  );
  lines.push("", "Sincerely,", name || "[Your name]", "[Your street address. Many offices only answer people who live in the district.]");
  return { subject, body: lines.join("\n") };
}

// For someone with no public statement on file: ask them where they stand, and say the voter
// looked. Facts only, from the file.
const topicOf = (n) => (/^(Great|Flock)\b/.test(n) ? n : n[0].toLowerCase() + n.slice(1));
export function buildAsk({ person, issue, name, place }) {
  const topic = topicOf(issue.name);
  const e = person.entries[issue.id] || { said: [], did: [] };
  const lines = [`Dear ${person.name},`, ""];
  lines.push(`I am a voter in ${place || "[your city or ZIP]"}. Before I vote, I looked for where you stand on ${topic} on legitorfullofshit.com, which puts candidates' public statements next to their votes, each with its source. I could not find a public statement from you on it.`);
  if (person.noAnswer) lines.push("", `${person.noAnswer.source}'s 2026 candidate questionnaire page also says: "${person.noAnswer.text}" (${person.noAnswer.url})`);
  if (e.did.length) {
    lines.push("", "What I did find is how you voted:");
    for (const r of e.did) lines.push(`${r.measure}, ${r.motion}, ${r.date}: ${r.vote}. ${r.url}`);
  }
  lines.push("", `Where do you stand on ${topic}, and why? A link to anything you have said publicly would help me and other voters.`);
  lines.push("", "Sincerely,", name || "[Your name]", "[Your street address. Many offices only answer people who live in the district.]");
  return { subject: `Where do you stand on ${topic}?`, body: lines.join("\n") };
}

function CopyButton({ id, text, label }) {
  const [done, setDone] = useState(false);
  return (
    <button
      id={id}
      type="button"
      className="copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          setDone(false);
        }
      }}
    >
      {done ? "Copied" : label}
    </button>
  );
}

export default function Composer({ person, issue, call, mode }) {
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [edited, setEdited] = useState(null);
  const draft = useMemo(
    () => (mode === "ask" ? buildAsk({ person, issue, name, place }) : buildEmail({ person, issue, call, name, place })),
    [person, issue, call, name, place, mode]
  );
  const body = edited === null ? draft.body : edited;
  const c = contacts[person.id] || {};
  const mailto = c.email ? `mailto:${c.email}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(body)}` : null;

  return (
    <div className="composer">
      <div className="composer-you">
        <label className="field" htmlFor={`c-name-${person.id}`}>
          Your name
          <input id={`c-name-${person.id}`} value={name} onChange={(e) => { setName(e.target.value); setEdited(null); }} />
        </label>
        <label className="field" htmlFor={`c-place-${person.id}`}>
          Your city or ZIP
          <input id={`c-place-${person.id}`} value={place} onChange={(e) => { setPlace(e.target.value); setEdited(null); }} />
        </label>
      </div>

      <div className="composer-row">
        <span className="composer-label">To</span>
        {c.email ? (
          <>
            <span className="composer-value" id={`c-to-${person.id}`}>{c.email}</span>
            <CopyButton id={`copy-to-${person.id}`} text={c.email} label="Copy address" />
          </>
        ) : (
          <span className="composer-value">
            No confirmed email address on file.{" "}
            {c.page ? (
              <a href={c.page} target="_blank" rel="noreferrer">Use the {c.pageLabel}</a>
            ) : /^Utah (House|Senate)/.test(person.office) ? (
              <a href="https://le.utah.gov/" target="_blank" rel="noreferrer">Find legislators' addresses at le.utah.gov</a>
            ) : null}
          </span>
        )}
      </div>
      {c.email && (
        <p className="call-note">
          {c.kind === "office" ? "Official office address" : "Address published by the campaign"}, from{" "}
          <a href={c.source} target="_blank" rel="noreferrer">this page</a>.
        </p>
      )}

      <div className="composer-row">
        <span className="composer-label">Subject</span>
        <span className="composer-value">{draft.subject}</span>
        <CopyButton id={`copy-subject-${person.id}`} text={draft.subject} label="Copy subject" />
      </div>

      <label className="sr" htmlFor={`c-body-${person.id}`}>Email text</label>
      <textarea id={`c-body-${person.id}`} className="composer-body" rows={14} value={body} onChange={(e) => setEdited(e.target.value)} />

      <div className="composer-actions">
        <CopyButton id={`copy-body-${person.id}`} text={body} label="Copy email text" />
        {mailto && <a className="copy" href={mailto}>Open in your email app</a>}
      </div>
      <p className="call-note">
        Edit anything. It goes out in your name, from your own email. If the email app button does nothing, copy the
        three parts and paste them into a new message.
      </p>
    </div>
  );
}

export function TakeAction({ calls, people, issues, goRecords }) {
  const [open, setOpen] = useState(null);
  const mine = Object.entries(calls)
    .map(([key, call]) => {
      const [issueId, personId] = key.split(":");
      return { key, call, person: people.find((p) => p.id === personId), issue: issues.find((i) => i.id === issueId) };
    })
    .filter((m) => m.person && m.issue);

  return (
    <section className="doc" aria-label="Take action">
      <h2 className="doc-title">Take action</h2>
      <p className="doc-lede">
        Tell them yourself. Every call you make turns into an email you can copy, edit and send, with what they said and
        what they did already filled in.
      </p>
      {mine.length === 0 ? (
        <div className="caution">
          <h3>Make a call first</h3>
          <p>Pick a candidate, read the record, and call it Legit or Full of shit. Your emails will show up here.</p>
          <button className="panel-go" id="action-go" onClick={goRecords}>Go to the records</button>
        </div>
      ) : (
        <ul className="actions">
          {mine.map((m) => (
            <li className="action" key={m.key}>
              <div className="action-head">
                <div>
                  <h3>{m.person.name}</h3>
                  <p className="who-ballot">{m.person.office} · {m.issue.name}</p>
                </div>
                <span className={`vote ${m.call === "legit" ? "yea" : "nay"}`}>{m.call === "legit" ? "Legit" : "Full of shit"}</span>
                <button className="panel-go" id={`write-${m.person.id}-${m.issue.id}`} onClick={() => setOpen(open === m.key ? null : m.key)}>
                  {open === m.key ? "Close" : "Write email now"}
                </button>
              </div>
              {open === m.key && <Composer person={m.person} issue={m.issue} call={m.call} />}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
