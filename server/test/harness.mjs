// Test harness: a stand-in PayPal sandbox, a stand-in email service (Resend), and the real API
// server started against an embedded database in a temp folder. No keys, no network, no money.
import http from "node:http";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const json = (res, code, body) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
const readBody = (req) => new Promise((ok) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => ok(b)); });
const listen = (server) => new Promise((ok) => server.listen(0, "127.0.0.1", () => ok(server.address().port)));

// A small PayPal Orders v2 sandbox. `paypal.next` sets how the next capture behaves:
//   "ok" (default): COMPLETED for the order's own amount
//   "declined": 422 INSTRUMENT_DECLINED, the order stays APPROVED
//   "wrong-amount": COMPLETED, but for a different amount than the order
//   "lost-reply": the capture succeeds at PayPal but the reply is an error (server must look it up)
export async function fakePayPal() {
  const orders = new Map();
  const state = { next: "ok", created: 0, captures: 0 };
  let n = 0;
  const server = http.createServer(async (req, res) => {
    const body = await readBody(req);
    if (req.method === "POST" && req.url === "/v1/oauth2/token") return json(res, 200, { access_token: "test-token", expires_in: 3600 });
    if (req.method === "POST" && req.url === "/v2/checkout/orders") {
      const b = JSON.parse(body || "{}");
      const id = `TESTORDER${++n}`;
      orders.set(id, { id, status: "APPROVED", unit: b.purchase_units[0] });
      state.created += 1;
      return json(res, 201, { id, status: "CREATED" });
    }
    const cap = req.url.match(/^\/v2\/checkout\/orders\/([^/]+)\/capture$/);
    if (req.method === "POST" && cap) {
      const o = orders.get(cap[1]);
      if (!o) return json(res, 404, { name: "RESOURCE_NOT_FOUND" });
      const how = state.next;
      state.next = "ok";
      if (how === "declined") return json(res, 422, { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "INSTRUMENT_DECLINED" }] });
      const value = how === "wrong-amount" ? "0.01" : o.unit.amount.value;
      o.status = "COMPLETED";
      o.capture = { id: `TESTCAPTURE${cap[1].replace("TESTORDER", "")}`, status: "COMPLETED", amount: { currency_code: o.unit.amount.currency_code, value } };
      state.captures += 1;
      if (how === "lost-reply") return json(res, 500, { name: "INTERNAL_SERVER_ERROR" });
      return json(res, 201, view(o));
    }
    const get = req.url.match(/^\/v2\/checkout\/orders\/([^/]+)$/);
    if (req.method === "GET" && get) {
      const o = orders.get(get[1]);
      return o ? json(res, 200, view(o)) : json(res, 404, { name: "RESOURCE_NOT_FOUND" });
    }
    json(res, 404, { name: "NOT_FOUND" });
  });
  function view(o) {
    return {
      id: o.id,
      status: o.status,
      purchase_units: [{ ...o.unit, payments: o.capture ? { captures: [o.capture] } : undefined }],
    };
  }
  const port = await listen(server);
  return { base: `http://127.0.0.1:${port}`, state, orders, close: () => server.close() };
}

// Resend stand-in: keeps every email it is asked to send.
export async function fakeEmail() {
  const sent = [];
  const server = http.createServer(async (req, res) => {
    const body = await readBody(req);
    if (req.method === "POST" && req.url === "/emails") { sent.push(JSON.parse(body)); return json(res, 200, { id: `email${sent.length}` }); }
    json(res, 404, {});
  });
  const port = await listen(server);
  return { base: `http://127.0.0.1:${port}`, sent, close: () => server.close() };
}

// The real API server (server/index.js) on a free port.
export async function startServer({ paypal, email, env = {} }) {
  const db = mkdtempSync(join(tmpdir(), "lofs-test-"));
  const probe = http.createServer();
  const port = await listen(probe);
  probe.close();
  const child = spawn(process.execPath, ["index.js"], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    env: {
      PATH: process.env.PATH,
      PORT: String(port),
      DATABASE_URL: `pglite:${db}`,
      ALLOWED_ORIGIN: "*",
      IP_SALT: "test-salt",
      ADMIN_TOKEN: "test-admin-token-0123456789",
      PAYPAL_ENV: "sandbox",
      PAYPAL_CLIENT_ID: "test-client",
      PAYPAL_CLIENT_SECRET: "test-secret",
      PAYPAL_SANDBOX_BASE: paypal.base,
      RESEND_API_KEY: "test-resend",
      RESEND_API_BASE: email.base,
      API_PUBLIC_URL: `http://127.0.0.1:${port}`,
      ANTHROPIC_API_KEY: "", // no AI calls in tests
      TRACKER: "on",
      ...env,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  child.stdout.on("data", (d) => (log += d));
  child.stderr.on("data", (d) => (log += d));
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 300; i++) {
    try { if ((await fetch(`${base}/api/health`)).ok) break; } catch { /* starting */ }
    if (child.exitCode !== null) throw new Error(`server exited:\n${log}`);
    await new Promise((r) => setTimeout(r, 100));
  }
  return {
    base,
    log: () => log,
    stop: () => { child.kill(); try { rmSync(db, { recursive: true, force: true }); } catch { /* temp */ } },
  };
}

// A visitor: a browser with its own random device id, as the site makes one.
export function visitor(base, id = `test-${Math.random().toString(36).slice(2)}-${Date.now()}`) {
  const call = async (method, path, body, headers = {}) => {
    const r = await fetch(base + path, {
      method,
      headers: { "content-type": "application/json", "X-Voter": id, ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: r.status, data };
  };
  return { id, get: (p, h) => call("GET", p, undefined, h), post: (p, b, h) => call("POST", p, b ?? {}, h) };
}
