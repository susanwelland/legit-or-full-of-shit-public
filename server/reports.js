// The evidence file: every source on one candidate and issue in one table.
// The site's own records are free on the page. The file gathers them with anything the Eagle's
// search finds, and unlocks after a PayPal sandbox payment. It never contains a verdict.
import { alertOwner } from "./alerts.js";
import { randomUUID } from "node:crypto";
import { issues, people } from "./data/utah.js";
import { statePerson } from "./states.js";

const REPORTS_PER_HOUR = 5;

// Rows built from what the site already has on file. Every row carries its own source.
export // Who holds a record, read from its address. Unknown hosts are named by their address.
function publisherOf(url) {
  let host = "";
  if (url && url.startsWith("/records/grand-county/")) return "Grand County (GRAMA release)";
  try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { return "Record source"; }
  if (host === "le.utah.gov") return "Utah Legislature";
  if (host === "utah.gov") return "Utah Public Notice Website";
  if (host.endsWith("civicclerk.com") || host.endsWith("saltlakecounty.gov")) return "Salt Lake County";
  if (host === "fastdemocracy.com") return "FastDemocracy (vote tracker)";
  if (host === "leginfo.legislature.ca.gov") return "California Legislature";
  if (host === "clerk.assembly.ca.gov") return "California Assembly Clerk";
  if (host === "clerk.house.gov") return "U.S. House Clerk";
  if (host === "wyoleg.gov") return "Wyoming Legislature";
  if (host === "olis.oregonlegislature.gov") return "Oregon Legislature";
  return host;
}

function rowsOnFile(person, issue) {
  const e = person.entries[issue.id];
  const rows = [];
  for (const q of e.said) {
    rows.push({ type: "Statement", what: `"${q.text}"`, date: q.date, publisher: q.source, sourceType: q.kind, url: q.url, note: q.venue, origin: "On file" });
  }
  for (const r of e.did) {
    rows.push({ type: "Record", what: `${r.measure}: ${r.vote}. ${r.motion}`, date: r.date, publisher: publisherOf(r.url), sourceType: r.kind, url: r.url, note: r.tally || "", origin: "On file" });
  }
  for (const q of e.requests || []) {
    rows.push({ type: "Records request", what: `To ${q.agency}: ${q.asked.join("; ")}`, date: q.filed || "", publisher: q.agency, sourceType: "records", url: "", note: q.ref || "", origin: "On file" });
  }
  return rows;
}

// Ask Claude to search the web and return rows. Only rows whose link the search actually
// returned are kept, so a made-up URL can never reach the table.
async function searchRows(person, issue) {
  const { ANTHROPIC_API_KEY = "", ANTHROPIC_MODEL = "claude-sonnet-5-5" } = process.env;
  if (!ANTHROPIC_API_KEY) return { rows: [], searched: false };
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 2000,
      system:
        "You gather sources for a voter-information site that publishes only direct quotes and public records. " +
        "Research only the public conduct of the named candidate on the named issue: votes, official actions, public statements, public contracts, filings. " +
        "Never include home addresses, family, health or private life. Never judge or characterize the candidate. " +
        "After searching, reply with ONLY a JSON array of up to 10 objects with keys: type (Statement | Record | Coverage), what (an exact quote in quotation marks, or a one-sentence paraphrase starting with 'Paraphrase:'), date (as published, or 'unknown'), publisher, url (exactly as returned by search). Reply [] if you find nothing.",
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
      messages: [{ role: "user", content: `Candidate: ${person.name}, running for ${person.office} in the November 3, 2026 election.\nIssue: ${issue.name}.` }],
    }),
  });
  if (!r.ok) {
    const why = await r.json().then((b) => (b.error && `${b.error.type}: ${b.error.message}`) || "").catch(() => "");
    throw new Error(`search failed: ${r.status} ${why}`.slice(0, 400));
  }
  const body = await r.json();
  const seen = new Set();
  let text = "";
  const content = body.content || [];
  // Notes the model writes between searches come before the last search result; the table after it.
  const lastSearch = content.map((b) => b.type).lastIndexOf("web_search_tool_result");
  content.forEach((block, i) => {
    if (block.type === "web_search_tool_result" && Array.isArray(block.content)) for (const hit of block.content) if (hit.url) seen.add(hit.url);
    if (block.type === "text" && i > lastSearch) text += block.text;
  });
  let parsed = [];
  try {
    parsed = JSON.parse(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1));
  } catch {
    parsed = [];
  }
  const ok = (v) => typeof v === "string" && v.length > 0 && v.length < 700;
  const rows = (Array.isArray(parsed) ? parsed : [])
    .filter((x) => x && ok(x.what) && ok(x.url) && seen.has(x.url) && ["Statement", "Record", "Coverage"].includes(x.type))
    .slice(0, 10)
    .map((x) => ({ type: x.type, what: x.what, date: ok(x.date) ? x.date : "unknown", publisher: ok(x.publisher) ? x.publisher : new URL(x.url).hostname, sourceType: "lead", url: x.url, note: "Found by automated search. Not yet checked by a person.", origin: "Eagle search" }));
  return { rows, searched: true };
}

export async function mountReports({ app, pool, voterOf, ipHash }) {
  await pool.query(`
    create table if not exists reports (
      id         text primary key,
      person_id  text not null,
      issue_id   text not null,
      voter_id   text not null,
      ip_hash    text not null,
      rows       jsonb not null,
      searched   boolean not null default false,
      created_at timestamptz not null default now()
    );
    alter table shop_orders add column if not exists report_id text;
    create index if not exists shop_orders_report on shop_orders (report_id, voter_id, status);
  `);

  // The captured order that unlocks this file for this visitor, if there is one.
  const entitled = async (reportId, voter) =>
    (await pool.query(
      "select paypal_order_id, capture_id, amount_cents, currency, mode from shop_orders where report_id = $1 and voter_id = $2 and status = 'captured' order by captured_at limit 1",
      [reportId, voter]
    )).rows[0] || null;
  const receiptOf = (o) => (o ? { orderId: o.paypal_order_id, captureId: o.capture_id, amountCents: o.amount_cents, currency: o.currency, mode: o.mode } : null);

  const teaser = (rep) => ({
    reportId: rep.id,
    person: rep.person_id,
    issue: rep.issue_id,
    asOf: rep.created_at,
    searched: rep.searched,
    rowCount: rep.rows.length,
    counts: rep.rows.reduce((acc, row) => ({ ...acc, [row.type]: (acc[row.type] || 0) + 1 }), {}),
    preview: rep.rows.slice(0, 1),
  });

  // The file this visitor already paid for on this person and issue, if any: newest paid one.
  async function paidFile(voter, personId, issueId) {
    const r = await pool.query(
      `select r.* from reports r join shop_orders o on o.report_id = r.id and o.voter_id = r.voter_id and o.status = 'captured'
       where r.voter_id = $1 and r.person_id = $2 and r.issue_id = $3 order by o.captured_at desc limit 1`,
      [voter, String(personId || ""), String(issueId || "")]
    );
    return r.rows[0] || null;
  }
  const unlockedBody = async (rep, voter) => ({ ...teaser(rep), unlocked: true, rows: rep.rows, receipt: receiptOf(await entitled(rep.id, voter)) });

  // A paid file comes back after a reload or on another visit from the same browser.
  app.get("/api/reports/paid", async (req, res) => {
    const voter = voterOf(req);
    if (!voter) return res.status(404).json({ error: "Not found." });
    const rep = await paidFile(voter, req.query.person, req.query.issue);
    res.set("Cache-Control", "no-store");
    if (!rep) return res.status(404).json({ error: "Not found." });
    res.json(await unlockedBody(rep, voter));
  });

  app.post("/api/reports", async (req, res) => {
    const voter = voterOf(req);
    const utahPerson = people.find((p) => p.id === (req.body || {}).person);
    const other = utahPerson ? null : statePerson((req.body || {}).person); // another open state's ballot
    const person = utahPerson || (other && other.person);
    const issue = (other ? other.issues : issues).find((i) => i.id === (req.body || {}).issue);
    if (!voter) return res.status(400).json({ error: "Missing visitor id." });
    if (!person || !issue || !person.entries[issue.id]) return res.status(400).json({ error: "Unknown candidate or issue." });
    // Already paid for this one: hand back that file instead of selling it twice.
    const already = await paidFile(voter, person.id, issue.id);
    if (already) return res.json(await unlockedBody(already, voter));
    const hash = ipHash(req);
    const lately = await pool.query("select count(*)::int as n from reports where ip_hash = $1 and created_at > now() - interval '1 hour'", [hash]);
    if (lately.rows[0].n >= REPORTS_PER_HOUR) return res.status(429).json({ error: "That is plenty for one hour. Come back later." });

    let found = { rows: [], searched: false };
    try {
      found = await searchRows(person, issue);
    } catch (err) {
      console.error(err);
    }
    const rows = [...rowsOnFile(person, issue), ...found.rows];
    const id = randomUUID();
    const saved = await pool.query(
      "insert into reports (id, person_id, issue_id, voter_id, ip_hash, rows, searched) values ($1,$2,$3,$4,$5,$6,$7) returning *",
      [id, person.id, issue.id, voter, hash, JSON.stringify(rows), found.searched]
    );
    res.json({ ...teaser(saved.rows[0]), unlocked: false });
    alertOwner("evidence", `Evidence file built: ${person.name}, ${issue.name}`, [
      `A visitor built the evidence file for ${person.name} (${person.office}) on ${issue.name}.`,
      `${rows.length} rows${found.searched ? ", including a fresh web search" : ""}. It is locked until they pay.`,
    ]);
  });

  app.get("/api/reports/:id", async (req, res) => {
    const voter = voterOf(req);
    const found = await pool.query("select * from reports where id = $1", [String(req.params.id)]);
    const rep = found.rows[0];
    if (!voter || !rep || rep.voter_id !== voter) return res.status(404).json({ error: "Evidence file not found." });
    const order = await entitled(rep.id, voter);
    const unlocked = !!order;
    res.set("Cache-Control", "no-store").json({ ...teaser(rep), unlocked, rows: unlocked ? rep.rows : undefined, receipt: receiptOf(order) });
  });
}
