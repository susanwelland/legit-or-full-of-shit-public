// Donkey Tracker. Follow the Ass.
// A visitor pays $5 (PayPal sandbox only) to follow one candidate and gets an email when that
// candidate's record changes. Demo-only entitlement: off unless TRACKER=on, no tracking period is
// promised, and alerts are sent by the owner with the admin trigger, never by live monitoring.
//
// The order of things, and what guards each step:
//   1. POST /api/tracker/start: candidate checked against our data, email checked, consent box
//      required. Makes a "pending" row. No consent, no row.
//   2. Checkout: shop.js prices the item here ($5, set on the server) and creates the order.
//   3. Capture: shop.js verifies the capture with PayPal, then calls activate(). Only that makes a
//      row "active". A cancelled or declined payment never reaches it.
//   4. One confirmation email per order, with a confirm link and an unsubscribe link.
//   5. Alerts go only to rows that are active AND confirmed, once per change per subscription.
//   6. Unsubscribe deactivates the row and deletes the email address.
// Links are signed (HMAC) so nobody can confirm or unsubscribe someone else. Email addresses are
// never logged.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { alertOwner } from "./alerts.js";
import { people } from "./data/utah.js";
import { ballot } from "./data/utahBallot.js";
import { local } from "./data/utahLocal.js";
import { states } from "./states.js";

export const TRACKER_CENTS = 500;
export const TRACKER_CONSENT = "Email me when this candidate's record changes.";
const EMAIL = /^[^\s@<>()",;]{1,64}@[^\s@<>()",;]{1,190}\.[a-z]{2,24}$/i;
const STARTS_PER_HOUR = 10;

// Everyone who can be tracked, with the page that shows their file.
const onFile = (e) => !!e && ((e.said || []).length > 0 || (e.did || []).length > 0);
const who = new Map();
for (const p of [...ballot, ...local]) who.set(p.id, { name: p.name, path: "/utah" });
for (const p of people) {
  const issue = Object.keys(p.entries || {}).find((k) => onFile(p.entries[k]));
  who.set(p.id, { name: p.name, path: issue ? `/utah/${issue}/${p.id}` : "/utah" });
}
for (const s of states) {
  for (const p of s.people) {
    const issue = s.issues.find((i) => onFile(p.entries && p.entries[i.id]));
    who.set(p.id, { name: p.name, path: issue ? `/${s.slug}/${issue.id}/${p.id}` : `/${s.slug}` });
  }
}
export const trackable = (id) => who.get(String(id || "")) || null;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export async function mountTracker({ app, pool, voterOf, ipHash }) {
  const env = process.env;
  const on = env.TRACKER === "on";
  const SITE = (env.SITE_URL || "https://legitorfullofshit.com").replace(/\/$/, "");
  const API = (env.API_PUBLIC_URL || env.RENDER_EXTERNAL_URL || "https://api.legitorfullofshit.com").replace(/\/$/, "");
  const SECRET = env.TRACKER_SECRET || env.IP_SALT || "";
  if (on && !SECRET) throw new Error("TRACKER=on needs TRACKER_SECRET or IP_SALT to sign links.");

  await pool.query(`
    create table if not exists tracker_subs (
      id              bigserial primary key,
      person_id       text not null,
      email           text,
      voter_id        text not null,
      consent         text not null,
      status          text not null default 'pending' check (status in ('pending', 'active', 'unsubscribed')),
      order_id        bigint,
      ip_hash         text,
      created_at      timestamptz not null default now(),
      activated_at    timestamptz,
      confirm_sent_at timestamptz,
      confirmed_at    timestamptz,
      unsubscribed_at timestamptz
    );
    create index if not exists tracker_subs_person on tracker_subs (person_id, status);
    create table if not exists tracker_changes (
      id         text primary key,
      person_id  text not null,
      summary    text not null,
      source_url text not null,
      demo       boolean not null default true,
      created_at timestamptz not null default now()
    );
    create table if not exists tracker_alerts (
      sub_id    bigint not null,
      change_id text not null,
      sent_at   timestamptz not null default now(),
      primary key (sub_id, change_id)
    );
  `);

  // ---- signed links ----
  const sig = (purpose, id) => createHmac("sha256", SECRET).update(`tracker:${purpose}:${id}`).digest("base64url").slice(0, 32);
  const token = (purpose, id) => `${id}.${sig(purpose, id)}`;
  function readToken(purpose, raw) {
    const m = /^(\d{1,18})\.([A-Za-z0-9_-]{32})$/.exec(String(raw || ""));
    if (!m || !SECRET) return null;
    const want = Buffer.from(sig(purpose, m[1]));
    const got = Buffer.from(m[2]);
    return want.length === got.length && timingSafeEqual(want, got) ? m[1] : null;
  }
  const link = (purpose, id) => `${API}/api/tracker/${purpose}?t=${token(purpose, id)}`;

  // ---- email (Resend) ----
  async function send({ to, subject, text, unsubscribeUrl }) {
    if (!env.RESEND_API_KEY) return false;
    const from = env.TRACKER_FROM || env.INBOX_ADDRESS || "eagle@legitorfullofshit.com";
    try {
      const r = await fetch(`${env.RESEND_API_BASE || "https://api.resend.com"}/emails`, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({
          from: `Donkey Tracker <${from}>`,
          to: [to],
          subject,
          text,
          // One-click unsubscribe from the mail app's own button (RFC 8058).
          headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
        }),
      });
      if (!r.ok) console.error("tracker email failed", r.status);
      return r.ok;
    } catch (err) {
      console.error("tracker email failed", err.name);
      return false;
    }
  }

  const sandboxLine = (mode) => (mode === "live" ? "" : `This was a PayPal ${mode === "mock" ? "mock" : "sandbox"} purchase: no real money moved.\n`);

  // The confirmation, at most once per subscription (and so per order).
  async function sendConfirmation(id, mode) {
    const claim = await pool.query(
      "update tracker_subs set confirm_sent_at = now() where id = $1 and status = 'active' and email is not null and confirm_sent_at is null returning email, person_id",
      [id]
    );
    const row = claim.rows[0];
    if (!row) return false;
    const p = trackable(row.person_id) || { name: "this candidate", path: "/" };
    const ok = await send({
      to: row.email,
      subject: `Donkey Tracker: you're following ${p.name}`,
      unsubscribeUrl: link("unsubscribe", id),
      text: [
        `You're tracking ${p.name} on Legit or Full of Shit. Donkey Tracker. Follow the Ass.`,
        "",
        "One step left: confirm this is your email address. Alerts go only to confirmed addresses.",
        `Confirm: ${link("confirm", id)}`,
        "",
        `What you're tracking: ${p.name}'s file. Every quote links to where it was said, and every vote links to its official record.`,
        `See the file: ${SITE}${p.path}`,
        "",
        "When their record changes, we'll email you what changed and link the source. No verdicts from us: you make the call.",
        "",
        sandboxLine(mode) + `Stop these emails: ${link("unsubscribe", id)}`,
      ].join("\n"),
    });
    // A failed send can be tried again; a sent one never goes twice.
    if (!ok) await pool.query("update tracker_subs set confirm_sent_at = null where id = $1", [id]);
    return ok;
  }

  // Called by shop.js only after PayPal's capture has been verified for this order.
  async function activate(orderRow) {
    if (!orderRow || orderRow.kind !== "tracker" || !orderRow.tracker_id) return false;
    const r = await pool.query(
      "update tracker_subs set status = 'active', activated_at = now(), order_id = $2 where id = $1 and status = 'pending' returning id, person_id",
      [orderRow.tracker_id, orderRow.id]
    );
    if (!r.rowCount) return false;
    sendConfirmation(r.rows[0].id, orderRow.mode).catch(() => {});
    const p = trackable(r.rows[0].person_id);
    alertOwner("tracker", `Donkey Tracker activated: ${p ? p.name : r.rows[0].person_id}`, [
      `A Donkey Tracker subscription was paid (${orderRow.mode}) and activated for ${p ? p.name : r.rows[0].person_id}.`,
    ]);
    return true;
  }

  // What checkout may charge for a tracker, priced here. Only the visitor who started it can buy it,
  // and only once.
  async function price(body, voter) {
    if (!on) return null;
    const id = String(body.tracker || "");
    if (!/^\d{1,18}$/.test(id)) return null;
    const found = await pool.query("select id, person_id from tracker_subs where id = $1 and voter_id = $2 and status = 'pending'", [id, voter]);
    const row = found.rows[0];
    const p = row && trackable(row.person_id);
    if (!p) return null;
    const paid = await pool.query("select 1 from shop_orders where tracker_id = $1 and status in ('captured', 'capturing') limit 1", [row.id]);
    if (paid.rowCount) return { refuse: "This tracker is already paid for." };
    return { kind: "tracker", sku: "donkey-tracker", size: null, cents: TRACKER_CENTS, label: `Donkey Tracker: ${p.name}`.slice(0, 120), ship: false, trackerId: row.id };
  }

  // ---- visitor routes ----
  app.post("/api/tracker/start", async (req, res) => {
    if (!on) return res.sendStatus(404);
    const voter = voterOf(req);
    if (!voter) return res.status(400).json({ error: "Missing visitor id." });
    const b = req.body || {};
    const p = trackable(b.person);
    if (!p) return res.status(400).json({ error: "Unknown candidate." });
    const email = String(b.email || "").trim().toLowerCase();
    if (!EMAIL.test(email) || email.length > 254) return res.status(400).json({ error: "That email address does not look right." });
    if (b.consent !== true) return res.status(400).json({ error: `Check the box: "${TRACKER_CONSENT}"` });
    const hash = ipHash(req);
    // Unpaid starts keep an email address for a day at most.
    await pool.query("delete from tracker_subs where status = 'pending' and created_at < now() - interval '1 day'");
    const lately = await pool.query("select count(*)::int as n from tracker_subs where ip_hash = $1 and created_at > now() - interval '1 hour'", [hash]);
    if (lately.rows[0].n >= STARTS_PER_HOUR) return res.status(429).json({ error: "That is plenty for one hour. Try again later." });
    const row = await pool.query(
      "insert into tracker_subs (person_id, email, voter_id, consent, ip_hash) values ($1, $2, $3, $4, $5) returning id",
      [String(b.person), email, voter, TRACKER_CONSENT, hash]
    );
    res.json({ tracker: String(row.rows[0].id), cents: TRACKER_CENTS, name: p.name });
  });

  // Confirm and unsubscribe. The GET shows a button and changes nothing, because mail scanners
  // open links on their own; the POST (the button, or a mail app's one-click unsubscribe) acts.
  const page = (title, body) =>
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title>` +
    `<style>body{font:18px/1.5 system-ui,sans-serif;max-width:34rem;margin:3rem auto;padding:0 16px;color:#1b1b1b;background:#fff}button{font:inherit;padding:.6rem 1.2rem;border-radius:.4rem;border:0;background:#1b1b1b;color:#fff;cursor:pointer}a{color:#0b5cad}</style>` +
    `</head><body><h1>${esc(title)}</h1>${body}<p><a href="${SITE}">legitorfullofshit.com</a></p></body></html>`;

  for (const purpose of ["confirm", "unsubscribe"]) {
    app.get(`/api/tracker/${purpose}`, async (req, res) => {
      const id = readToken(purpose, req.query.t);
      res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
      if (!on || !id) return res.status(404).type("html").send(page("Link not valid", "<p>This link is not valid. Copy the whole link from the email.</p>"));
      const row = (await pool.query("select person_id from tracker_subs where id = $1", [id])).rows[0];
      const name = esc((row && trackable(row.person_id) || {}).name || "this candidate");
      const t = esc(String(req.query.t));
      const body =
        purpose === "confirm"
          ? `<p>Confirm this email address to get Donkey Tracker alerts about ${name}.</p><form method="post" action="?t=${t}"><button>Confirm my email</button></form>`
          : `<p>Stop Donkey Tracker emails about ${name}? Your email address will be deleted.</p><form method="post" action="?t=${t}"><button>Unsubscribe</button></form>`;
      res.type("html").send(page(purpose === "confirm" ? "Confirm your email" : "Unsubscribe", body));
    });
  }

  app.post("/api/tracker/confirm", async (req, res) => {
    const id = readToken("confirm", req.query.t);
    res.set("Cache-Control", "no-store");
    if (!on || !id) return res.status(404).type("html").send(page("Link not valid", "<p>This link is not valid.</p>"));
    const r = await pool.query(
      "update tracker_subs set confirmed_at = coalesce(confirmed_at, now()) where id = $1 and status = 'active' and email is not null returning person_id",
      [id]
    );
    if (!r.rowCount) return res.type("html").send(page("Nothing to confirm", "<p>This tracker is not active, so there is nothing to confirm.</p>"));
    const p = trackable(r.rows[0].person_id) || { name: "this candidate", path: "/" };
    res.type("html").send(page("Email confirmed", `<p>You'll get an email when ${esc(p.name)}'s record changes.</p><p><a href="${SITE}${p.path}">See ${esc(p.name)}'s file</a></p>`));
  });

  app.post("/api/tracker/unsubscribe", async (req, res) => {
    const id = readToken("unsubscribe", req.query.t);
    res.set("Cache-Control", "no-store");
    if (!on || !id) return res.status(404).type("html").send(page("Link not valid", "<p>This link is not valid.</p>"));
    await pool.query(
      "update tracker_subs set status = 'unsubscribed', email = null, unsubscribed_at = coalesce(unsubscribed_at, now()) where id = $1",
      [id]
    );
    res.type("html").send(page("You're unsubscribed", "<p>No more Donkey Tracker emails for this candidate. Your email address has been deleted.</p>"));
  });

  // Where a visitor's tracker stands. Never returns the email address.
  app.get("/api/tracker/:id", async (req, res) => {
    if (!on) return res.sendStatus(404);
    const voter = voterOf(req);
    const id = String(req.params.id);
    if (!voter || !/^\d{1,18}$/.test(id)) return res.status(404).json({ error: "Not found." });
    let found = await pool.query("select id, person_id, status, confirmed_at from tracker_subs where id = $1 and voter_id = $2", [id, voter]);
    if (!found.rows[0]) return res.status(404).json({ error: "Not found." });
    // If a verified capture landed but activation was interrupted, finish it now.
    if (found.rows[0].status === "pending") {
      const order = await pool.query("select id, kind, mode, tracker_id from shop_orders where tracker_id = $1 and status = 'captured' limit 1", [id]);
      if (order.rows[0] && (await activate(order.rows[0]))) {
        found = await pool.query("select id, person_id, status, confirmed_at from tracker_subs where id = $1", [id]);
      }
    }
    const r = found.rows[0];
    const o = (await pool.query("select paypal_order_id, capture_id, amount_cents, currency, mode from shop_orders where tracker_id = $1 and status = 'captured' limit 1", [id])).rows[0];
    const receipt = o ? { orderId: o.paypal_order_id, captureId: o.capture_id, amountCents: o.amount_cents, currency: o.currency, mode: o.mode } : null;
    res.set("Cache-Control", "no-store").json({ status: r.status, confirmed: !!r.confirmed_at, name: (trackable(r.person_id) || {}).name || "", receipt });
  });

  // ---- owner only ----
  const admin = (req) => !!env.ADMIN_TOKEN && req.get("X-Admin") === env.ADMIN_TOKEN;

  // Counts, for checking a demo. No email addresses.
  app.get("/api/admin/tracker", async (req, res) => {
    if (!admin(req)) return res.sendStatus(404);
    const person = String(req.query.person || "");
    const rows = await pool.query(
      `select status, (confirmed_at is not null) as confirmed, count(*)::int as n from tracker_subs
       where ($1 = '' or person_id = $1) group by 1, 2 order by 1, 2`,
      [person]
    );
    res.set("Cache-Control", "no-store").json({ on, email: !!env.RESEND_API_KEY, subscriptions: rows.rows });
  });

  // The demo trigger: tell every confirmed, active tracker of one person that their record changed.
  // Body: { person, summary, source, changeId?, demo? }. The same change never goes twice to the
  // same subscription; a new change does. A failed send is not recorded, so it can be retried.
  app.post("/api/admin/tracker/alert", async (req, res) => {
    if (!admin(req)) return res.sendStatus(404);
    if (!on) return res.status(503).json({ error: "Donkey Tracker is off (TRACKER=on)." });
    if (!env.RESEND_API_KEY) return res.status(503).json({ error: "Email is not connected (RESEND_API_KEY)." });
    const b = req.body || {};
    const personId = String(b.person || "");
    const p = trackable(personId);
    const summary = String(b.summary || "").trim();
    const source = String(b.source || "").trim();
    if (!p) return res.status(400).json({ error: "Unknown candidate." });
    if (summary.length < 10 || summary.length > 600) return res.status(400).json({ error: "Write what changed: 10 to 600 characters, quoting the record." });
    let url;
    try { url = new URL(source); } catch { url = null; }
    if (!url || url.protocol !== "https:" || source.length > 500) return res.status(400).json({ error: "The source must be an https link." });
    const demo = b.demo !== false;
    const changeId = /^[a-z0-9-]{1,80}$/.test(String(b.changeId || ""))
      ? String(b.changeId)
      : createHash("sha256").update(`${personId}\n${summary}\n${source}`).digest("hex").slice(0, 24);
    await pool.query(
      "insert into tracker_changes (id, person_id, summary, source_url, demo) values ($1, $2, $3, $4, $5) on conflict (id) do nothing",
      [changeId, personId, summary, source, demo]
    );
    const change = (await pool.query("select * from tracker_changes where id = $1", [changeId])).rows[0];
    if (change.person_id !== personId) return res.status(409).json({ error: "That change id belongs to someone else." });

    const subs = await pool.query(
      "select id, email from tracker_subs where person_id = $1 and status = 'active' and confirmed_at is not null and email is not null order by id",
      [personId]
    );
    const unconfirmed = await pool.query(
      "select count(*)::int as n from tracker_subs where person_id = $1 and status = 'active' and confirmed_at is null",
      [personId]
    );
    let sent = 0, already = 0, failed = 0;
    for (const s of subs.rows) {
      const claim = await pool.query("insert into tracker_alerts (sub_id, change_id) values ($1, $2) on conflict do nothing returning sub_id", [s.id, changeId]);
      if (!claim.rowCount) { already += 1; continue; }
      const ok = await send({
        to: s.email,
        subject: `Donkey Tracker: ${p.name}'s record changed`,
        unsubscribeUrl: link("unsubscribe", s.id),
        text: [
          `New on ${p.name}'s file:`,
          "",
          change.summary,
          "",
          `Source: ${change.source_url}`,
          `See the file: ${SITE}${p.path}`,
          "",
          change.demo ? "Demo alert: sent by hand to show how Donkey Tracker works. It is not live monitoring.\n" : "",
          `You're getting this because you track ${p.name} with Donkey Tracker. No verdicts from us: you make the call.`,
          `Stop these emails: ${link("unsubscribe", s.id)}`,
        ].join("\n"),
      });
      if (ok) sent += 1;
      else {
        failed += 1;
        await pool.query("delete from tracker_alerts where sub_id = $1 and change_id = $2", [s.id, changeId]);
      }
    }
    res.json({ change: changeId, demo: change.demo, eligible: subs.rowCount, sent, alreadySent: already, failed, unconfirmed: unconfirmed.rows[0].n });
  });

  return { on, price, activate };
}
