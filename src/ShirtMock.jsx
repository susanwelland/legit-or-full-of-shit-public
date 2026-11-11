// A picture of the shirt a visitor could wear after making their own call. Name only, no photo,
// and the wording is theirs ("I voted"). Both versions exist for every person. With the shop
// switched on (VITE_SHOP=on) it can be ordered: the server prints the back exactly like this.
import { useEffect, useState } from "react";
import { SHOP_ON } from "./route.js";
import { Checkout, Receipt } from "./Shop.jsx";
import { track } from "./analytics.js";
import { shirt, currency } from "./data/shop.js";
import { shirtFront } from "./data/shirtArt.js";

const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const money = (cents) => `$${(cents / 100).toFixed(2)}`;

function BuyShirt({ callKey, call }) {
  const [shop, setShop] = useState({ mode: "off", clientId: null });
  const [size, setSize] = useState("");
  const [open, setOpen] = useState(false);
  const [paid, setPaid] = useState(false);
  const [receipt, setReceipt] = useState(null);
  useEffect(() => {
    if (!API) return;
    fetch(`${API}/api/shop`).then((r) => (r.ok ? r.json() : null)).then((b) => b && setShop(b)).catch(() => {});
  }, []);
  useEffect(() => { setOpen(false); setPaid(false); }, [callKey, call]);
  if (paid) {
    return (
      <>
      <p className="paid" role="status">
        {shop.mode === "sandbox"
          ? "Sandbox order confirmed by PayPal. No real money moved and nothing ships from this demo."
          : shop.mode === "mock"
            ? "Mock order recorded. PayPal was not contacted and nothing ships."
            : "Order confirmed. Your shirt is made to order and ships in about a week."}
      </p>
      <Receipt r={receipt} />
      </>
    );
  }
  return (
    <div className="shirt-buy">
      <label className="field" htmlFor="shirt-size">
        Size
        <select id="shirt-size" value={size} onChange={(e) => { setSize(e.target.value); setOpen(false); }}>
          <option value="">Choose a size</option>
          {shirt.sizes.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
      {!open && (
        <button className="panel-go" id="shirt-buy" disabled={!size} onClick={() => { setOpen(true); track("product_click", { kind: "shirt", sku: shirt.sku || "shirt", size }); }}>
          Order this shirt, {money(shirt.priceCents)}
        </button>
      )}
      {open && size && (
        <Checkout key={`${callKey}:${call}:${size}`} item={{ shirt: { key: callKey }, size }} shop={shop} onDone={(r) => { setReceipt(r); setPaid(true); }} paidText="" />
      )}
      {shop.mode !== "live" && <p className="call-note">Sandbox demo: checkout runs in PayPal's test mode. No real money moves and nothing ships.</p>}
      <p className="call-note">{currency}. Black tee, printed front and back as shown (use Flip). Made to order.</p>
    </div>
  );
}

const FRONT = shirtFront({ font: "'Bricolage Grotesque', 'Arial Narrow', Arial, sans-serif" });

export default function ShirtMock({ person, call, callKey }) {
  const [side, setSide] = useState("back");
  const legit = call === "legit";
  // Given names on one line, family name on the next, each sized to fit across the back.
  const parts = person.name.toUpperCase().split(" ");
  const last = parts.pop();
  const first = parts.join(" ");
  const fit = (text, max) => Math.min(max, 104 / (0.68 * Math.max(text.length, 1)));
  return (
    <aside className="shirt" id="shirt-mock" aria-label="Shirt mock-up">
      <div className="shirt-flip">
      <div className={side === "front" ? "shirt-card show-front" : "shirt-card"}>
      <svg className="shirt-face" viewBox="0 0 240 230" role="img" aria-hidden={side === "front"} aria-label={`Back of a shirt reading ${person.name}, I voted ${legit ? "Legit" : "Full of Shit"}`}>
        <path className="shirt-body" d="M78 14C90 26 150 26 162 14L222 40L206 86L178 76V216H62V76L34 86L18 40Z" />
        <path className="shirt-neck" d="M78 14C90 26 150 26 162 14" />
        <text x="120" y="78" textAnchor="middle" className="shirt-name" style={{ fontSize: fit(first, 15) }}>{first}</text>
        <text x="120" y="102" textAnchor="middle" className="shirt-name" style={{ fontSize: fit(last, 24) }}>{last}</text>
        <line x1="84" y1="112" x2="156" y2="112" className="shirt-rule" />
        <text x="120" y="130" textAnchor="middle" className="shirt-voted">I voted</text>
        {legit ? (
          <text x="120" y="160" textAnchor="middle" className="shirt-call">Legit!</text>
        ) : (
          <>
            <rect x="66" y="140" width="108" height="28" className="shirt-mark" transform="rotate(-2 120 154)" />
            <text x="120" y="161" textAnchor="middle" className="shirt-call on-mark" transform="rotate(-2 120 154)">Full of Shit!</text>
          </>
        )}
      </svg>
      <svg className="shirt-face shirt-face-front" viewBox="0 0 240 230" role="img" aria-hidden={side !== "front"} aria-label="Front of the shirt: an eagle and SHOW ME THE RECEIPTS">
        <path className="shirt-body" d="M78 14C90 26 150 26 162 14L222 40L206 86L178 76V216H62V76L34 86L18 40Z" />
        <path className="shirt-neck" d="M78 14C92 36 148 36 162 14" />
        <svg x="63" y="26" width="114" height="152" viewBox="0 0 300 400" dangerouslySetInnerHTML={{ __html: FRONT }} />
      </svg>
      </div>
      <button type="button" className="shirt-flip-btn" id="shirt-flip" aria-pressed={side === "front"} onClick={() => setSide(side === "front" ? "back" : "front")}>
        {side === "front" ? "Flip to the back" : "Flip to the front"}
      </button>
      </div>
      <div className="shirt-text">
        <p><strong>Wear your call.</strong> The back of the shirt, in your words. It only shows after you make a call, and it matches the call you made.</p>
        {SHOP_ON && callKey ? (
          <BuyShirt callKey={callKey} call={call} />
        ) : (
          <p className="call-note">Mock-up. Not for sale yet. The shirt matches the call you made.</p>
        )}
      </div>
    </aside>
  );
}
