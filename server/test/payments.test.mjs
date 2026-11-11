// End-to-end tests of every PayPal flow, against the real API server, a stand-in PayPal sandbox and a
// stand-in email service. Run with `npm test` in server/ (or the project root). No keys, no network.
//
// What they prove: the server sets every price; an order is only captured, and something only
// delivered, after PayPal reports a COMPLETED capture for exactly that order and amount; declined,
// mismatched and tampered payments deliver nothing; a lost PayPal reply is reconciled, not guessed;
// a paid evidence file comes back after a reload and is never sold twice; Donkey Tracker activates
// only after a verified capture and its emails follow consent, confirmation and unsubscribe.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { fakePayPal, fakeEmail, startServer, visitor } from "./harness.mjs";

const PERSON = "ca-catherine-s-blakespear-california-senate-district-38";
const ISSUE = "housing";
const CALL_KEY = `${ISSUE}:${PERSON}`;
const ADMIN = { "X-Admin": "test-admin-token-0123456789" };

let paypal, email, server;
before(async () => {
  paypal = await fakePayPal();
  email = await fakeEmail();
  server = await startServer({ paypal, email });
});
after(() => { server && server.stop(); paypal && paypal.close(); email && email.close(); });

// Create an order for `item`, then capture it the way PayPal's onApprove does.
async function pay(v, item, how = "ok") {
  const order = await v.post("/api/paypal/orders", item);
  assert.equal(order.status, 200, JSON.stringify(order.data));
  paypal.state.next = how;
  const cap = await v.post(`/api/paypal/orders/${order.data.orderId}/capture`);
  return { order: order.data, cap };
}

test("checkout is in sandbox and prices come from the server", async () => {
  const r = await visitor(server.base).get("/api/shop");
  assert.equal(r.data.mode, "sandbox");
  assert.equal(r.data.reportCents, 100);
  assert.equal(r.data.trackerCents, 500);
});

test("evidence file: locked until a verified capture, then unlocked with PayPal's receipt", async () => {
  const buyer = visitor(server.base);
  const built = await buyer.post("/api/reports", { person: PERSON, issue: ISSUE });
  assert.equal(built.status, 200);
  assert.equal(built.data.unlocked, false);
  const id = built.data.reportId;

  // Locked before paying: no rows.
  let file = await buyer.get(`/api/reports/${id}`);
  assert.equal(file.data.unlocked, false);
  assert.equal(file.data.rows, undefined);

  // The browser cannot set the price.
  const order = await buyer.post("/api/paypal/orders", { report: id, cents: 1, amount: "0.01" });
  assert.equal(order.data.amountCents, 100);
  assert.equal(paypal.orders.get(order.data.orderId).unit.amount.value, "1.00");

  // Someone else can neither capture this order, buy this file, nor read it.
  const stranger = visitor(server.base);
  assert.equal((await stranger.post(`/api/paypal/orders/${order.data.orderId}/capture`)).status, 404);
  assert.equal((await stranger.post("/api/paypal/orders", { report: id })).status, 400);
  assert.equal((await stranger.get(`/api/reports/${id}`)).status, 404);

  // Declined at PayPal: nothing delivered, and the buyer can approve again.
  paypal.state.next = "declined";
  const declined = await buyer.post(`/api/paypal/orders/${order.data.orderId}/capture`);
  assert.equal(declined.status, 402);
  file = await buyer.get(`/api/reports/${id}`);
  assert.equal(file.data.unlocked, false);

  // Approved: unlocked, with PayPal's own ids on the receipt.
  const ok = await buyer.post(`/api/paypal/orders/${order.data.orderId}/capture`);
  assert.equal(ok.data.status, "captured");
  assert.equal(ok.data.orderId, order.data.orderId);
  assert.match(ok.data.captureId, /^TESTCAPTURE/);
  assert.equal(ok.data.mode, "sandbox");
  file = await buyer.get(`/api/reports/${id}`);
  assert.equal(file.data.unlocked, true);
  assert.ok(file.data.rows.length > 0);
  assert.equal(file.data.receipt.captureId, ok.data.captureId);

  // A repeated approval callback captures nothing twice.
  const captures = paypal.state.captures;
  const again = await buyer.post(`/api/paypal/orders/${order.data.orderId}/capture`);
  assert.equal(again.data.captureId, ok.data.captureId);
  assert.equal(paypal.state.captures, captures);
});

test("evidence file: a paid file comes back after a reload and is never sold twice", async () => {
  const buyer = visitor(server.base);
  const built = await buyer.post("/api/reports", { person: PERSON, issue: ISSUE });
  const { cap } = await pay(buyer, { report: built.data.reportId });
  assert.equal(cap.data.status, "captured");

  // Reload: the page asks for this browser's paid file.
  const back = await buyer.get(`/api/reports/paid?person=${PERSON}&issue=${ISSUE}`);
  assert.equal(back.data.unlocked, true);
  assert.equal(back.data.receipt.orderId, cap.data.orderId);

  // "Have the Eagle build it" again returns the paid file; no new PayPal order is made.
  const created = paypal.state.created;
  const rebuilt = await buyer.post("/api/reports", { person: PERSON, issue: ISSUE });
  assert.equal(rebuilt.data.unlocked, true);
  assert.equal(rebuilt.data.reportId, built.data.reportId);
  assert.equal(paypal.state.created, created);

  // A different browser starts locked.
  assert.equal((await visitor(server.base).get(`/api/reports/paid?person=${PERSON}&issue=${ISSUE}`)).status, 404);
});

test("a capture for the wrong amount delivers nothing", async () => {
  const { cap } = await pay(visitor(server.base), { feed: 500 }, "wrong-amount");
  assert.equal(cap.status, 402);
  assert.equal(cap.data.status, "not_captured");
});

test("a lost PayPal reply is checked with PayPal, not guessed", async () => {
  const { order, cap } = await pay(visitor(server.base), { feed: 300 }, "lost-reply");
  assert.equal(cap.data.status, "captured");
  assert.equal(cap.data.orderId, order.orderId);
});

test("unknown orders and made-up items are refused", async () => {
  const v = visitor(server.base);
  assert.equal((await v.post("/api/paypal/orders/NOT-A-REAL-ORDER/capture")).status, 404);
  assert.equal((await v.post("/api/paypal/orders", { feed: 777 })).status, 400);
  assert.equal((await v.post("/api/paypal/orders", { sku: "anything", cents: 1 })).status, 400);
  assert.equal((await v.post("/api/paypal/orders", { report: "no-such-report" })).status, 400);
});

test("Feed the Eagle: fixed tip amounts, captured in sandbox", async () => {
  const { cap } = await pay(visitor(server.base), { feed: 1000 });
  assert.equal(cap.data.status, "captured");
  assert.equal(cap.data.amountCents, 1000);
  assert.equal(cap.data.mode, "sandbox");
});

test("certificate and T-shirt: only after the visitor has made a call", async () => {
  const v = visitor(server.base);
  const early = await v.post("/api/paypal/orders", { certificate: true });
  assert.equal(early.status, 400);
  assert.equal((await v.post("/api/paypal/orders", { shirt: { key: CALL_KEY }, size: "M" })).status, 400);

  const call = await v.post("/api/calls", { key: CALL_KEY, value: "legit" });
  assert.equal(call.status, 200, JSON.stringify(call.data));

  const cert = await pay(v, { certificate: true });
  assert.equal(cert.cap.data.amountCents, 100);
  const shirt = await pay(v, { shirt: { key: CALL_KEY }, size: "M", cents: 1 });
  assert.equal(shirt.cap.data.status, "captured");
  assert.equal(shirt.cap.data.amountCents, 2400);
  assert.equal((await v.post("/api/paypal/orders", { shirt: { key: CALL_KEY }, size: "XXXL" })).status, 400);
});

test("Donkey Tracker: consent, activation only after capture, confirm, alert once, unsubscribe", async () => {
  const buyer = visitor(server.base);
  const start = (b) => buyer.post("/api/tracker/start", { person: PERSON, ...b });
  assert.equal((await start({ email: "buyer@example.com", consent: false })).status, 400, "no consent, no row");
  assert.equal((await buyer.post("/api/tracker/start", { person: "nobody", email: "buyer@example.com", consent: true })).status, 400);
  const started = await start({ email: "buyer@example.com", consent: true });
  assert.equal(started.status, 200);
  const id = started.data.tracker;

  // Declined: still pending, nothing emailed.
  const sentBefore = email.sent.length;
  const declined = await pay(buyer, { tracker: id }, "declined");
  assert.equal(declined.cap.status, 402);
  assert.equal((await buyer.get(`/api/tracker/${id}`)).data.status, "pending");
  assert.equal(email.sent.length, sentBefore);

  // Approved: active, one confirmation email with confirm and unsubscribe links.
  const cap = await buyer.post(`/api/paypal/orders/${declined.order.orderId}/capture`);
  assert.equal(cap.data.status, "captured");
  assert.equal(cap.data.amountCents, 500);
  await new Promise((r) => setTimeout(r, 300));
  const status = await buyer.get(`/api/tracker/${id}`);
  assert.equal(status.data.status, "active");
  assert.equal(status.data.confirmed, false);
  assert.ok(!JSON.stringify(status.data).includes("@"), "never returns the address");
  await buyer.post(`/api/paypal/orders/${declined.order.orderId}/capture`);
  await new Promise((r) => setTimeout(r, 200));
  const confirmations = email.sent.slice(sentBefore);
  assert.equal(confirmations.length, 1, "one confirmation per order");
  const text = confirmations[0].text;
  const confirmUrl = text.match(/Confirm: (\S+)/)[1];
  const unsubUrl = text.match(/Stop these emails: (\S+)/)[1];
  assert.ok(confirmations[0].headers["List-Unsubscribe"]);

  // Alerts: owner only, and only to confirmed addresses.
  const alert = (body, headers = ADMIN) => buyer.post("/api/admin/tracker/alert", body, headers);
  const change = { person: PERSON, summary: "SB 677 (2026): voted Aye on concurrence.", source: "https://leginfo.legislature.ca.gov/" };
  assert.equal((await alert(change, { "X-Admin": "wrong" })).status, 404);
  assert.equal((await alert(change)).data.sent, 0, "unconfirmed gets nothing");

  // Confirm: the link's page changes nothing until its button is pressed; forged links fail.
  assert.equal((await fetch(confirmUrl.replace(/t=\d+\./, "t=999."), { method: "POST" })).status, 404);
  await fetch(confirmUrl);
  assert.equal((await buyer.get(`/api/tracker/${id}`)).data.confirmed, false);
  await fetch(confirmUrl, { method: "POST" });
  assert.equal((await buyer.get(`/api/tracker/${id}`)).data.confirmed, true);

  assert.equal((await alert(change)).data.sent, 1, "one trigger, one alert");
  assert.equal((await alert(change)).data.sent, 0, "the same change never goes twice");
  assert.equal((await alert({ ...change, summary: "A second change, quoted from the record." })).data.sent, 1);

  // Unsubscribe: deactivated, and the next alert sends nothing.
  await fetch(unsubUrl, { method: "POST" });
  assert.equal((await buyer.get(`/api/tracker/${id}`)).data.status, "unsubscribed");
  assert.equal((await alert({ ...change, summary: "A third change, after unsubscribing." })).data.sent, 0);
});

test("no email address or payment secret is written to the server log", () => {
  const log = server.log();
  assert.ok(!log.includes("buyer@example.com"));
  assert.ok(!log.includes("test-secret"));
});
