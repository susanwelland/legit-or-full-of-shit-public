// Agree to Disagree: the comment board. Every thread starts from a real vote, opened by Angelica,
// the site's AI host, with the record and the roll call. People join with an email link.
// The server (server/board.js) decides what anyone may see or post; this page only shows it.
import { useEffect, useRef, useState } from "react";
import { track } from "./analytics.js";
import { readRoute, writeRoute } from "./route.js";
import { Angelica, Avatar, AVATAR_IDS, avatarLabel } from "./BoardArt.jsx";
import BoardAdmin from "./BoardAdmin.jsx";

const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const LS_SESSION = "lofs-board";
const RESERVED = new Set(["admin", "join"]);

function readSession() {
  try {
    return localStorage.getItem(LS_SESSION) || "";
  } catch {
    return "";
  }
}
function saveSession(v) {
  try {
    if (v) localStorage.setItem(LS_SESSION, v);
    else localStorage.removeItem(LS_SESSION);
  } catch {
    /* signed in for this visit only */
  }
}

async function call(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const s = readSession();
  if (s) headers["X-Board"] = s;
  const r = await fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(b.error || "That did not go through. Try again.");
    err.status = r.status;
    throw err;
  }
  return b;
}

export const BOARD_RULES = [
  "Argue about the vote, not anyone's family or private life.",
  "No threats, ever.",
  "No one's personal information: no addresses, phone numbers or private details.",
  "Bring a link for factual claims. New accounts can name the source until links unlock.",
  "New accounts' first comments get a quick check before they show.",
  "Spam is removed.",
];

const ago = (iso) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

// Plain text, with web addresses made into links that pass no ranking credit.
function Linked({ text }) {
  const parts = String(text).split(/(https?:\/\/[^\s<>"]+)/g);
  return parts.map((p, i) => {
    if (i % 2 === 0) return p;
    const m = p.match(/^(.*?)([.,;:!?)\]]*)$/);
    return (
      <span key={i}>
        <a href={m[1]} target="_blank" rel="nofollow ugc noopener">{m[1]}</a>
        {m[2]}
      </span>
    );
  });
}

const voteClass = (v) => (/^yea$/i.test(v) ? "yea" : /^nay$/i.test(v) ? "nay" : "other");

function HostLabel() {
  return <span className="bd-ai">AI host · not a person</span>;
}

function HostCard() {
  return (
    <section className="bd-side-card" aria-labelledby="bd-host-h">
      <div className="bd-host-row">
        <Angelica size={64} />
        <div>
          <h3 id="bd-host-h">Angelica</h3>
          <HostLabel />
        </div>
      </div>
      <p>
        Angelica opens every thread with the record: the bill, the official roll call and what members said, each with
        its source. She never takes a side. The argument is yours.
      </p>
    </section>
  );
}

function RulesCard() {
  return (
    <section className="bd-side-card" aria-labelledby="bd-rules-h">
      <h3 id="bd-rules-h">House rules</h3>
      <ul className="bd-rules">
        {BOARD_RULES.map((r) => <li key={r}>{r}</li>)}
      </ul>
    </section>
  );
}

function MeCard({ me, onJoin, onSignOut }) {
  if (!me && !onJoin) return null; // already on the join screen
  if (!me) {
    return (
      <section className="bd-side-card">
        <p>Read freely. To vote or post, join with your email. No password.</p>
        <button type="button" className="panel-go bd-tap" id="bd-join-side" onClick={onJoin}>Join to post</button>
      </section>
    );
  }
  return (
    <section className="bd-side-card bd-me" aria-label="Signed in">
      <div className="bd-host-row">
        <Avatar id={me.avatar} size={44} />
        <div>
          <p className="bd-me-name">@{me.username}</p>
          <p className="bd-fine">{me.held ? "Your comments get a quick check before they show." : me.linksOk ? "Links are on for you." : "Links unlock after a few approved posts."}</p>
        </div>
      </div>
      <button type="button" className="linkish bd-tap-inline" id="bd-signout" onClick={onSignOut}>Sign out</button>
    </section>
  );
}

// ---- Board list ----
const ROOMS = [
  { id: "everyone", label: "Everyone" },
  { id: "utah", label: "Utah" },
];

function BoardList({ room, setRoom, openThread }) {
  const [threads, setThreads] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setThreads(null);
    setError("");
    call(`/api/board/threads?room=${room}`).then((b) => setThreads(b.threads)).catch((e) => setError(e.message));
  }, [room]);
  return (
    <div className="bd-main">
      <div className="bd-rooms" role="tablist" aria-label="Rooms">
        {ROOMS.map((r) => (
          <button key={r.id} type="button" role="tab" id={`bd-room-${r.id}`} aria-selected={room === r.id} className={room === r.id ? "bd-room on" : "bd-room"} onClick={() => setRoom(r.id)}>
            {r.label}
          </button>
        ))}
        <span className="bd-room soon" aria-disabled="true">Other states · opening soon</span>
      </div>
      {error && <p className="call-note" role="alert">{error}</p>}
      {!threads && !error && <p className="empty">Loading threads…</p>}
      {threads && threads.length === 0 && (
        <p className="empty">{room === "everyone" ? "No threads for the whole country yet. Angelica opens one when a national vote is on file." : "No threads here yet."}</p>
      )}
      {threads && threads.length > 0 && (
        <ul className="bd-threads">
          {threads.map((t) => (
            <li key={t.slug}>
              <a className="bd-card" id={`bd-thread-${t.slug}`} href={`/utah/board/${t.slug}`} onClick={(e) => { e.preventDefault(); openThread(t.slug); }}>
                <span className="bd-card-top">
                  <span className="bd-chip">{t.room === "utah" ? "Utah" : "Everyone"}</span>
                  {t.issue && <span className="bd-issue">{t.issue}</span>}
                </span>
                <span className="bd-card-title">{t.title}</span>
                <span className="bd-card-q">{t.question}</span>
                <span className="bd-card-meta">
                  <span>Opened by Angelica · AI host</span>
                  <span>{t.comments} {t.comments === 1 ? "comment" : "comments"}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---- One thread ----
function Thumbs({ mine, counts, disabled, onVote, idPrefix, small }) {
  return (
    <div className={small ? "bd-thumbs small" : "bd-thumbs"}>
      {[["up", "Thumbs up", "👍"], ["down", "Thumbs down", "👎"]].map(([v, label, icon]) => (
        <button key={v} type="button" id={`${idPrefix}-${v}`} className={mine === v ? `bd-thumb ${v} on` : `bd-thumb ${v}`} aria-pressed={mine === v} aria-label={label} disabled={disabled} onClick={() => onVote(v)}>
          <span aria-hidden="true">{icon}</span>
          {counts && <span className="bd-n">{counts[v]}</span>}
        </button>
      ))}
    </div>
  );
}

function CommentForm({ slug, parentId, onPosted, onCancel, me }) {
  const [body, setBody] = useState("");
  const [hp, setHp] = useState("");
  const [status, setStatus] = useState("idle");
  const [msg, setMsg] = useState("");
  const shown = useRef(Date.now());
  const id = parentId ? `bd-reply-${parentId}` : "bd-comment";
  async function send(e) {
    e.preventDefault();
    setStatus("sending");
    setMsg("");
    try {
      const b = await call(`/api/board/threads/${slug}/comments`, { method: "POST", body: { body, parent_id: parentId || null, hp, t: Date.now() - shown.current } });
      track("comment_post", { thread: slug, reply: Boolean(parentId), held: Boolean(b.held) });
      setBody("");
      setStatus("idle");
      setMsg(b.held ? "Posted. It shows to everyone after a quick check." : "");
      onPosted(b.comment);
    } catch (err) {
      setStatus("idle");
      setMsg(err.message);
    }
  }
  return (
    <form className="bd-form" onSubmit={send} aria-label={parentId ? "Write a reply" : "Write a comment"}>
      <label htmlFor={id} className={parentId ? "sr" : "bd-label"}>{parentId ? "Your reply" : `Say why, @${me.username}`}</label>
      <textarea id={id} value={body} maxLength={2000} rows={parentId ? 3 : 5} required onChange={(e) => setBody(e.target.value)} placeholder="Argue about the vote, not the person's family." />
      <div className="bd-hp" aria-hidden="true">
        <label htmlFor={`${id}-website`}>Leave this empty</label>
        <input id={`${id}-website`} name="website" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
      </div>
      <div className="bd-form-row">
        <span className="bd-fine">{body.length}/2000</span>
        {onCancel && <button type="button" className="linkish bd-tap-inline" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="panel-go bd-tap" id={`${id}-send`} disabled={status === "sending" || !body.trim()}>
          {status === "sending" ? "Posting…" : parentId ? "Reply" : "Post"}
        </button>
      </div>
      {msg && <p className="call-note" role="status">{msg}</p>}
    </form>
  );
}

function Comment({ c, replies, me, slug, onJoin, update, addReply }) {
  const [replying, setReplying] = useState(false);
  const [err, setErr] = useState("");
  async function vote(v) {
    if (!me) return onJoin();
    try {
      const r = await call(`/api/board/comments/${c.id}/vote`, { method: "POST", body: { value: v } });
      update(c.id, { up: r.up, down: r.down, mine: r.mine });
      track("comment_vote", { thread: slug, value: r.mine || "clear" });
    } catch (e) {
      setErr(e.message);
    }
  }
  async function report() {
    if (!me) return onJoin();
    try {
      await call(`/api/board/comments/${c.id}/report`, { method: "POST", body: {} });
      update(c.id, { reported: true });
      track("comment_report", { thread: slug });
    } catch (e) {
      setErr(e.message);
    }
  }
  return (
    <li className={c.note ? "bd-comment held" : "bd-comment"} id={`bd-c-${c.id}`}>
      <div className="bd-c-head">
        <Avatar id={c.avatar} size={36} />
        <span className="bd-c-name">@{c.username}</span>
        <span className="bd-fine">{ago(c.created_at)}</span>
      </div>
      {c.note && <p className="bd-note">{c.note}</p>}
      <p className="bd-c-body"><Linked text={c.body} /></p>
      {!c.note && (
        <div className="bd-c-actions">
          <Thumbs mine={c.mine} counts={{ up: c.up, down: c.down }} onVote={vote} idPrefix={`bd-cv-${c.id}`} small />
          {me && !c.parent_id && (
            <button type="button" className="linkish bd-tap-inline" id={`bd-replyopen-${c.id}`} onClick={() => setReplying((v) => !v)}>Reply</button>
          )}
          {!c.own && (
            c.reported ? <span className="bd-fine">Reported. Thanks.</span> : (
              <button type="button" className="linkish bd-tap-inline bd-report" id={`bd-report-${c.id}`} onClick={report}>Report</button>
            )
          )}
        </div>
      )}
      {err && <p className="call-note" role="alert">{err}</p>}
      {(replies.length > 0 || replying) && (
        <ul className="bd-replies">
          {replies.map((r) => (
            <Comment key={r.id} c={r} replies={[]} me={me} slug={slug} onJoin={onJoin} update={update} addReply={addReply} />
          ))}
          {replying && (
            <li>
              <CommentForm slug={slug} parentId={c.id} me={me} onCancel={() => setReplying(false)} onPosted={(nc) => { addReply(nc); setReplying(false); }} />
            </li>
          )}
        </ul>
      )}
    </li>
  );
}

function Thread({ slug, me, onJoin, back, openPerson, setMe }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [voteErr, setVoteErr] = useState("");
  useEffect(() => {
    setData(null);
    call(`/api/board/threads/${slug}`)
      .then((b) => {
        setData(b);
        document.title = `${b.thread.title} | Agree to Disagree | Legit or Full of Shit`;
        track("thread_view", { thread: slug });
      })
      .catch((e) => setError(e.status === 404 ? "This thread is not here. It may have been removed." : e.message));
  }, [slug, me && me.username]);
  if (error) return <div className="bd-main"><p className="empty" role="alert">{error}</p><button type="button" className="linkish bd-tap-inline" onClick={back}>← All threads</button></div>;
  if (!data) return <div className="bd-main"><p className="empty">Loading…</p></div>;
  const { thread, receipt, record, comments } = data;
  const update = (id, patch) => setData((d) => ({ ...d, comments: d.comments.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const addComment = (c) => setData((d) => ({ ...d, comments: [...d.comments, c] }));
  async function voteThread(v) {
    if (!me) return onJoin();
    setVoteErr("");
    try {
      const r = await call(`/api/board/threads/${slug}/vote`, { method: "POST", body: { value: v } });
      setData((d) => ({ ...d, mine: r.mine, counts: r.counts }));
      track("thread_vote", { thread: slug, value: r.mine || "clear" });
    } catch (e) {
      setVoteErr(e.message);
    }
  }
  const top = comments.filter((c) => !c.parent_id);
  const repliesOf = (id) => comments.filter((c) => c.parent_id === id);
  return (
    <article className="bd-main bd-thread" aria-labelledby="bd-thread-title">
      <a className="bd-back" href="/utah/board" onClick={(e) => { e.preventDefault(); back(); }}>← All threads</a>
      <p className="bd-card-top">
        <span className="bd-chip">{thread.room === "utah" ? "Utah" : "Everyone"}</span>
        {thread.issue && <span className="bd-issue">{thread.issue}</span>}
      </p>
      <h2 id="bd-thread-title" className="bd-title">{thread.title}</h2>

      <section className="bd-opener" aria-label="Angelica's opener">
        <div className="bd-host-row">
          <Angelica size={56} />
          <div>
            <p className="bd-host-name">Angelica</p>
            <HostLabel />
          </div>
        </div>
        {thread.opener.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
        {receipt && (
          <div className="bd-receipt">
            <p className="bd-receipt-h">The receipt</p>
            <p>
              <a href={receipt.url} target="_blank" rel="noreferrer" id="bd-receipt-link">{receipt.id}, {receipt.title}</a>
            </p>
            <ul>
              {receipt.votes.map((v) => (
                <li key={v.url}>
                  <span>{v.motion}</span> <span className="bd-fine">{v.date} · {v.tally}</span>{" "}
                  <a href={v.url} target="_blank" rel="noreferrer" className="bd-rollcall">Official roll call</a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {record.length > 0 && (
        <section className="bd-record" aria-labelledby="bd-record-h">
          <h3 id="bd-record-h" className="bd-section-h">On the record</h3>
          <div className="bd-record-grid">
            {record.map((r) => (
              <figure className="bd-rec" key={r.person}>
                <div className="record-top">
                  <a href={`/utah/${thread.issue_id}/${r.person}`} className="bd-rec-name" onClick={(e) => { e.preventDefault(); openPerson(r.person, thread.issue_id); }}>{r.name}</a>
                  <span className={`vote ${voteClass(r.vote.value)}`}>{r.vote.value}</span>
                </div>
                <p className="bd-fine">{r.office} · {r.party}</p>
                <p className="bd-fine">{r.vote.motion}, {r.vote.date}. <a href={r.vote.url} target="_blank" rel="noreferrer">Roll call</a></p>
                {r.quote ? (
                  <>
                    <blockquote>“{r.quote.text.replace(/,$/, "")}”</blockquote>
                    <figcaption className="bd-fine">
                      {r.quote.date} · {r.quote.venue}.{" "}
                      <a href={r.quote.url} target="_blank" rel="noreferrer">{r.quote.source}</a>
                    </figcaption>
                    {r.quote.note && <p className="quote-note">{r.quote.note}</p>}
                  </>
                ) : (
                  <p className="empty">No quote on file.</p>
                )}
              </figure>
            ))}
          </div>
        </section>
      )}

      <section className="bd-question" aria-labelledby="bd-q-h">
        <h3 id="bd-q-h">{thread.question}</h3>
        <Thumbs mine={data.mine} counts={data.counts} onVote={voteThread} idPrefix="bd-tv" />
        <p className="bd-fine" id="bd-tally-note">
          {!me ? "Join to vote. The count shows after you vote." : data.counts ? `${data.counts.up + data.counts.down} ${data.counts.up + data.counts.down === 1 ? "vote" : "votes"} so far. Tap yours again to take it back.` : "Vote to see how everyone else voted."}
        </p>
        {voteErr && <p className="call-note" role="alert">{voteErr}</p>}
      </section>

      <section className="bd-comments" aria-labelledby="bd-comments-h">
        <h3 id="bd-comments-h" className="bd-section-h">{top.length ? `${comments.length} ${comments.length === 1 ? "comment" : "comments"}` : "No comments yet"}</h3>
        {me ? (
          <CommentForm slug={slug} me={me} onPosted={(c) => { addComment(c); call("/api/board/me").then((b) => setMe(b.user)).catch(() => {}); }} />
        ) : (
          <div className="bd-joinbox">
            <p>Say why. Join with your email to post: no password, just a link.</p>
            <button type="button" className="panel-go bd-tap" id="bd-join-post" onClick={onJoin}>Join to post</button>
          </div>
        )}
        <ul className="bd-list">
          {top.map((c) => (
            <Comment key={c.id} c={c} replies={repliesOf(c.id)} me={me} slug={slug} onJoin={onJoin} update={update} addReply={addComment} />
          ))}
        </ul>
      </section>
    </article>
  );
}

// ---- Join ----
function Join({ me, back }) {
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("doodle");
  const [email, setEmail] = useState("");
  const [agree, setAgree] = useState(false);
  const [hp, setHp] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent
  const [msg, setMsg] = useState("");
  const [result, setResult] = useState(null);
  const shown = useRef(Date.now());
  useEffect(() => { track("board_join_start"); }, []);
  if (me) {
    return (
      <div className="bd-main">
        <p role="status">You're signed in as @{me.username}.</p>
        <button type="button" className="linkish bd-tap-inline" onClick={back}>← Back to the board</button>
      </div>
    );
  }
  async function send(e) {
    e.preventDefault();
    setStatus("sending");
    setMsg("");
    try {
      const b = await call("/api/board/join", { method: "POST", body: { username: username.trim().toLowerCase(), avatar, email, agree, hp, t: Date.now() - shown.current } });
      setResult(b);
      setStatus("sent");
    } catch (err) {
      setStatus("idle");
      setMsg(err.message);
    }
  }
  if (status === "sent") {
    return (
      <div className="bd-main bd-sent" role="status">
        <h2 className="bd-title">Check your email</h2>
        <p>If that address can sign in, a link is on its way. It works once, for 20 minutes.</p>
        {result && result.mailed === false && !result.devLink && <p className="call-note">Sign-in email is not connected on this server yet.</p>}
        {result && result.devLink && (
          <p className="bd-dev">
            Local testing: email is off, so here is the link.{" "}
            <a id="bd-dev-link" href={`/utah/board?signin=${result.devToken}`}>Open the sign-in link</a>
          </p>
        )}
        <button type="button" className="linkish bd-tap-inline" onClick={back}>← Back to the board</button>
      </div>
    );
  }
  return (
    <div className="bd-main">
      <a className="bd-back" href="/utah/board" onClick={(e) => { e.preventDefault(); back(); }}>← All threads</a>
      <h2 className="bd-title">Join Agree to Disagree</h2>
      <p>No password. Pick a name and an animal, and we'll email you a sign-in link.</p>
      <form className="bd-join" onSubmit={send} aria-label="Join the board">
        <label className="bd-label" htmlFor="bd-username">Username</label>
        <input id="bd-username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} autoComplete="username" pattern="[a-z0-9_]{3,24}" maxLength={24} aria-describedby="bd-username-help" placeholder="saltlake_sam" />
        <p className="bd-fine" id="bd-username-help">3 to 24 lowercase letters, numbers or underscores. Shown with your comments. Already joined? Leave it blank.</p>

        <fieldset className="bd-avatars">
          <legend className="bd-label">Pick your animal</legend>
          <div className="bd-avatar-grid">
            {AVATAR_IDS.map((id) => (
              <label key={id} className={avatar === id ? "bd-avatar-pick on" : "bd-avatar-pick"}>
                <input type="radio" name="bd-avatar" value={id} checked={avatar === id} onChange={() => setAvatar(id)} />
                <Avatar id={id} size={48} />
                <span>{avatarLabel(id)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="bd-label" htmlFor="bd-email">Email</label>
        <input id="bd-email" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" aria-describedby="bd-email-help" />
        <p className="bd-fine" id="bd-email-help">Used only to send your sign-in link. Never shown, sold or used for anything else.</p>

        <div className="bd-hp" aria-hidden="true">
          <label htmlFor="bd-website">Leave this empty</label>
          <input id="bd-website" name="website" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
        </div>

        <label className="bd-agree">
          <input type="checkbox" id="bd-agree" checked={agree} onChange={(e) => setAgree(e.target.checked)} required />
          <span>I agree to the house rules: argue about the vote, not anyone's family or private life; no threats; no one's personal information; bring a link for factual claims.</span>
        </label>
        <p className="bd-probation">Your first two comments get a quick check before they show, and links unlock after a few posts.</p>
        <button type="submit" className="panel-go bd-tap" id="bd-join-send" disabled={status === "sending" || !agree}>
          {status === "sending" ? "Sending…" : "Email me the link"}
        </button>
        {msg && <p className="call-note" role="alert">{msg}</p>}
      </form>
    </div>
  );
}

// ---- The board ----
export default function Board({ route, go }) {
  // Read from the address itself: the board tab can open while an older route is still in props.
  const [thread, setThread] = useState(() => {
    const r = readRoute();
    return r.view === "board" ? r.thread || null : null;
  });
  const [room, setRoom] = useState("utah");
  const [me, setMe] = useState(null);
  const [signin, setSignin] = useState("");

  useEffect(() => {
    const back = () => setThread(readRoute().thread || null);
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, []);

  // Arriving from the emailed link: trade it for a session, then clean the address.
  useEffect(() => {
    const token = new URLSearchParams(location.search).get("signin");
    writeRoute({ page: "state", state: route.state, view: "board", thread }); // also drops ?signin= from the address
    if (!API) return;
    if (token) {
      call(`/api/board/login?token=${encodeURIComponent(token)}`)
        .then((b) => {
          saveSession(b.session);
          setMe(b.user);
          setSignin(`You're signed in as @${b.user.username}. Welcome.`);
        })
        .catch((e) => setSignin(e.message));
      return;
    }
    if (readSession()) call("/api/board/me").then((b) => { setMe(b.user); if (!b.user) saveSession(""); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!thread) {
      document.title = "Agree to Disagree | Legit or Full of Shit";
      track("board_view", { room });
    }
  }, [thread, room]);

  const nav = (next) => {
    setThread(next);
    writeRoute({ page: "state", state: route.state, view: "board", thread: next }, true);
    window.scrollTo(0, 0);
  };
  const signOut = async () => {
    await call("/api/board/logout", { method: "POST", body: {} }).catch(() => {});
    saveSession("");
    setMe(null);
  };
  const openPerson = (person, issue) => go({ page: "state", state: route.state, view: "records", issue, person });

  if (thread === "admin") return <BoardAdmin back={() => nav(null)} />;
  if (!API) {
    return (
      <section className="bd">
        <h2 className="bd-title">Agree to Disagree</h2>
        <p className="empty">The board works on the live site, where the comment service runs.</p>
      </section>
    );
  }
  const onJoin = () => nav("join");
  return (
    <section className="bd" aria-labelledby="bd-h">
      <header className="bd-head">
        <h2 id="bd-h" className="bd-h">Agree <span className="or">to</span> <mark>Disagree</mark></h2>
        <p className="bd-tagline"><strong>Freedom of speech is encouraged here, and so is your reasoning.</strong></p>
        <p className="lede">Every thread starts from a real vote, with the receipts. Argue about the vote, not the person's family. Thumbs up or down, then say why.</p>
        {signin && <p className="bd-signin" role="status">{signin}</p>}
      </header>
      <div className="bd-layout">
        {thread === "join" ? (
          <Join me={me} back={() => nav(null)} />
        ) : thread && !RESERVED.has(thread) ? (
          <Thread slug={thread} me={me} setMe={setMe} onJoin={onJoin} back={() => nav(null)} openPerson={openPerson} />
        ) : (
          <BoardList room={room} setRoom={setRoom} openThread={nav} />
        )}
        <aside className="bd-side" aria-label="About the board">
          <MeCard me={me} onJoin={thread === "join" ? null : onJoin} onSignOut={signOut} />
          <HostCard />
          <RulesCard />
        </aside>
      </div>
    </section>
  );
}
