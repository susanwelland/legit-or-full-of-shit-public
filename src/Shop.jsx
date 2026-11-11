import { useEffect, useRef, useState } from "react";
import { currency, merch } from "./data/shop.js";
import { voterId } from "./tallies.js";
import { track } from "./analytics.js";
import { Certificate, Roundel } from "./ShopArt.jsx";

const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const feedHref = import.meta.env.VITE_SINGLE === "1" ? "#/feed" : "/feed";

// One PayPal script per client id (tips can use the live account while the shop stays on sandbox),
// each under its own namespace so the two never overwrite each other.
const sdks = {};
function loadPayPal(clientId) {
  if (!sdks[clientId]) {
    const ns = `paypal_${Object.keys(sdks).length}`;
    sdks[clientId] = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${currency}&intent=capture`;
      s.setAttribute("data-namespace", ns);
      s.onload = () => resolve(window[ns]);
      s.onerror = () => { delete sdks[clientId]; reject(new Error("PayPal did not load")); };
      document.head.appendChild(s);
    });
  }
  return sdks[clientId];
}
const usesPayPal = (mode) => mode === "sandbox" || mode === "live";

const post = (path, body) =>
  fetch(API + path, { method: "POST", headers: { "Content-Type": "application/json", "X-Voter": voterId() }, body: JSON.stringify(body || {}) });

const kindOf = (item) => (item.tracker ? "tracker" : item.report ? "evidence_file" : item.feed ? "feed" : item.shirt ? "shirt" : item.certificate ? "certificate" : item.merch ? "merch" : "product");

// Proof of payment, as our server confirmed it with PayPal: the ids PayPal gave the order and the
// capture, the amount, and whether it was sandbox. Shown after every completed checkout.
export function Receipt({ r }) {
  if (!r || !r.orderId) return null;
  const env = r.mode === "live" ? "PayPal" : r.mode === "mock" ? "Mock checkout (no PayPal call)" : "PayPal sandbox";
  return (
    <dl className="receipt" aria-label="Payment receipt">
      <div><dt>Paid with</dt><dd>{env}{r.mode === "live" ? "" : ": no real money moved"}</dd></div>
      <div><dt>Amount</dt><dd>${(r.amountCents / 100).toFixed(2)} {r.currency || "USD"}</dd></div>
      <div><dt>PayPal order</dt><dd><code>{r.orderId}</code></dd></div>
      {r.captureId && <div><dt>PayPal capture</dt><dd><code>{r.captureId}</code></dd></div>}
      <div><dt>Checked</dt><dd>{r.mode === "mock" ? "Mock mode: PayPal was not contacted." : "Capture verified by our server with PayPal (Orders v2) before anything unlocked."}</dd></div>
    </dl>
  );
}

export function Checkout({ item, shop, onDone, paidText }) {
  const box = useRef(null);
  const [state, setState] = useState("ready"); // ready | working | checking | paid | cancelled | error
  const [note, setNote] = useState("");

  async function create() {
    const r = await post("/api/paypal/orders", item);
    const b = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(b.error || "Could not start checkout.");
    track("checkout_start", { kind: kindOf(item), sku: item.sku || null, cents: b.amountCents, mode: b.mode });
    return b.orderId;
  }
  async function capture(orderId) {
    setState("checking");
    const r = await post(`/api/paypal/orders/${encodeURIComponent(orderId)}/capture`);
    const b = await r.json().catch(() => ({}));
    if (r.ok && b.status === "captured") {
      setState("paid");
      // Fired only after the server reports the PayPal capture as done; mode says live or sandbox.
      track("checkout_complete", { kind: kindOf(item), sku: item.sku || null, cents: b.amountCents, mode: b.mode || null });
      onDone(b); // b is the receipt: PayPal order and capture ids, amount, mode
    } else {
      setState("error");
      setNote(b.error || "The payment was not completed. Nothing was charged.");
    }
  }

  useEffect(() => {
    if (!usesPayPal(shop.mode) || !shop.clientId || !box.current) return undefined;
    let dead = false;
    let buttons = null;
    loadPayPal(shop.clientId)
      .then((paypal) => {
        if (dead) return;
        buttons = paypal.Buttons({
          createOrder: create,
          onApprove: (data) => capture(data.orderID),
          onCancel: () => { setState("cancelled"); setNote("Checkout cancelled. Nothing was charged."); },
          onError: () => { setState("error"); setNote("PayPal reported a problem. Nothing was charged."); },
        });
        buttons.render(box.current);
      })
      .catch(() => { setState("error"); setNote("PayPal did not load. Check your connection and try again."); });
    return () => { dead = true; if (buttons && buttons.close) buttons.close(); };
  }, [shop.mode, shop.clientId, item.sku, item.size, item.merch, item.report, item.feed, item.shirt && item.shirt.key]);

  if (state === "paid") {
    if (paidText === "") return null;
    return <p className="paid" role="status">{paidText || "Sandbox payment confirmed by the server. Thank you. No real money moved and nothing ships from this demo."}</p>;
  }
  return (
    <div className="checkout">
      {usesPayPal(shop.mode) && <div ref={box} className="paypal-box" />}
      {shop.mode === "mock" && (
        <button
          className="panel-go"
          id={`mock-pay-${item.sku || item.merch || (item.feed ? "feed" : item.shirt ? "shirt" : item.certificate ? "certificate" : "report")}`}
          disabled={state === "working" || state === "checking"}
          onClick={async () => {
            setState("working");
            try { await capture(await create()); } catch (e) { setState("error"); setNote(e.message); }
          }}
        >
          Run a mock checkout (no PayPal call)
        </button>
      )}
      {shop.mode === "waking" && <p className="call-note" role="status">Connecting to PayPal… this can take up to a minute the first time.</p>}
      {shop.mode === "off" && <p className="call-note">Checkout is not connected on this copy of the site. It turns on when the PayPal keys are added to the service.</p>}
      {state === "checking" && <p className="call-note" role="status">Checking the payment with PayPal…</p>}
      {(state === "error" || state === "cancelled") && <p className="call-note" role="alert">{note}</p>}
    </div>
  );
}

// The Eagle's General Store. The $1 "I Made the Call" certificate and every merch item below are
// bought through PayPal sandbox: test money only, nothing prints and nothing ships. The only shirt
// that is ever made to order is the personalized "Wear your call" shirt on a person page.
const MERCH = [
  { id: "call-tee", name: "Wear Your Call Tee", meta: "Printed per call · Black · S–2XL", desc: "The back carries the name you checked, \"I voted\", and your call. The photo shows an example print with a made-up name.", example: true },
  { id: "record-tee", name: "The Record Tee", meta: "Cream · S–2XL", desc: "What they said over what they did. You make the call." },
  { id: "roundel-tee", name: "The Roundel Tee", meta: "Forest · S–2XL", desc: "The eagle seal on the back." },
  { id: "roundel-cap", name: "The Roundel Cap", meta: "Dad cap · Forest", desc: "A small gold seal, nothing else. The quiet one for county meetings." },
  { id: "trucker-hat", name: "The Wings Trucker Hat", meta: "Trucker · Black bill, white front", desc: "Just the wings.", alt: "trucker-hat-front" },
  { id: "sticker-pack", name: "Field Sticker Pack", meta: "Vinyl stickers", desc: "I checked the record, said ↔ did, and the round mark." },
  { id: "roundel-sticker", name: "Roundel Sticker", meta: "Die-cut vinyl · 3 inch", desc: "The seal on its own." },
  { id: "source-mug", name: "The Source Mug", meta: "Mug · White", desc: "The site's whole promise in one line. Coffee for reading roll calls." },
  { id: "insulated-flask", name: "The Insulated Flask", meta: "Bottle · Forest", desc: "The seal and the address, for long committee hearings." },
  { id: "hip-flask", name: "The Hip Flask", meta: "Pocket flask · Steel", desc: "For election night." },
];

const today = () => new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function svgToPng(svg, filename) {
  const xml = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = 1200; c.height = 1100;
    const g = c.getContext("2d");
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height);
    const a = document.createElement("a");
    a.download = filename;
    a.href = c.toDataURL("image/png");
    a.click();
  };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
}

function CertificateCard({ calls, goRecords, shop }) {
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const [paid, setPaid] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [date] = useState(today);
  const art = useRef(null);
  const price = money((shop.certificateCents || 100));

  if (paid) {
    return (
      <div className="store-feature store-paid">
        <div className="store-cert-print" ref={art}>
          <Certificate name={name || "A Voter"} date={date} calls={calls} />
        </div>
        <div className="store-feature-body">
          <p className="paid" role="status">
            {shop.mode === "mock"
              ? "Mock payment recorded. PayPal was not contacted."
              : "Payment confirmed by PayPal with our server (sandbox, so no real money moved)."}{" "}
            Your certificate is ready.
          </p>
          <Receipt r={receipt} />
          <div className="store-actions">
            <button type="button" className="panel-go" id="cert-print" onClick={() => window.print()}>Print or save as PDF</button>
            <button type="button" className="linkish" id="cert-png" onClick={() => art.current && svgToPng(art.current.querySelector("svg"), "i-made-the-call.png")}>Download image</button>
          </div>
          <p className="call-note">Your name was printed in your browser. It was not sent to us or to PayPal.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="store-feature">
      <div className="store-cert-preview">
        <Certificate name={name} date={date} calls={calls} />
      </div>
      <div className="store-feature-body">
        <p className="store-kicker">A keepsake of your first call</p>
        <h3>I Made the Call</h3>
        <p className="store-meta">Digital · Personalized · Instant</p>
        <p>
          You read what they said, checked what they did, and made your call. This marks it: your name,
          the date and how many calls you've made, ready to print or share. One dollar, and it helps pay for the next records request.
        </p>
        {calls === 0 ? (
          <>
            <p className="call-note">The certificate is for people who have made a call. Read a record and pick Legit or Full of Shit first.</p>
            <button type="button" className="panel-go" id="cert-make-call" onClick={goRecords}>Go make a call</button>
          </>
        ) : (
          <>
            <label className="field" htmlFor="cert-name">
              Name on the certificate (optional)
              <input id="cert-name" type="text" maxLength={40} value={name} autoComplete="off" onChange={(e) => setName(e.target.value)} placeholder="A Voter" />
            </label>
            {!open ? (
              <button
                type="button"
                className="panel-go"
                id="cert-buy"
                onClick={() => { setOpen(true); track("product_click", { product: "certificate", status: "available" }); }}
              >
                Get my certificate, {price}
              </button>
            ) : (
              <Checkout item={{ certificate: true }} shop={shop} onDone={(r) => { setReceipt(r); setPaid(true); }} paidText="" />
            )}
            <p className="call-note">The name stays in your browser. Only the $1 order goes to PayPal.</p>
          </>
        )}
      </div>
    </div>
  );
}

function MerchCard({ m, shop, goRecords }) {
  const def = merch[m.id];
  const [size, setSize] = useState(def && def.sizes ? def.sizes[2] : null);
  const [open, setOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [alt, setAlt] = useState(false);
  const img = alt && m.alt ? m.alt : m.id;
  return (
    <li className="store-card">
      <div className={`store-visual v-${m.id}`} style={{ position: "relative", overflow: "hidden" }}>
        <img src={`/img/merch/${img}.jpg`} alt={`${m.name}${m.example ? " (example print, made-up name)" : ""}`} loading="lazy" width="536" height="536" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        {m.example && <p className="call-note" style={{ position: "absolute", left: 0, right: 0, bottom: 0, margin: 0, padding: "4px 8px", background: "rgba(0,0,0,0.65)", color: "#fff", fontSize: "0.75rem", textAlign: "center" }}>Example print, made-up name.</p>}
      </div>
      <div className="store-card-body">
        <h4>{m.name}</h4>
        <p className="store-meta">{m.meta}</p>
        <p className="store-desc">{m.desc}</p>
        {m.alt && <button type="button" className="linkish" onClick={() => setAlt((v) => !v)}>{alt ? "Show the gold-trim view" : "Show the front view"}</button>}
        {m.example ? (
          <div className="store-buyrow">
            <span className="store-price">$24 sandbox</span>
            <button type="button" className="panel-go" id="want-call-tee" onClick={() => { track("product_click", { product: m.id, status: "go_make_call" }); goRecords(); }}>Make a call, then order yours</button>
          </div>
        ) : receipt ? (
          <>
            <p className="paid" role="status">Sandbox payment confirmed by the server. No real money moved and nothing ships from this demo.</p>
            <Receipt r={receipt} />
          </>
        ) : (
          <div className="store-buyrow">
            <span className="store-price">${(def.cents / 100).toFixed(def.cents % 100 ? 2 : 0)} sandbox demo price</span>
            {def && def.sizes && (
              <label className="field" htmlFor={`size-${m.id}`}>Size
                <select id={`size-${m.id}`} value={size} onChange={(e) => { setSize(e.target.value); setOpen(false); }}>
                  {def.sizes.map((z) => <option key={z} value={z}>{z}</option>)}
                </select>
              </label>
            )}
            {!open ? (
              <button type="button" className="panel-go" id={`buy-${m.id}`} onClick={() => { setOpen(true); track("product_click", { product: m.id, status: "sandbox_buy" }); }}>Buy with PayPal sandbox</button>
            ) : (
              <Checkout item={{ merch: m.id, size }} shop={shop} onDone={(r) => setReceipt(r)} paidText="" />
            )}
          </div>
        )}
      </div>
    </li>
  );
}

const money = (cents) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;

export default function Shop({ goRecords, calls = 0 }) {
  const [shop, setShop] = useState({ mode: "off", clientId: null });
  useEffect(() => {
    track("shop_view");
    if (!API) return;
    fetch(`${API}/api/shop`).then((r) => (r.ok ? r.json() : null)).then((b) => b && setShop(b)).catch(() => {});
  }, []);

  return (
    <section className="doc store" aria-label="The Eagle's General Store">
      <div className="store-hero">
        <svg className="store-seal" viewBox="-60 -60 120 120" aria-hidden="true">
          <Roundel id="hero" />
        </svg>
        <div>
          <p className="store-kicker">Shop</p>
          <h2 className="doc-title">The Eagle's <mark>General Store</mark></h2>
          <p className="doc-lede">Every purchase helps pay for the next public records request. Buying something never changes what the site says about anyone.</p>
        </div>
      </div>
      {shop.mode !== "live" && (
        <p className="sandbox-flag" role="note">
          <strong>Sandbox demo.</strong> Checkout runs in PayPal's test mode. No real money moves. Product names and prices are placeholders.
        </p>
      )}

      <CertificateCard calls={calls} goRecords={goRecords} shop={shop} />

      <h3 className="store-section">Merch, sandbox demo</h3>
      <p className="call-note">Every item here is a sandbox purchase with PayPal test money, at an illustrative demo price. These are not retail offers. Nothing prints and nothing ships. The one shirt made to order, the personalized "Wear your call" shirt ($24, sandbox), is on a person page after you make a call.</p>
      <ul className="store-grid">
        {MERCH.map((m) => <MerchCard key={m.id} m={m} shop={shop} goRecords={goRecords} />)}
      </ul>
      <p className="call-note">
        Or skip the store and <a href={feedHref}>feed the Eagle</a>.
      </p>
    </section>
  );
}
