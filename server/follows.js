// Follow a candidate: a visitor leaves an email or a phone number to hear when something new is
// added to that person's file. Only the contact and who they follow are kept. Calls (Legit / Full
// of shit) are never linked to a contact.
//
// Email goes out through Resend now. Texts are collected with consent and sent once a texting
// service is connected (TEXTS_ON); until then the owner sees phone followers in the export.
import { alertOwner } from "./alerts.js";
import { people } from "./data/utah.js";
import { ballot as stateBallot } from "./data/utahBallot.js";
import { local } from "./data/utahLocal.js";
import { TEXT_CONSENT } from "./data/signup.js";
import { states } from "./states.js";

const EMAIL = /^[^\s@<>()",;]{1,64}@[^\s@<>()",;]{1,190}\.[a-z]{2,24}$/i;
const PER_HOUR = 10;

const everyone = new Map([...people, ...stateBallot, ...local, ...states.flatMap((s) => s.people)].map((p) => [p.id, p.name]));

// U.S. numbers only, stored as +1XXXXXXXXXX.
export function usPhone(raw) {
  const d = String(raw || "").replace(/\D/g, "");
  const ten = d.length === 11 && d[0] === "1" ? d.slice(1) : d;
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(ten) ? `+1${ten}` : null;
}

export async function mountFollows({ app, pool, ipHash }) {
  await pool.query(`
    create table if not exists follows (
      id         bigserial primary key,
      channel    text not null check (channel in ('email', 'text')),
      contact    text not null,
      person_id  text not null,
      consent    text,
      ip_hash    text,
      created_at timestamptz not null default now(),
      unique (channel, contact, person_id)
    );
  `);
  const env = process.env;

  app.post("/api/follow", async (req, res) => {
    const b = req.body || {};
    const person = String(b.person || "");
    const name = everyone.get(person);
    if (!name) return res.status(400).json({ error: "Unknown candidate." });
    let channel, contact;
    if (b.phone) {
      channel = "text";
      contact = usPhone(b.phone);
      if (!contact) return res.status(400).json({ error: "Enter a 10-digit U.S. phone number." });
      if (b.consent !== true) return res.status(400).json({ error: "Check the box to agree to texts." });
    } else {
      channel = "email";
      contact = String(b.email || "").trim().toLowerCase();
      if (!EMAIL.test(contact) || contact.length > 254) return res.status(400).json({ error: "That email address does not look right." });
    }
    const hash = ipHash(req);
    const lately = await pool.query("select count(*)::int as n from follows where ip_hash = $1 and created_at > now() - interval '1 hour'", [hash]);
    if (lately.rows[0].n >= PER_HOUR) return res.status(429).json({ error: "That is plenty for one hour. Try again later." });
    const row = await pool.query(
      `insert into follows (channel, contact, person_id, consent, ip_hash) values ($1, $2, $3, $4, $5)
       on conflict (channel, contact, person_id) do nothing returning id`,
      [channel, contact, person, channel === "text" ? TEXT_CONSENT : null, hash]
    );
    res.json({ ok: true, channel });
    if (!row.rowCount) return;

    // A one-time confirmation to email followers, so they know it worked and can say stop.
    if (channel === "email" && env.RESEND_API_KEY) {
      const from = env.INBOX_ADDRESS || "eagle@legitorfullofshit.com";
      fetch(`${env.RESEND_API_BASE || "https://api.resend.com"}/emails`, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({
          from: `The Eagle <${from}>`,
          to: [contact],
          subject: `You're following ${name}`,
          text: `You're following ${name} on Legit or Full of Shit.\n\nWhen a new quote, vote or record is added to their file, we'll email you here, with the source. That's all we send for this.\n\nSee their file: https://legitorfullofshit.com/\n\nTo stop, reply "stop" to this email.`,
        }),
      }).catch(() => {});
    }
    const total = await pool.query("select count(*)::int as n from follows where person_id = $1", [person]).catch(() => ({ rows: [{ n: "?" }] }));
    alertOwner("follow", `New follower for ${name}`, [`Someone followed ${name} by ${channel}. ${total.rows[0].n} followers for ${name} so far.`]);
  });

  // For the owner: every follower, as JSON or as a CSV for a spreadsheet. ADMIN_TOKEN as an
  // X-Admin header, or ?token= for a direct link.
  const admin = (req) => env.ADMIN_TOKEN && (req.get("X-Admin") || req.query.token) === env.ADMIN_TOKEN;
  app.get("/api/admin/follows.csv", async (req, res) => {
    if (!admin(req)) return res.sendStatus(404);
    const rows = await pool.query("select channel, contact, person_id, created_at from follows order by created_at desc");
    const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [["channel", "contact", "following", "following_id", "since"].join(",")].concat(
      rows.rows.map((r) => [r.channel, r.contact, everyone.get(r.person_id) || "", r.person_id, new Date(r.created_at).toISOString()].map(cell).join(","))
    );
    res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="follows.csv"', "Cache-Control": "no-store" }).send(lines.join("\n"));
  });

  // For the owner: tell everyone following a person that their file changed. Email only until a
  // texting service is connected. Body: { person, message }.
  app.post("/api/admin/notify", async (req, res) => {
    if (!admin(req)) return res.sendStatus(404);
    const person = String((req.body || {}).person || "");
    const message = String((req.body || {}).message || "").trim().slice(0, 1000);
    const name = everyone.get(person);
    if (!name || message.length < 10) return res.status(400).json({ error: "Need a known person and a message." });
    if (!env.RESEND_API_KEY) return res.status(503).json({ error: "Email is not connected." });
    const rows = await pool.query("select contact from follows where person_id = $1 and channel = 'email'", [person]);
    const texts = await pool.query("select count(*)::int as n from follows where person_id = $1 and channel = 'text'", [person]);
    let sent = 0;
    for (const r of rows.rows) {
      const ok = await fetch(`${env.RESEND_API_BASE || "https://api.resend.com"}/emails`, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({
          from: `The Eagle <${env.INBOX_ADDRESS || "eagle@legitorfullofshit.com"}>`,
          to: [r.contact],
          subject: `New on ${name}'s file`,
          text: `${message}\n\nYou're getting this because you follow ${name} on legitorfullofshit.com. To stop, reply "stop".`,
        }),
      }).then((x) => x.ok).catch(() => false);
      if (ok) sent += 1;
    }
    res.json({ emailed: sent, emailFollowers: rows.rowCount, textFollowersNotSent: texts.rows[0].n });
  });
}
