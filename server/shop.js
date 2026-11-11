// The shop: signs, shirts and hats. PayPal Orders v2.
//
// PAYPAL_ENV: "sandbox" (needs PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET), "mock" (no PayPal call,
// for tests and local work, labeled as mock everywhere), anything else = checkout off.
// The shop, shirts, certificate and evidence file never take live payments in this build.
//
// Feed the Eagle (tips) is the one exception, approved by the owner on Oct 19, 2026. It takes real
// money only when all three are set in the Render dashboard (never in the repo):
//   FEED_PAYPAL_ENV=live, PAYPAL_LIVE_CLIENT_ID, PAYPAL_LIVE_CLIENT_SECRET
// Otherwise tips follow PAYPAL_ENV like everything else.
import { alertOwner } from "./alerts.js";
import { printfulSettings, sendShirt, shirtSizes } from "./printful.js";
import { randomUUID } from "node:crypto";
import { shirt, currency } from "./data/shop.js";
import { shirtPerson, CALLS } from "./shirt.js";
import { TRACKER_CENTS } from "./tracker.js";

// PAYPAL_SANDBOX_BASE points the sandbox client at a stand-in PayPal for the automated tests
// (server/test/). It never changes the live address.
const SANDBOX = process.env.PAYPAL_SANDBOX_BASE || "https://api-m.sandbox.paypal.com";
const LIVE = "https://api-m.paypal.com";
const dollars = (cents) => (cents / 100).toFixed(2);
// The amounts Feed the Eagle offers, in cents.
export const FEED_CENTS = [300, 500, 1000, 2500];
// "I Made the Call": a $1 printable certificate. Digital only. The name on it is typed and printed
// in the visitor's browser and never sent here.
export const CERTIFICATE_CENTS = 100;

export async function mountShop({ app, pool, voterOf, ipHash, tooFast, tracker = null }) {
  const { PAYPAL_ENV = "", PAYPAL_CLIENT_ID = "", PAYPAL_CLIENT_SECRET = "" } = process.env;
  if (PAYPAL_ENV === "live") throw new Error("Live PayPal payments are disabled in this build. Use sandbox.");
  const mode = PAYPAL_ENV === "sandbox" && PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET ? "sandbox" : PAYPAL_ENV === "mock" ? "mock" : "off";
  const { FEED_PAYPAL_ENV = "", PAYPAL_LIVE_CLIENT_ID = "", PAYPAL_LIVE_CLIENT_SECRET = "" } = process.env;
  // Tips only. Live needs the flag and both live keys; anything less leaves tips on the shop's mode.
  const feedMode = FEED_PAYPAL_ENV === "live" && PAYPAL_LIVE_CLIENT_ID && PAYPAL_LIVE_CLIENT_SECRET ? "live" : mode;
  if (FEED_PAYPAL_ENV === "live" && feedMode !== "live") console.warn("FEED_PAYPAL_ENV=live but the live PayPal keys are missing; tips stay on", mode);

  await pool.query(`
    create table if not exists shop_orders (
      id              bigserial primary key,
      paypal_order_id text unique,
      kind            text not null default 'product',
      sku             text not null,
      size            text,
      amount_cents    integer not null check (amount_cents > 0),
      currency        text not null,
      status          text not null default 'created' check (status in ('created', 'capturing', 'captured', 'failed')),
      capture_id      text unique,
      voter_id        text not null,
      ip_hash         text not null,
      mode            text not null,
      created_at      timestamptz not null default now(),
      captured_at     timestamptz
    );
    alter table shop_orders add column if not exists report_id text;
    alter table shop_orders add column if not exists printful_order_id text;
    alter table shop_orders add column if not exists fulfillment text;
    alter table shop_orders add column if not exists shirt_person text;
    alter table shop_orders add column if not exists shirt_call text;
    alter table shop_orders add column if not exists tracker_id bigint;
    create index if not exists shop_orders_sku on shop_orders (sku, status);
  `);

  // ---- PayPal REST: one client per environment, each with its own token ----
  function client(base, id, secret) {
    let token = null;
    async function accessToken() {
      if (token && token.expires > Date.now() + 60_000) return token.value;
      const r = await fetch(`${base}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });
      if (!r.ok) throw new Error(`paypal token ${r.status}`);
      const b = await r.json();
      token = { value: b.access_token, expires: Date.now() + b.expires_in * 1000 };
      return token.value;
    }
    return async function paypal(method, path, body, requestId) {
      const headers = { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" };
      if (requestId) headers["PayPal-Request-Id"] = requestId;
      const r = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
      const json = await r.json().catch(() => ({}));
      return { ok: r.ok, status: r.status, json };
    };
  }
  const sandboxPaypal = client(SANDBOX, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET);
  const livePaypal = feedMode === "live" ? client(LIVE, PAYPAL_LIVE_CLIENT_ID, PAYPAL_LIVE_CLIENT_SECRET) : null;
  // Live is reachable only for a tip; every other order uses sandbox.
  const paypalFor = (rowMode, kind) => (rowMode === "live" && kind === "feed" && livePaypal ? livePaypal : sandboxPaypal);
  const moneyNote = (m) => (m === "live" ? "LIVE: real money" : m === "sandbox" ? "sandbox, no real money" : m);

  // The one completed capture on an order, if there is one and it matches what we priced.
  function completedCapture(order, row) {
    const unit = (order.purchase_units || [])[0] || {};
    const cap = ((unit.payments || {}).captures || [])[0];
    if (order.status !== "COMPLETED" || !cap || cap.status !== "COMPLETED") return null;
    if (unit.custom_id && unit.custom_id !== String(row.id)) return null;
    if (cap.amount.currency_code !== row.currency || cap.amount.value !== dollars(row.amount_cents)) return null;
    return cap.id;
  }

  const reportCents = Math.round(Number(process.env.REPORT_PRICE_USD || "1.00") * 100);

  // What a request body is allowed to buy, at the server's price.
  async function priced(body, voter) {
    // Donkey Tracker: priced by server/tracker.js, and only while it is switched on.
    if (body.tracker !== undefined) return tracker ? tracker.price(body, voter) : null;
    if (body.report) {
      // An evidence file can only be bought by the visitor it was built for.
      const found = await pool.query("select id, person_id from reports where id = $1 and voter_id = $2", [String(body.report), voter]).catch(() => ({ rows: [] }));
      if (!found.rows[0]) return null;
      return { kind: "report", sku: "evidence-file", size: null, cents: reportCents, label: "Evidence file", ship: false, reportId: found.rows[0].id };
    }
    if (body.feed !== undefined) {
      // Feed the Eagle: a tip in one of a few fixed amounts, priced here, never by the browser.
      const cents = Number(body.feed);
      if (!FEED_CENTS.includes(cents)) return null;
      return { kind: "feed", sku: "feed-the-eagle", size: null, cents, label: `Feed the Eagle (${dollars(cents)} ${currency})`, ship: false };
    }
    if (body.certificate) {
      // Only for a visitor who has made at least one call on the site.
      const made = await pool.query("select 1 from calls where voter_id = $1 and value in ('legit', 'fos') limit 1", [voter]).catch(() => ({ rows: [] }));
      if (!made.rows[0]) return { refuse: "Make a call first: read a record and pick Legit or Full of Shit. Then the certificate is yours." };
      return { kind: "certificate", sku: "made-the-call-certificate", size: null, cents: CERTIFICATE_CENTS, label: "I Made the Call certificate (digital)", ship: false };
    }
    if (body.shirt) {
      // Wear your call: only for a call this visitor has made, printed with the name from our data.
      const key = String(body.shirt.key || "");
      const personId = key.split(":")[1] || "";
      const person = shirtPerson(personId);
      const size = shirt.sizes.includes(body.size) ? body.size : null;
      if (!person || !size) return null;
      const made = await pool.query("select value from calls where voter_id = $1 and item_key = $2", [voter, key]).catch(() => ({ rows: [] }));
      const value = made.rows[0] && made.rows[0].value;
      if (!CALLS[value]) return null;
      return { kind: "shirt", sku: `call-${value}`, size, cents: shirt.priceCents, label: `T-shirt: ${person.name}, I voted ${CALLS[value]} (${size})`, ship: true, person: person.id, call: value };
    }
    return null;
  }

  // A paid shirt goes to Printful. Runs after the buyer has their answer; never blocks checkout.
  async function fulfil(row, paidOrder) {
    if (mode === "mock") {
      await pool.query("update shop_orders set fulfillment = $2 where id = $1", [row.id, "mock: not sent to Printful"]);
      return;
    }
    let out;
    try {
      const base = (process.env.API_PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || "").replace(/\/$/, "");
      const backUrl = base && row.shirt_person ? `${base}/api/shirt/back.png?person=${encodeURIComponent(row.shirt_person)}&call=${encodeURIComponent(row.shirt_call)}` : "";
      const frontUrl = base ? `${base}/api/shirt/front.png` : "";
      out = await sendShirt({ row, paypalOrder: paidOrder, paypalLive: false, backUrl, frontUrl });
    } catch (err) {
      out = { ok: false, note: `Printful call failed: ${err.message}` };
    }
    await pool.query("update shop_orders set printful_order_id = $2, fulfillment = $3 where id = $1", [row.id, out.printfulId || null, out.note]);
    alertOwner(
      out.ok ? "printful" : "printful-problem",
      out.ok ? `Printful ${out.draft ? "draft" : "order"} ${out.printfulId} for shop order ${row.id}` : `NEEDS YOU: shirt order ${row.id} did not reach Printful`,
      out.ok
        ? [
            `Shop order ${row.id} (${row.shirt_person}, ${row.sku}, size ${row.size}) is Printful order ${out.printfulId}.`,
            out.draft
              ? "It is a DRAFT: nothing is printed or charged. Sandbox payments always make drafts."
              : "It was submitted for printing and shipping.",
            "The shipping address is in Printful, not on this site.",
          ]
        : [`Shop order ${row.id} (${row.sku}, size ${row.size}) was paid but not sent to Printful.`, `Reason: ${out.note}`, "Create it by hand in Printful or refund it in PayPal."]
    );
  }

  // For the owner: is Printful connected, and which sizes map to which Printful variants?
  app.get("/api/admin/printful", async (req, res) => {
    if (!process.env.ADMIN_TOKEN || req.get("X-Admin") !== process.env.ADMIN_TOKEN) return res.sendStatus(404);
    const s = printfulSettings();
    if (!s.on) return res.json({ connected: false });
    try {
      res.json({ connected: true, sizes: await shirtSizes(s, { fresh: true }), submitsForPrinting: false });
    } catch (err) {
      res.json({ connected: false, error: err.message });
    }
  });

  app.get("/api/shop", async (_req, res) => {
    res.set("Cache-Control", "no-store").json({
      mode,
      clientId: mode === "sandbox" ? PAYPAL_CLIENT_ID : null,
      feedMode,
      feedClientId: feedMode === "live" ? PAYPAL_LIVE_CLIENT_ID : feedMode === "sandbox" ? PAYPAL_CLIENT_ID : null,
      currency,
      reportCents,
      feedCents: FEED_CENTS,
      certificateCents: CERTIFICATE_CENTS,
      trackerOn: !!(tracker && tracker.on),
      trackerCents: tracker && tracker.on ? TRACKER_CENTS : null,
    });
  });

  app.post("/api/paypal/orders", async (req, res) => {
    if (mode === "off" && feedMode === "off") return res.status(503).json({ error: "Checkout is not connected." });
    const voter = voterOf(req);
    if (!voter) return res.status(400).json({ error: "Missing visitor id." });
    const item = await priced(req.body || {}, voter);
    if (!item) return res.status(400).json({ error: "Unknown item or amount." });
    if (item.refuse) return res.status(400).json({ error: item.refuse });
    // Which PayPal this order goes to: tips may be live; everything else stays on the shop's mode.
    const channel = item.kind === "feed" ? feedMode : mode;
    if (channel === "off") return res.status(503).json({ error: "Checkout is not connected." });
    const hash = ipHash(req);
    if (tooFast(hash)) return res.status(429).json({ error: "Slow down." });

    const row = await pool.query(
      "insert into shop_orders (kind, sku, size, amount_cents, currency, voter_id, ip_hash, mode, report_id, shirt_person, shirt_call, tracker_id) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning id",
      [item.kind, item.sku, item.size, item.cents, currency, voter, hash, channel, item.reportId || null, item.person || null, item.call || null, item.trackerId || null]
    );
    const id = row.rows[0].id;
    let orderId;
    if (channel === "mock") {
      orderId = `MOCK-${randomUUID()}`;
    } else {
      const r = await paypalFor(channel, item.kind)(
        "POST",
        "/v2/checkout/orders",
        {
          intent: "CAPTURE",
          purchase_units: [
            { reference_id: String(id), custom_id: String(id), description: item.label.slice(0, 127), amount: { currency_code: currency, value: dollars(item.cents) } },
          ],
          payment_source: {
            paypal: { experience_context: { brand_name: "Legit or Full of Shit", user_action: "PAY_NOW", shipping_preference: item.ship ? "GET_FROM_FILE" : "NO_SHIPPING" } },
          },
        },
        `create-${id}`
      );
      if (!r.ok || !r.json.id) {
        await pool.query("update shop_orders set status = 'failed' where id = $1", [id]);
        console.error("paypal create failed", r.status, r.json.name, r.json.debug_id);
        return res.status(502).json({ error: "PayPal did not create the order. Nothing was charged." });
      }
      orderId = r.json.id;
    }
    await pool.query("update shop_orders set paypal_order_id = $2 where id = $1", [id, orderId]);
    res.json({ orderId, amountCents: item.cents, currency, mode: channel });
    alertOwner("checkout", `Checkout started: ${item.label}`.slice(0, 120), [
      `Someone opened PayPal checkout for: ${item.label}`,
      `Amount: ${dollars(item.cents)} ${currency} (${moneyNote(channel)})`,
      `Order ${id}. Nothing is charged until they approve in PayPal.`,
    ]);
  });

  // What the buyer sees after a verified capture: PayPal's own order and capture ids, so the payment
  // can be found in the PayPal (sandbox) dashboard. No buyer details.
  const receipt = (row, captureId) => ({
    status: "captured", amountCents: row.amount_cents, currency: row.currency, kind: row.kind, sku: row.sku, mode: row.mode,
    orderId: row.paypal_order_id, captureId: captureId || row.capture_id || null,
  });

  app.post("/api/paypal/orders/:orderId/capture", async (req, res) => {
    if (mode === "off" && feedMode === "off") return res.status(503).json({ error: "Checkout is not connected." });
    const voter = voterOf(req);
    const found = await pool.query("select * from shop_orders where paypal_order_id = $1", [String(req.params.orderId)]);
    const row = found.rows[0];
    // Same answer for "no such order" and "not your order", so ids cannot be probed.
    if (!voter || !row || row.voter_id !== voter) return res.status(404).json({ error: "Order not found." });
    if (row.status === "captured") return res.json(receipt(row, row.capture_id));
    if (row.status === "failed") return res.status(409).json({ error: "This order failed. Start a new one." });

    // Only one request may run the capture; a second one sees "capturing" and reconciles below.
    const claim = await pool.query("update shop_orders set status = 'capturing' where id = $1 and status = 'created' returning id", [row.id]);

    let captureId = null;
    let paidOrder = null; // PayPal's copy of the order, which carries the shipping address
    // Capture with the same PayPal the order was created on (stored on the row).
    const paypal = paypalFor(row.mode, row.kind);
    if (row.mode === "mock") {
      if (claim.rowCount) captureId = `MOCKCAP-${row.id}`;
    } else if (row.mode === "off" || (row.mode === "live" && !livePaypal)) {
      return res.status(503).json({ error: "Checkout is not connected." });
    } else {
      if (claim.rowCount) {
        const r = await paypal("POST", `/v2/checkout/orders/${row.paypal_order_id}/capture`, {}, `capture-${row.id}`);
        if (r.ok) { captureId = completedCapture(r.json, row); if (captureId) paidOrder = r.json; }
        else console.error("paypal capture failed", r.status, r.json.name, r.json.debug_id);
      }
      // Uncertain result, or another request is mid-capture: ask PayPal what actually happened.
      if (!captureId) {
        const check = await paypal("GET", `/v2/checkout/orders/${row.paypal_order_id}`);
        if (check.ok) { captureId = completedCapture(check.json, row); if (captureId) paidOrder = check.json; }
      }
    }

    if (captureId) {
      const done = await pool.query(
        "update shop_orders set status = 'captured', capture_id = $2, captured_at = now() where id = $1 and status <> 'captured' returning id",
        [row.id, captureId]
      );
      if (done.rowCount) {
        alertOwner("purchase", `Payment completed: ${row.kind} ${row.sku || ""}`.trim(), [
          `A payment was captured for ${row.kind}${row.sku ? ` ${row.sku}` : ""}${row.size ? ` (${row.size})` : ""}.`,
          `Amount: ${dollars(row.amount_cents)} ${row.currency} (${moneyNote(row.mode)})`,
          `Order ${row.id}.`,
        ]);
        if (row.kind === "shirt") fulfil(row, paidOrder);
      }
      // Donkey Tracker turns on only here, after the capture above was verified. Safe to repeat.
      if (row.kind === "tracker" && tracker) await tracker.activate(row).catch((err) => console.error("tracker activation failed", err.message));
      return res.json(receipt(row, captureId));
    }
    // Another request may have finished the capture while this one waited.
    const again = await pool.query("select status, amount_cents, kind, sku, mode, capture_id from shop_orders where id = $1", [row.id]);
    if (again.rows[0].status === "captured") {
      return res.json(receipt({ ...row, ...again.rows[0] }, again.rows[0].capture_id));
    }
    // Not captured. Let the buyer try approving again; nothing is granted.
    if (claim.rowCount) await pool.query("update shop_orders set status = 'created' where id = $1 and status = 'capturing'", [row.id]);
    res.status(402).json({ status: "not_captured", error: "The payment was not completed. Nothing was charged." });
  });

  return mode;
}
