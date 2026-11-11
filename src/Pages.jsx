import { useState } from "react";
import { fileUrl } from "./route.js";
import { top20, backdrop, asOf } from "./data/top20.js";
import { posts } from "./data/posts.js";
import { letters } from "./data/letters.js";
import { national, utah, utahNotes, forecasters, explain, venues, readAt } from "./data/markets.js";

const Out = ({ href, children }) => (
  <a href={fileUrl(href)} target="_blank" rel="noreferrer">{children}</a>
);

// Calls made on this site, added up per issue. Shown only once a shared tally exists.
function sitePulse(counts, issues) {
  if (!counts) return [];
  const per = {};
  for (const [key, c] of Object.entries(counts)) {
    const id = key.split(":")[0];
    per[id] = (per[id] || 0) + c.legit + c.fos;
  }
  return issues
    .map((i) => ({ name: i.name, n: per[i.id] || 0 }))
    .filter((r) => r.n > 0)
    .sort((a, b) => b.n - a.n);
}

function TopItem({ t, openIssue, bar }) {
  return (
    <li className="rank-row">
      <div className="rank-body">
        <div className="rank-head">
          <h3>{t.title}</h3>
          <span className="rank-stat">{t.stat}</span>
        </div>
        {bar && (
          <div className="rank-bar" role="img" aria-label={`${t.stat} of voters`}>
            <span style={{ width: t.stat }} />
          </div>
        )}
        <p className="rank-line">{t.line}</p>
        {(t.poll || t.note) && (
          <details className="rank-more">
            <summary>Where this number comes from</summary>
            {t.poll && <p className="rank-poll"><strong>Poll.</strong> {t.poll}</p>}
            {t.note && <p className="rank-poll"><strong>Note.</strong> {t.note}</p>}
          </details>
        )}
        <p className="rank-src">
          {t.sources.map((s) => (
            <Out key={s.url + s.label} href={s.url}>{s.label}</Out>
          ))}
          {t.issue && (
            <button className="linkish" onClick={() => openIssue(t.issue)}>See who said what</button>
          )}
        </p>
      </div>
    </li>
  );
}

export function Top20({ openIssue, counts, issues }) {
  const pulse = sitePulse(counts, issues || []);
  // One poll ranked these against each other, so they are sorted by its numbers. The rest come
  // from different polls and records with different units and are not ranked.
  const ranked = top20.filter((t) => t.basis === "poll").sort((x, y) => parseFloat(y.stat) - parseFloat(x.stat));
  const rest = top20.filter((t) => t.basis !== "poll");
  const deseret = top20.filter((t) => t.sources.some((s) => /deseret\.com/.test(s.url))).length;
  const dnPoll = top20.filter((t) => /Deseret News and the Hinckley/.test(t.poll || "")).length;
  return (
    <section className="doc" aria-label="Utah Top 20">
      <h2 className="doc-title">Utah Top 20</h2>
      <p className="doc-lede">Twenty things Utah voters and Utah news are focused on, as of {asOf}. Not a ranking, except where one poll ranked them.</p>

      <div className="caution">
        <h3>Where the numbers come from</h3>
        <ul>
          <li>{deseret} of the 20 cite the Deseret News. {dnPoll} use polls done for the Deseret News and the Hinckley Institute of Politics. Those polls were run by Morning Consult and asked registered Utah voters, not Deseret News readers.</li>
          <li>Who pays for a poll and how the question is worded can shape the answer. Open "Where this number comes from" on any item for the sponsor, dates and sample.</li>
          <li>This list is itself a choice about what to include. Tell the Eagle what is missing.</li>
        </ul>
      </div>

      {pulse.length > 0 && (
        <div className="backdrop">
          <h3>What visitors here are weighing in on</h3>
          <p>
            {pulse.map((r) => `${r.name}: ${r.n} ${r.n === 1 ? "call" : "calls"}`).join(" · ")}
          </p>
          <p className="rank-poll">
            <strong>Note.</strong> This counts Legit and Full of shit calls made on this site. People who use this site are
            not a sample of Utah voters.
          </p>
        </div>
      )}

      <h3 className="rank-group">What will most affect your vote?</h3>
      <p className="rank-poll">One August poll asked this. Highest share first. Voters could pick more than one, so the numbers add up to more than 100%.</p>
      <ul className="rank">
        {ranked.map((t) => <TopItem key={t.title} t={t} openIssue={openIssue} bar />)}
      </ul>

      <h3 className="rank-group">Also on Utah's plate</h3>
      <p className="rank-poll">Not ranked. Each number comes from a different poll or record, so they can't be compared with each other.</p>
      <ul className="rank">
        {rest.map((t) => <TopItem key={t.title} t={t} openIssue={openIssue} />)}
      </ul>

      <div className="backdrop">
        <h3>The backdrop</h3>
        <p>{backdrop.line}</p>
        <p className="rank-poll"><strong>Note.</strong> {backdrop.note}</p>
        <p className="rank-src"><Out href={backdrop.source.url}>{backdrop.source.label}</Out></p>
      </div>
    </section>
  );
}

function Split({ row }) {
  const total = row.dem + row.rep;
  const demW = (row.dem / total) * 100;
  return (
    <div className="split" title={`${row.venue}: Democrats ${row.dem}%, Republicans ${row.rep}%`}>
      <p className="split-venue">
        <Out href={row.url}>{row.venue}</Out>
        <span>{row.volume}</span>
      </p>
      <div className="split-bar" role="img" aria-label={`Democrats ${row.dem} percent, Republicans ${row.rep} percent`}>
        <span className="seg-dem" style={{ width: `${demW}%` }} />
        <span className="seg-rep" />
      </div>
      <p className="split-nums">
        <span><i className="key key-dem" />Democrats {row.dem}%</span>
        <span>Republicans {row.rep}%<i className="key key-rep" /></span>
      </p>
    </div>
  );
}

function Board({ title, groups }) {
  return (
    <div className="board">
      <h3>{title}</h3>
      {groups.map((g) => (
        <div className="board-race" key={g.race}>
          <h4>{g.race}</h4>
          {g.rows.map((r) => (
            <Split key={r.venue} row={r} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Odds() {
  return (
    <section className="doc" aria-label="The Odds">
      <h2 className="doc-title">The Odds</h2>
      <p className="doc-lede">What people trading real money on the midterms think will happen. Prices read {readAt}.</p>

      <div className="caution">
        <h3>Read this before the numbers</h3>
        <ul>
          {explain.map((e) => (
            <li key={e.head}>
              <strong>{e.head}</strong> {e.text} <Out href={e.url}>{e.label}</Out>
              {e.url2 && <> · <Out href={e.url2}>{e.label2}</Out></>}
            </li>
          ))}
        </ul>
      </div>

      <Board title="Nationally" groups={national} />
      <p className="rank-poll">
        The two sides of a market do not always add up to exactly 100, because buyers and sellers quote slightly different prices.
      </p>
      <p className="rank-poll">
        {forecasters.line}{" "}
        {forecasters.sources.map((s) => (
          <span key={s.url}><Out href={s.url}>{s.label}</Out> </span>
        ))}
      </p>

      <Board title="In Utah" groups={utah} />
      <ul className="odds-notes">
        {utahNotes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>

      <div className="backdrop">
        <h3>Where these numbers live</h3>
        <ul className="odds-notes">
          {venues.map((v) => (
            <li key={v.url}><Out href={v.url}>{v.name}</Out>. {v.about}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Block({ b }) {
  if (b.h) return <h3 className="post-h">{b.h}</h3>;
  if (b.p) return <p>{b.p}</p>;
  if (b.list) return <ul className="post-list">{b.list.map((x) => <li key={x}>{x}</li>)}</ul>;
  if (b.quote)
    return (
      <figure className="post-quote">
        <blockquote>“{b.quote}”</blockquote>
        <figcaption><Out href={b.url}>{b.who}</Out></figcaption>
      </figure>
    );
  if (b.links)
    return <ul className="post-list">{b.links.map((l) => <li key={l.url}><Out href={l.url}>{l.label}</Out></li>)}</ul>;
  if (b.letter)
    return (
      <details className="letter">
        <summary>{b.label}</summary>
        <pre>{letters[b.letter]}</pre>
      </details>
    );
  return null;
}

// Each post is its own card. Only the title and summary show until a reader opens it, so it is
// clear where one post ends and the next begins, and nobody has to scroll past a whole post.
// Another page can ask for a post to be open when the blog shows (a "Read the request" link).
let wanted = "";
export function wantPost(id) {
  wanted = id;
}

export function Blog() {
  const fromLink = wanted || (typeof location !== "undefined" ? location.hash.replace(/^#/, "") : "");
  wanted = "";
  const [open, setOpen] = useState(() => new Set(posts.some((p) => p.id === fromLink) ? [fromLink] : []));
  const toggle = (id) =>
    setOpen((was) => {
      const next = new Set(was);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  return (
    <section className="doc" aria-label="Blog">
      <h2 className="doc-title">Blog</h2>
      <p className="doc-lede">{posts.length} posts. Open one to read it.</p>
      <div className="posts">
        {posts.map((post) => {
          const on = open.has(post.id);
          return (
            <article className={on ? "post open" : "post"} id={post.id} key={post.id}>
              <p className="eyebrow">{post.date}</p>
              <h3 className="post-title">{post.title}</h3>
              <p className="post-dek">{post.dek}</p>
              {on && post.blocks.map((b, i) => <Block b={b} key={i} />)}
              <button type="button" className="post-toggle" aria-expanded={on} onClick={() => toggle(post.id)}>
                {on ? "Close this post" : "Read the post"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
