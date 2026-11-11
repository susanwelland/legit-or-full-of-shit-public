// Agree to Disagree: a comment board where every thread starts from a real vote, with the receipts.
// Threads are opened by Angelica, the site's AI host, from records already in data/utah.js. People
// join with an email link (no password), argue about the vote, and thumb it up or down.
//
// Only hashes of sign-in and session tokens are stored. The email address is used only to send
// sign-in links; it is never returned by any route, the admin ones included.
//
// Anti-spam, all server-side: honeypot field, a minimum time on the form, per-network and per-user
// rate limits, throwaway email domains refused, new accounts' comments held for a check, links held
// until a few comments are approved, duplicates quietly hidden, shadowbans, and reports from
// established members that send a comment back for a check.
import { createHash, randomBytes } from "node:crypto";
import { issues, people } from "./data/utah.js";

const USERNAME = /^[a-z0-9_]{3,24}$/;
const EMAIL = /^[^\s@<>()",;]{1,64}@[^\s@<>()",;]{1,190}\.[a-z]{2,24}$/i;
export const AVATARS = ["doodle", "fox", "owl", "turtle", "cat", "bear", "rabbit", "frog"];
const RESERVED = new Set(["angelica", "admin", "administrator", "moderator", "mod", "host", "eagle", "the_eagle", "staff", "official", "legitorfullofshit", "lofs", "support", "system", "root"]);
const RESERVED_SLUGS = new Set(["admin", "join", "signin", "login", "new"]);
// Common throwaway inbox services. A subdomain of one counts too.
const THROWAWAY = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "guerrillamail.org", "guerrillamailblock.com", "sharklasers.com", "grr.la",
  "10minutemail.com", "10minutemail.net", "temp-mail.org", "tempmail.com", "tempmail.net", "tempmailo.com", "temp-mail.io", "tempail.com",
  "yopmail.com", "yopmail.net", "yopmail.fr", "trashmail.com", "trashmail.de", "trashmail.net", "getnada.com", "nada.email", "dispostable.com",
  "maildrop.cc", "throwawaymail.com", "fakeinbox.com", "mintemail.com", "mohmal.com", "emailondeck.com", "burnermail.io", "spamgourmet.com",
  "mailnesia.com", "mytemp.email", "moakt.com", "emailfake.com", "fakemail.net", "discard.email", "spambox.us", "mailcatch.com",
  "33mail.com", "getairmail.com", "inboxkitten.com", "tmail.ws", "tmpmail.org", "tmpmail.net", "minuteinbox.com", "1secmail.com",
  "1secmail.net", "1secmail.org", "harakirimail.com", "mailpoof.com", "byom.de", "spam4.me", "anonaddy.me", "trash-mail.com",
]);

const LOGIN_MINUTES = 20;
const SESSION_DAYS = 60;
const MIN_FORM_MS = 3000;
const PENDING_UNTIL = 2; // comments are held for a check until this many are approved
const LINKS_AFTER = 3; // links allowed once this many are approved
const REPORTER_AFTER = 3; // a report counts toward the threshold once the reporter has this many approved
const REPORTS_TO_HOLD = 3;
const DAILY_NEW = 5; // comments a day while an account has fewer than LINKS_AFTER approved
const DAILY_MEMBER = 40;
const JOINS_PER_HOUR_NETWORK = 10;
const JOINS_PER_HOUR_EMAIL = 4;
const LINK_RE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|org|net|gov|edu|us|io|co|info|biz|news|ly|me|tv|app|xyz)\b)/i;

const sha = (s) => createHash("sha256").update(String(s)).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");
const norm = (s) => String(s).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
const domainBlocked = (email) => {
  const d = email.split("@")[1] || "";
  const parts = d.split(".");
  for (let i = 0; i < parts.length - 1; i++) if (THROWAWAY.has(parts.slice(i).join("."))) return true;
  return false;
};

// ---- Threads opened by the host, from the dataset. Facts come from data/utah.js at read time. ----
const issueById = (id) => issues.find((i) => i.id === id);
const measureOf = (issueId, measureId) => (issueById(issueId)?.measures || []).find((m) => m.id === measureId);
const stripSponsor = (motion) => motion.replace(/^(Chief|Senate|House) sponsor\.\s*/, "");

// Every distinct official vote on file for a measure, as the dataset words it.
function votesFor(issueId, measureId) {
  const seen = new Map();
  for (const p of people) {
    for (const r of p.entries[issueId]?.did || []) {
      if (r.measure !== measureId || r.kind !== "official" || seen.has(r.url)) continue;
      seen.set(r.url, { motion: stripSponsor(r.motion), date: r.date, tally: r.tally, url: r.url });
    }
  }
  const later = (v) => (/agrees|concurrence/i.test(v.motion) ? 1 : 0);
  return [...seen.values()].sort((a, b) => Date.parse(a.date) - Date.parse(b.date) || later(a) - later(b));
}

// "On the record": a person's vote on the measure and one of their quotes, exactly as stored.
function recordFor(thread) {
  const out = [];
  for (const want of thread.record || []) {
    const p = people.find((x) => x.id === want.person);
    const e = p && p.entries[thread.issue_id];
    if (!e) continue;
    const vote = e.did.find((r) => r.measure === thread.measure_id && (!want.motion || r.motion.includes(want.motion)));
    const quote = e.said.find((q) => !want.quote || q.text.startsWith(want.quote));
    if (!vote) continue;
    out.push({
      person: p.id,
      name: p.name,
      office: p.office,
      party: p.party,
      vote: { value: vote.vote, motion: stripSponsor(vote.motion), date: vote.date, tally: vote.tally, url: vote.url },
      quote: quote ? { text: quote.text, date: quote.date, venue: quote.venue, source: quote.source, url: quote.url, kind: quote.kind, note: quote.note } : null,
    });
  }
  return out;
}

function receiptFor(thread) {
  const m = measureOf(thread.issue_id, thread.measure_id);
  if (!m) return null;
  return { id: m.id, title: m.title, what: m.what, url: m.url, votes: votesFor(thread.issue_id, thread.measure_id) };
}

const HOST_SEEDS = [
  {
    slug: "hb328-2026-turf",
    issue_id: "lake",
    measure_id: "HB 328 (2026)",
    question: "Should new buildings near the lake give up spray-watered decorative grass?",
    record: [
      { person: "owens", motion: "3rd reading", quote: "You can still have all the functional turf you want." },
      { person: "b-candice-b-pierucci-utah-house-49", motion: "3rd reading", quote: "As Utah grows" },
    ],
  },
  {
    slug: "hb76-2026-data-center-water",
    issue_id: "datacenters",
    measure_id: "HB 76 (2026)",
    question: "Is reporting enough, or should Utah limit data center water use?",
    // Opposite votes on the same roll call: the House vote on the Senate's changes.
    record: [
      { person: "koford", motion: "concurrence", quote: "Utah is a desert." },
      { person: "b-rosalba-dominguez-utah-house-35", motion: "concurrence", quote: "I believe we need to be extremely thoughtful" },
    ],
  },
  {
    slug: "hb468-2025-plate-readers",
    issue_id: "flock",
    measure_id: "HB 468 (2025)",
    question: "Should police need a warrant to search license plate reader data?",
    // Both "no" votes on the House roll call belong to people with no file here yet, so no pair is shown.
    record: [],
    useTie: true,
    whatFrom: "Passed the House",
  },
];

function hostOpener(seed) {
  const m = measureOf(seed.issue_id, seed.measure_id);
  const what = seed.whatFrom && m.what.includes(seed.whatFrom) ? m.what.slice(m.what.indexOf(seed.whatFrom)) : m.what;
  const lead = `Here's the record on ${m.id}, ${m.title}.${seed.useTie ? ` ${m.tie}` : ""} ${what}`;
  const tail = seed.record.length
    ? "Below are the official roll calls and two members who voted opposite ways, in their own words. Read them, make your call, then say why."
    : "Below are the official roll calls. Read them, make your call, then say why.";
  return `${lead}\n\n${tail}`;
}

export async function mountBoard({ app, pool, ipHash, tooFast }) {
  const env = process.env;
  const SITE = (env.SITE_URL || "https://legitorfullofshit.com").replace(/\/$/, "");
  const FROM = env.INBOX_ADDRESS || "eagle@legitorfullofshit.com";
  const mailOn = Boolean(env.RESEND_API_KEY);
  // The sign-in link comes back in the response only for local testing, never when email is on.
  const devLinks = !mailOn && (env.PAYPAL_ENV === "mock" || Boolean(env.NODE_ENV && env.NODE_ENV !== "production"));

  await pool.query(`
    create table if not exists board_users (
      id           serial primary key,
      username     text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
      avatar       text not null,
      email        text not null unique,
      created_at   timestamptz not null default now(),
      trust        int not null default 0,
      shadowbanned boolean not null default false,
      banned       boolean not null default false
    );
    create table if not exists board_logins (
      token_hash text primary key,
      email      text not null,
      username   text,
      avatar     text,
      ip_hash    text,
      created_at timestamptz not null default now(),
      expires_at timestamptz not null,
      used       boolean not null default false
    );
    create index if not exists board_logins_email on board_logins (email, created_at desc);
    create table if not exists board_sessions (
      token_hash text primary key,
      user_id    int not null references board_users (id) on delete cascade,
      created_at timestamptz not null default now(),
      expires_at timestamptz not null
    );
    create table if not exists board_threads (
      id          serial primary key,
      room        text not null check (room in ('everyone', 'utah')),
      slug        text not null unique,
      title       text not null,
      issue_id    text,
      measure_id  text,
      opener      text not null,
      question    text not null,
      record      jsonb not null default '[]',
      host_seed   boolean not null default false,
      created_at  timestamptz not null default now(),
      status      text not null default 'open' check (status in ('open', 'closed', 'hidden'))
    );
    create table if not exists board_comments (
      id            serial primary key,
      thread_id     int not null references board_threads (id) on delete cascade,
      user_id       int not null references board_users (id) on delete cascade,
      parent_id     int references board_comments (id) on delete cascade,
      body          text not null check (char_length(body) between 1 and 2000),
      norm          text not null default '',
      status        text not null check (status in ('visible', 'pending', 'hidden')),
      hidden_reason text,
      created_at    timestamptz not null default now(),
      ip_hash       text
    );
    create index if not exists board_comments_thread on board_comments (thread_id, created_at);
    create index if not exists board_comments_user on board_comments (user_id, created_at desc);
    create index if not exists board_comments_norm on board_comments (norm, created_at desc);
    create table if not exists board_thread_votes (
      user_id    int not null references board_users (id) on delete cascade,
      thread_id  int not null references board_threads (id) on delete cascade,
      value      text not null check (value in ('up', 'down')),
      created_at timestamptz not null default now(),
      primary key (user_id, thread_id)
    );
    create table if not exists board_comment_votes (
      user_id    int not null references board_users (id) on delete cascade,
      comment_id int not null references board_comments (id) on delete cascade,
      value      text not null check (value in ('up', 'down')),
      created_at timestamptz not null default now(),
      primary key (user_id, comment_id)
    );
    create table if not exists board_blocks (
      ip_hash    text primary key,
      reason     text not null,
      hits       int not null default 1,
      until      timestamptz not null,
      created_at timestamptz not null default now()
    );
    create table if not exists board_reports (
      comment_id int not null references board_comments (id) on delete cascade,
      user_id    int not null references board_users (id) on delete cascade,
      created_at timestamptz not null default now(),
      primary key (comment_id, user_id)
    );
  `);

  // Seed the host's threads. Safe to run on every start: the text is refreshed from the dataset,
  // and nothing else (votes, comments) is touched.
  // Oldest first, so the list (newest on top) shows them in the order written here.
  for (const seed of [...HOST_SEEDS].reverse()) {
    const m = measureOf(seed.issue_id, seed.measure_id);
    if (!m) {
      console.error("board seed: measure not found", seed.measure_id);
      continue;
    }
    await pool.query(
      `insert into board_threads (room, slug, title, issue_id, measure_id, opener, question, record, host_seed)
       values ('utah', $1, $2, $3, $4, $5, $6, $7, true)
       on conflict (slug) do update set title = excluded.title, issue_id = excluded.issue_id, measure_id = excluded.measure_id,
         opener = excluded.opener, question = excluded.question, record = excluded.record
       where board_threads.host_seed`,
      [seed.slug, `${m.id}: ${m.title}`, seed.issue_id, seed.measure_id, hostOpener(seed), seed.question, JSON.stringify(seed.record)]
    );
  }

  const h = (fn) => (req, res, next) => fn(req, res).catch(next);
  const admin = (req) => Boolean(env.ADMIN_TOKEN) && req.get("X-Admin") === env.ADMIN_TOKEN;

  async function userOf(req) {
    const t = String(req.get("X-Board") || "");
    if (!/^[A-Za-z0-9_-]{30,64}$/.test(t)) return null;
    const r = await pool.query(
      `select u.id, u.username, u.avatar, u.trust, u.shadowbanned, u.banned from board_sessions s join board_users u on u.id = s.user_id
       where s.token_hash = $1 and s.expires_at > now()`,
      [sha(t)]
    );
    const u = r.rows[0];
    return u && !u.banned ? u : null;
  }
  const approvedCount = async (userId) =>
    (await pool.query("select count(*)::int as n from board_comments where user_id = $1 and status = 'visible'", [userId])).rows[0].n;
  async function refreshTrust(userId) {
    const n = await approvedCount(userId);
    await pool.query("update board_users set trust = $2 where id = $1 and trust < $2", [userId, n >= LINKS_AFTER ? 1 : 0]);
  }
  const publicUser = async (u) => {
    const approved = await approvedCount(u.id);
    return { username: u.username, avatar: u.avatar, approved, held: approved < PENDING_UNTIL, linksOk: approved >= LINKS_AFTER };
  };
  const formOk = (b) => !String(b.hp || "") && Number(b.t) >= MIN_FORM_MS;

  // ---- The dogs: a network caught spamming is shut out quietly ----
  // Tripped by a filled honeypot (only bots see that field) or a throwaway inbox. 24 hours the first
  // time, a week once it keeps coming back. A blocked network gets the same answers as everyone else,
  // so a bot can't tell it was caught. It can't start new accounts, and new accounts on it can't post;
  // established members are never affected (one network can be a whole school or phone carrier).
  async function trip(hash, reason) {
    await pool.query(
      `insert into board_blocks (ip_hash, reason, until) values ($1, $2, now() + interval '1 day')
       on conflict (ip_hash) do update set hits = board_blocks.hits + 1, reason = excluded.reason,
         until = now() + case when board_blocks.hits + 1 >= 3 then interval '7 days' else interval '1 day' end`,
      [hash, reason]
    );
    console.log(`[board] dogs out: ${reason} (${String(hash).slice(0, 8)}…)`);
  }
  const blocked = async (hash) =>
    (await pool.query("select 1 from board_blocks where ip_hash = $1 and until > now()", [hash])).rowCount > 0;
  const threadBySlug = async (slug) =>
    (await pool.query("select * from board_threads where slug = $1 and status <> 'hidden'", [String(slug || "")])).rows[0];

  async function sendMail(to, subject, text) {
    const r = await fetch(`${env.RESEND_API_BASE || "https://api.resend.com"}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: `Agree to Disagree <${FROM}>`, to: [to], subject, text }),
    });
    if (!r.ok) throw new Error(`resend ${r.status}`);
  }

  // ---- Join or sign in: one form, one emailed link ----
  app.post("/api/board/join", h(async (req, res) => {
    const b = req.body || {};
    const hash0 = ipHash(req);
    // A bot that filled the hidden field, or a network already caught: looks like it worked, does nothing.
    if (String(b.hp || "")) {
      await trip(hash0, "honeypot on join");
      return res.json({ ok: true, mailed: true });
    }
    if (await blocked(hash0)) return res.json({ ok: true, mailed: true });
    if (!formOk(b)) return res.status(400).json({ error: "That was fast. Take a moment and try again." });
    if (b.agree !== true) return res.status(400).json({ error: "Check the box to agree to the house rules." });
    const email = String(b.email || "").trim().toLowerCase();
    if (!EMAIL.test(email) || email.length > 254) return res.status(400).json({ error: "That email address does not look right." });
    if (domainBlocked(email)) {
      await trip(hash0, "throwaway inbox");
      return res.status(400).json({ error: "Please use an email address you keep. Throwaway inboxes can't join." });
    }
    const username = b.username ? String(b.username).trim().toLowerCase() : "";
    const avatar = AVATARS.includes(b.avatar) ? b.avatar : AVATARS[0];
    if (username && !USERNAME.test(username)) return res.status(400).json({ error: "Usernames are 3 to 24 letters, numbers or underscores." });
    if (username && RESERVED.has(username)) return res.status(400).json({ error: "That username is reserved. Pick another." });
    const hash = ipHash(req);
    if (tooFast(hash)) return res.status(429).json({ error: "Slow down." });
    const recent = await pool.query(
      `select count(*) filter (where ip_hash = $1)::int as net, count(*) filter (where email = $2)::int as mine
       from board_logins where created_at > now() - interval '1 hour'`,
      [hash, email]
    );
    if (recent.rows[0].net >= JOINS_PER_HOUR_NETWORK || recent.rows[0].mine >= JOINS_PER_HOUR_EMAIL)
      return res.status(429).json({ error: "That is plenty of sign-in links for one hour. Check your inbox, or try later." });

    const existing = (await pool.query("select id, username, banned from board_users where email = $1", [email])).rows[0];
    if (existing && existing.banned) return res.status(403).json({ error: "This account can't post here." });
    if (!existing && username) {
      const taken = await pool.query("select 1 from board_users where username = $1", [username]);
      if (taken.rowCount) return res.status(409).json({ error: "That username is taken. Pick another." });
    }
    // No account and no username: answer the same way, so nobody can test which emails have joined.
    if (!existing && !username) {
      if (mailOn) sendMail(email, "Agree to Disagree: no account yet", `Someone asked for a sign-in link for this address on Agree to Disagree, but no account uses it yet.\n\nTo join, pick a username here: ${SITE}/utah/board/join\n\nIf this wasn't you, ignore this email.`).catch((e) => console.error("board mail", e.message));
      return res.json({ ok: true, mailed: mailOn });
    }

    const token = newToken();
    await pool.query(
      `insert into board_logins (token_hash, email, username, avatar, ip_hash, expires_at)
       values ($1, $2, $3, $4, $5, now() + interval '${LOGIN_MINUTES} minutes')`,
      [sha(token), email, existing ? null : username, existing ? null : avatar, hash]
    );
    const link = `${SITE}/utah/board?signin=${token}`;
    if (mailOn) {
      try {
        await sendMail(
          email,
          "Your sign-in link for Agree to Disagree",
          `Here's your link to ${existing ? "sign in to" : "finish joining"} Agree to Disagree on Legit or Full of Shit:\n\n${link}\n\nIt works once and expires in ${LOGIN_MINUTES} minutes.\n\nWe use this address only to send sign-in links. It is never shown on the board.\n\nIf you didn't ask for this, ignore this email and nothing happens.`
        );
      } catch (err) {
        console.error("board mail", err.message);
        return res.status(502).json({ error: "The email didn't go out. Try again in a minute." });
      }
      return res.json({ ok: true, mailed: true });
    }
    console.log(`[board] sign-in link (email is off): ${link}`);
    res.json({ ok: true, mailed: false, ...(devLinks ? { devLink: link, devToken: token } : {}) });
  }));

  app.get("/api/board/login", h(async (req, res) => {
    const token = String(req.query.token || "");
    if (!/^[A-Za-z0-9_-]{30,64}$/.test(token)) return res.status(400).json({ error: "That sign-in link is not valid." });
    if (tooFast(ipHash(req))) return res.status(429).json({ error: "Slow down." });
    const used = await pool.query(
      "update board_logins set used = true where token_hash = $1 and not used and expires_at > now() returning email, username, avatar",
      [sha(token)]
    );
    const login = used.rows[0];
    if (!login) return res.status(400).json({ error: "That sign-in link has expired or was already used. Ask for a new one." });
    let user = (await pool.query("select id, username, avatar, banned from board_users where email = $1", [login.email])).rows[0];
    if (user && user.banned) return res.status(403).json({ error: "This account can't post here." });
    if (!user) {
      if (!login.username) return res.status(400).json({ error: "Pick a username to join." });
      const made = await pool.query(
        "insert into board_users (username, avatar, email) values ($1, $2, $3) on conflict do nothing returning id, username, avatar",
        [login.username, login.avatar || AVATARS[0], login.email]
      );
      if (!made.rowCount) return res.status(409).json({ error: "Someone took that username while the email was on its way. Join again with another." });
      user = made.rows[0];
    }
    const session = newToken();
    await pool.query(
      `insert into board_sessions (token_hash, user_id, expires_at) values ($1, $2, now() + interval '${SESSION_DAYS} days')`,
      [sha(session), user.id]
    );
    await pool.query("delete from board_sessions where expires_at < now()");
    res.set("Cache-Control", "no-store").json({ session, user: await publicUser(user) });
  }));

  app.post("/api/board/logout", h(async (req, res) => {
    const t = String(req.get("X-Board") || "");
    if (t) await pool.query("delete from board_sessions where token_hash = $1", [sha(t)]);
    res.json({ ok: true });
  }));

  app.get("/api/board/me", h(async (req, res) => {
    const u = await userOf(req);
    res.set("Cache-Control", "no-store").json({ user: u ? await publicUser(u) : null });
  }));

  // ---- Reads ----
  app.get("/api/board/threads", h(async (req, res) => {
    const room = ["everyone", "utah"].includes(req.query.room) ? req.query.room : null;
    const rows = await pool.query(
      `select t.slug, t.room, t.title, t.issue_id, t.measure_id, t.question, t.created_at, t.status,
         (select count(*)::int from board_comments c join board_users u on u.id = c.user_id
           where c.thread_id = t.id and c.status = 'visible' and not u.shadowbanned and not u.banned) as comments
       from board_threads t where t.status <> 'hidden' ${room ? "and t.room = $1" : ""} order by t.created_at desc, t.id desc`,
      room ? [room] : []
    );
    res.set("Cache-Control", "no-store").json({
      threads: rows.rows.map((t) => ({ ...t, issue: issueById(t.issue_id)?.name || null, host: "Angelica" })),
    });
  }));

  async function commentsFor(thread, me) {
    const rows = await pool.query(
      `select c.id, c.parent_id, c.user_id, c.body, c.status, c.hidden_reason, c.created_at, u.username, u.avatar, u.shadowbanned, u.banned,
         (select count(*)::int from board_comment_votes v where v.comment_id = c.id and v.value = 'up') as up,
         (select count(*)::int from board_comment_votes v where v.comment_id = c.id and v.value = 'down') as down,
         (select v.value from board_comment_votes v where v.comment_id = c.id and v.user_id = $2) as mine,
         exists (select 1 from board_reports r where r.comment_id = c.id and r.user_id = $2) as reported
       from board_comments c join board_users u on u.id = c.user_id
       where c.thread_id = $1 order by c.created_at, c.id`,
      [thread.id, me ? me.id : -1]
    );
    const approved = me ? await approvedCount(me.id) : 0;
    const shown = [];
    for (const c of rows.rows) {
      const own = me && c.user_id === me.id;
      let note = null;
      if (own) {
        if (c.status === "hidden" && c.hidden_reason !== "duplicate") note = "Hidden by a moderator. Only you can see it.";
        else if (c.status === "pending" || (c.hidden_reason === "duplicate" && approved < PENDING_UNTIL)) note = "Waiting for a quick check. Only you can see it for now.";
      } else if (c.status !== "visible" || c.shadowbanned || c.banned) continue;
      shown.push({ id: c.id, parent_id: c.parent_id, username: c.username, avatar: c.avatar, body: c.body, created_at: c.created_at, up: c.up, down: c.down, mine: c.mine, reported: c.reported, own: Boolean(own), note });
    }
    const ids = new Set(shown.map((c) => c.id));
    return shown.filter((c) => !c.parent_id || ids.has(c.parent_id));
  }

  async function threadCounts(threadId, me) {
    const mine = me ? (await pool.query("select value from board_thread_votes where user_id = $1 and thread_id = $2", [me.id, threadId])).rows[0]?.value || null : null;
    if (!mine) return { mine: null, counts: null };
    const c = await pool.query(
      "select count(*) filter (where value = 'up')::int as up, count(*) filter (where value = 'down')::int as down from board_thread_votes where thread_id = $1",
      [threadId]
    );
    return { mine, counts: c.rows[0] };
  }

  app.get("/api/board/threads/:slug", h(async (req, res) => {
    const t = await threadBySlug(req.params.slug);
    if (!t) return res.status(404).json({ error: "No thread here." });
    const me = await userOf(req);
    const { mine, counts } = await threadCounts(t.id, me);
    res.set("Cache-Control", "no-store").json({
      thread: { slug: t.slug, room: t.room, title: t.title, issue_id: t.issue_id, issue: issueById(t.issue_id)?.name || null, measure_id: t.measure_id, opener: t.opener, question: t.question, created_at: t.created_at, status: t.status, host: "Angelica" },
      receipt: receiptFor(t),
      record: recordFor(t),
      mine,
      counts,
      comments: await commentsFor(t, me),
      me: me ? await publicUser(me) : null,
    });
  }));

  // ---- Writes (signed in only) ----
  const VOTE = (v) => (v === "up" || v === "down" ? v : null);

  app.post("/api/board/threads/:slug/vote", h(async (req, res) => {
    const me = await userOf(req);
    if (!me) return res.status(401).json({ error: "Join to vote." });
    const t = await threadBySlug(req.params.slug);
    if (!t) return res.status(404).json({ error: "No thread here." });
    if (tooFast(ipHash(req))) return res.status(429).json({ error: "Slow down." });
    const value = VOTE((req.body || {}).value);
    const had = (await pool.query("select value from board_thread_votes where user_id = $1 and thread_id = $2", [me.id, t.id])).rows[0]?.value;
    if (!value || had === value) await pool.query("delete from board_thread_votes where user_id = $1 and thread_id = $2", [me.id, t.id]);
    else
      await pool.query(
        `insert into board_thread_votes (user_id, thread_id, value) values ($1, $2, $3)
         on conflict (user_id, thread_id) do update set value = excluded.value, created_at = now()`,
        [me.id, t.id, value]
      );
    res.json(await threadCounts(t.id, me));
  }));

  app.post("/api/board/threads/:slug/comments", h(async (req, res) => {
    const me = await userOf(req);
    if (!me) return res.status(401).json({ error: "Join to post." });
    const b = req.body || {};
    if (String(b.hp || "")) {
      await trip(ipHash(req), "honeypot on comment");
      await pool.query("update board_users set shadowbanned = true where id = $1 and trust = 0", [me.id]);
      return res.status(400).json({ error: "That was fast. Take a moment and try again." });
    }
    if (!formOk(b)) return res.status(400).json({ error: "That was fast. Take a moment and try again." });
    const t = await threadBySlug(req.params.slug);
    if (!t) return res.status(404).json({ error: "No thread here." });
    if (t.status !== "open") return res.status(400).json({ error: "This thread is closed." });
    const body = String(b.body || "").replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (!body) return res.status(400).json({ error: "Write something first." });
    if (body.length > 2000) return res.status(400).json({ error: "Comments run up to 2,000 characters." });
    const hash = ipHash(req);
    if (tooFast(hash)) return res.status(429).json({ error: "Slow down." });
    const approved = await approvedCount(me.id);
    const today = (await pool.query("select count(*)::int as n from board_comments where user_id = $1 and created_at > now() - interval '1 day'", [me.id])).rows[0].n;
    if (today >= (approved < LINKS_AFTER ? DAILY_NEW : DAILY_MEMBER))
      return res.status(429).json({ error: approved < LINKS_AFTER ? `New accounts can post ${DAILY_NEW} comments a day. Come back tomorrow.` : "That's plenty for one day. Come back tomorrow." });
    if (LINK_RE.test(body) && approved < LINKS_AFTER)
      return res.status(400).json({ error: `Links unlock after ${LINKS_AFTER} approved comments. For now, name the source and its date instead.` });

    let parentId = null;
    if (b.parent_id != null && b.parent_id !== "") {
      const p = (await pool.query("select id, parent_id from board_comments where id = $1 and thread_id = $2", [Number(b.parent_id) || 0, t.id])).rows[0];
      if (!p) return res.status(400).json({ error: "That comment is gone." });
      parentId = p.parent_id || p.id; // one level of replies
    }
    const n = norm(body);
    const dup = await pool.query(
      `select 1 from board_comments where norm = $1 and norm <> '' and
         ((user_id = $2 and created_at > now() - interval '24 hours') or created_at > now() - interval '1 hour') limit 1`,
      [n, me.id]
    );
    // A new account on a caught network: its comment is kept back for a check, like any first comment,
    // and stays there (it never auto-publishes); the poster sees the usual "waiting" note.
    const caught = approved < LINKS_AFTER && (await blocked(hash));
    const status = dup.rowCount ? "hidden" : caught || approved < PENDING_UNTIL ? "pending" : "visible";
    const made = await pool.query(
      `insert into board_comments (thread_id, user_id, parent_id, body, norm, status, hidden_reason, ip_hash)
       values ($1, $2, $3, $4, $5, $6, $7, $8) returning id, created_at`,
      [t.id, me.id, parentId, body, n, status, dup.rowCount ? "duplicate" : null, hash]
    );
    if (status === "visible") await refreshTrust(me.id);
    // A duplicate is answered exactly like any other post.
    const held = caught || approved < PENDING_UNTIL;
    res.json({
      ok: true,
      comment: { id: made.rows[0].id, parent_id: parentId, username: me.username, avatar: me.avatar, body, created_at: made.rows[0].created_at, up: 0, down: 0, mine: null, reported: false, own: true, note: held ? "Waiting for a quick check. Only you can see it for now." : null },
      held,
    });
  }));

  app.post("/api/board/comments/:id/vote", h(async (req, res) => {
    const me = await userOf(req);
    if (!me) return res.status(401).json({ error: "Join to vote." });
    const id = Number(req.params.id) || 0;
    const c = (await pool.query("select id from board_comments where id = $1 and status = 'visible'", [id])).rows[0];
    if (!c) return res.status(404).json({ error: "That comment is gone." });
    if (tooFast(ipHash(req))) return res.status(429).json({ error: "Slow down." });
    const value = VOTE((req.body || {}).value);
    const had = (await pool.query("select value from board_comment_votes where user_id = $1 and comment_id = $2", [me.id, id])).rows[0]?.value;
    if (!value || had === value) await pool.query("delete from board_comment_votes where user_id = $1 and comment_id = $2", [me.id, id]);
    else
      await pool.query(
        `insert into board_comment_votes (user_id, comment_id, value) values ($1, $2, $3)
         on conflict (user_id, comment_id) do update set value = excluded.value, created_at = now()`,
        [me.id, id, value]
      );
    const r = await pool.query(
      `select count(*) filter (where value = 'up')::int as up, count(*) filter (where value = 'down')::int as down,
         max(case when user_id = $2 then value end) as mine from board_comment_votes where comment_id = $1`,
      [id, me.id]
    );
    res.json(r.rows[0]);
  }));

  app.post("/api/board/comments/:id/report", h(async (req, res) => {
    const me = await userOf(req);
    if (!me) return res.status(401).json({ error: "Join to report." });
    const id = Number(req.params.id) || 0;
    const c = (await pool.query("select id, user_id, status from board_comments where id = $1", [id])).rows[0];
    if (!c || c.status === "hidden") return res.status(404).json({ error: "That comment is gone." });
    if (c.user_id === me.id) return res.status(400).json({ error: "You can't report your own comment." });
    if (tooFast(ipHash(req))) return res.status(429).json({ error: "Slow down." });
    await pool.query("insert into board_reports (comment_id, user_id) values ($1, $2) on conflict do nothing", [id, me.id]);
    // Reports count toward a hold only from established members who are in good standing.
    const weighty = await pool.query(
      `select count(*)::int as n from board_reports r join board_users u on u.id = r.user_id
       where r.comment_id = $1 and not u.shadowbanned and not u.banned
         and (select count(*) from board_comments x where x.user_id = r.user_id and x.status = 'visible') >= $2`,
      [id, REPORTER_AFTER]
    );
    if (weighty.rows[0].n >= REPORTS_TO_HOLD) await pool.query("update board_comments set status = 'pending' where id = $1 and status = 'visible'", [id]);
    res.json({ ok: true });
  }));

  // ---- Admin (X-Admin: ADMIN_TOKEN, 404 otherwise) ----
  app.get("/api/admin/board/queue", h(async (req, res) => {
    if (!admin(req)) return res.sendStatus(404);
    const rows = await pool.query(
      `select c.id, c.body, c.status, c.hidden_reason, c.created_at, c.parent_id, t.slug, t.title, u.id as user_id, u.username, u.shadowbanned, u.banned,
         (select count(*)::int from board_reports r where r.comment_id = c.id) as reports,
         (select count(*)::int from board_comments x where x.user_id = u.id and x.status = 'visible') as user_approved
       from board_comments c join board_threads t on t.id = c.thread_id join board_users u on u.id = c.user_id
       where c.status = 'pending' or exists (select 1 from board_reports r where r.comment_id = c.id)
       order by (c.status = 'pending') desc, c.created_at asc limit 300`
    );
    res.set("Cache-Control", "no-store").json({ queue: rows.rows });
  }));

  app.post("/api/admin/board/comments/:id/:action", h(async (req, res) => {
    if (!admin(req)) return res.sendStatus(404);
    const id = Number(req.params.id) || 0;
    const c = (await pool.query("select id, user_id from board_comments where id = $1", [id])).rows[0];
    if (!c) return res.status(404).json({ error: "No such comment." });
    const action = req.params.action;
    if (action === "approve") {
      await pool.query("update board_comments set status = 'visible', hidden_reason = null where id = $1", [id]);
      await pool.query("delete from board_reports where comment_id = $1", [id]);
      await refreshTrust(c.user_id);
    } else if (action === "hide") await pool.query("update board_comments set status = 'hidden', hidden_reason = 'moderator' where id = $1", [id]);
    else if (action === "delete") await pool.query("delete from board_comments where id = $1", [id]);
    else return res.status(400).json({ error: "Unknown action." });
    res.json({ ok: true });
  }));

  // A user by numeric id or by username.
  app.post("/api/admin/board/users/:who/:action", h(async (req, res) => {
    if (!admin(req)) return res.sendStatus(404);
    const who = String(req.params.who);
    const u = (await pool.query(/^\d+$/.test(who) ? "select id, email from board_users where id = $1" : "select id, email from board_users where username = $1", [/^\d+$/.test(who) ? Number(who) : who.toLowerCase()])).rows[0];
    if (!u) return res.status(404).json({ error: "No such user." });
    const action = req.params.action;
    if (action === "shadowban") await pool.query("update board_users set shadowbanned = true where id = $1", [u.id]);
    else if (action === "ban") {
      await pool.query("update board_users set banned = true where id = $1", [u.id]);
      await pool.query("delete from board_sessions where user_id = $1", [u.id]);
    } else if (action === "unban") await pool.query("update board_users set banned = false, shadowbanned = false where id = $1", [u.id]);
    else if (action === "delete") {
      // A deletion request: the account, its comments, votes, reports and sign-in records.
      await pool.query("delete from board_logins where email = $1", [u.email]);
      await pool.query("delete from board_users where id = $1", [u.id]);
    } else return res.status(400).json({ error: "Unknown action." });
    res.json({ ok: true });
  }));

  app.get("/api/admin/board/blocks", h(async (req, res) => {
    if (!admin(req)) return res.sendStatus(404);
    const r = await pool.query("select left(ip_hash, 12) as network, reason, hits, until, created_at from board_blocks where until > now() order by until desc limit 200");
    res.set("Cache-Control", "no-store").json({ blocks: r.rows });
  }));
  app.post("/api/admin/board/blocks/:network/lift", h(async (req, res) => {
    if (!admin(req)) return res.sendStatus(404);
    const n = String(req.params.network || "");
    if (!/^[a-f0-9]{8,64}$/.test(n)) return res.status(400).json({ error: "Give the network id from the block list." });
    const r = await pool.query("delete from board_blocks where ip_hash like $1", [`${n}%`]);
    res.json({ ok: true, lifted: r.rowCount });
  }));

  app.post("/api/admin/board/threads", h(async (req, res) => {
    if (!admin(req)) return res.sendStatus(404);
    const b = req.body || {};
    const room = ["everyone", "utah"].includes(b.room) ? b.room : null;
    const slug = String(b.slug || "").trim();
    const title = String(b.title || "").trim();
    const opener = String(b.opener || "").trim();
    const question = String(b.question || "").trim();
    const issueId = b.issue_id ? String(b.issue_id) : null;
    const measureId = b.measure_id ? String(b.measure_id) : null;
    if (!room) return res.status(400).json({ error: "Room is everyone or utah." });
    if (!/^[a-z0-9-]{3,80}$/.test(slug) || RESERVED_SLUGS.has(slug)) return res.status(400).json({ error: "Slug: 3 to 80 lowercase letters, numbers or dashes." });
    if (title.length < 3 || title.length > 160) return res.status(400).json({ error: "Title: 3 to 160 characters." });
    if (opener.length < 10 || opener.length > 4000) return res.status(400).json({ error: "Opener: 10 to 4,000 characters." });
    if (question.length < 5 || question.length > 300) return res.status(400).json({ error: "Question: 5 to 300 characters." });
    if (issueId && !issueById(issueId)) return res.status(400).json({ error: "Unknown issue_id." });
    if (measureId && !measureOf(issueId, measureId)) return res.status(400).json({ error: "measure_id is not one of that issue's measures." });
    const record = (Array.isArray(b.record) ? b.record : [])
      .slice(0, 6)
      .map((r) => ({ person: String(r.person || ""), motion: r.motion ? String(r.motion) : undefined, quote: r.quote ? String(r.quote) : undefined }))
      .filter((r) => people.some((p) => p.id === r.person));
    const made = await pool.query(
      `insert into board_threads (room, slug, title, issue_id, measure_id, opener, question, record)
       values ($1, $2, $3, $4, $5, $6, $7, $8) on conflict (slug) do nothing returning slug`,
      [room, slug, title, issueId, measureId, opener, question, JSON.stringify(record)]
    );
    if (!made.rowCount) return res.status(409).json({ error: "That slug is taken." });
    res.json({ ok: true, slug });
  }));

  return mailOn ? "on" : devLinks ? "dev links" : "off";
}
