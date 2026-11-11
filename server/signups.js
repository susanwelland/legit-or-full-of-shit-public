// "Tell me when my state opens": visitors from states that are not open yet leave an email and
// the issues they care about. Kept for telling them when their state opens and for occasional
// site updates, as the form says. Nothing else is done with it.
import { alertOwner } from "./alerts.js";

import { SIGNUP_ISSUES, STATE_NAMES } from "./data/signup.js";

const STATE_CODES = new Set(Object.keys(STATE_NAMES));
const EMAIL = /^[^\s@<>()",;]{1,64}@[^\s@<>()",;]{1,190}\.[a-z]{2,24}$/i;
const PER_HOUR = 5;

export async function mountSignups({ app, pool, ipHash }) {
  await pool.query(`
    create table if not exists signups (
      id         bigserial primary key,
      email      text not null,
      state      text not null,
      issues     jsonb not null default '[]',
      note       text,
      ip_hash    text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (email, state)
    );
  `);

  app.post("/api/signup", async (req, res) => {
    const b = req.body || {};
    const email = String(b.email || "").trim().toLowerCase();
    const state = String(b.state || "").trim().toUpperCase();
    const issues = (Array.isArray(b.issues) ? b.issues : []).filter((i) => SIGNUP_ISSUES.includes(i)).slice(0, SIGNUP_ISSUES.length);
    const note = String(b.note || "").replace(/\s+/g, " ").trim().slice(0, 300);
    if (!EMAIL.test(email) || email.length > 254) return res.status(400).json({ error: "That email address does not look right." });
    if (!STATE_CODES.has(state)) return res.status(400).json({ error: "Pick a state." });
    const hash = ipHash(req);
    const lately = await pool.query("select count(*)::int as n from signups where ip_hash = $1 and updated_at > now() - interval '1 hour'", [hash]);
    if (lately.rows[0].n >= PER_HOUR) return res.status(429).json({ error: "That is plenty for one hour. Try again later." });
    const row = await pool.query(
      `insert into signups (email, state, issues, note, ip_hash) values ($1, $2, $3, $4, $5)
       on conflict (email, state) do update set issues = excluded.issues, note = coalesce(nullif(excluded.note, ''), signups.note), updated_at = now()
       returning (xmax = 0) as added`,
      [email, state, JSON.stringify(issues), note || null, hash]
    );
    res.json({ ok: true });
    if (row.rows[0] && row.rows[0].added) {
      const total = await pool.query("select count(*)::int as n from signups where state = $1", [state]).catch(() => ({ rows: [{ n: "?" }] }));
      alertOwner("signup", `New sign-up for ${state}`, [
        `Someone asked to hear when ${state} opens. ${total.rows[0].n} sign-ups for ${state} so far.`,
        `Issues: ${issues.join(", ") || "none picked"}.`,
        note ? `They wrote: ${note}` : "",
        "The full list is at /api/admin/signups.csv (admin token).",
      ].filter(Boolean));
    }
  });

  // For the owner: every sign-up, as JSON or as a CSV for an email tool. Send the ADMIN_TOKEN as
  // an X-Admin header, or ?token= for a direct download link.
  const admin = (req) => process.env.ADMIN_TOKEN && (req.get("X-Admin") || req.query.token) === process.env.ADMIN_TOKEN;
  app.get("/api/admin/signups", async (req, res) => {
    if (!admin(req)) return res.sendStatus(404);
    const rows = await pool.query("select email, state, issues, note, created_at, updated_at from signups order by created_at desc");
    res.set("Cache-Control", "no-store").json({ signups: rows.rows });
  });
  app.get("/api/admin/signups.csv", async (req, res) => {
    if (!admin(req)) return res.sendStatus(404);
    const rows = await pool.query("select email, state, issues, note, created_at from signups order by created_at desc");
    const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [["email", "state", "issues", "note", "signed_up"].join(",")].concat(
      rows.rows.map((r) => [r.email, r.state, (r.issues || []).join("; "), r.note, new Date(r.created_at).toISOString()].map(cell).join(","))
    );
    res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="signups.csv"', "Cache-Control": "no-store" }).send(lines.join("\n"));
  });
}
