// Feed the Eagle: a small tip through PayPal. Amounts are fixed and priced by the server, and the
// payment is confirmed by the server with PayPal before the thank-you shows.
import { useEffect, useState } from "react";
import { Bird, Mark } from "./Eagle.jsx";
import { Checkout, Receipt } from "./Shop.jsx";
import { currency } from "./data/shop.js";
import { track } from "./analytics.js";

const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const money = (cents) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
const DEFAULT_CENTS = [300, 500, 1000, 2500];

export default function Feed() {
  const [shop, setShop] = useState({ mode: API ? "waking" : "off", clientId: null, feedCents: DEFAULT_CENTS });
  const [cents, setCents] = useState(500);
  const [fed, setFed] = useState(false);
  const [receipt, setReceipt] = useState(null);

  // The free server sleeps when idle and takes up to about a minute to wake, so keep asking for a while
  // instead of telling the first visitor that checkout is off.
  useEffect(() => {
    if (!API) return undefined;
    let dead = false;
    let tries = 0;
    const ask = () =>
      fetch(`${API}/api/shop`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((b) => { if (!dead) setShop({ feedCents: DEFAULT_CENTS, ...b }); })
        .catch(() => {
          if (dead) return;
          tries += 1;
          if (tries < 12) setTimeout(ask, 8000);
          else setShop((s) => ({ ...s, mode: "off" }));
        });
    ask();
    return () => { dead = true; };
  }, []);

  // Tips may run on the live PayPal account while the rest of the shop stays on sandbox.
  const tip = { ...shop, mode: shop.feedMode || shop.mode, clientId: shop.feedClientId || shop.clientId };
  const amounts = shop.feedCents || DEFAULT_CENTS;
  return (
    <section className="doc feed" aria-label="Feed the Eagle">
      <div className="feed-bird" aria-hidden="true">
        <Bird sky={false} spread={fed} />
      </div>
      <h2 className="doc-title">Feed the Eagle</h2>
      <p className="doc-lede">
        No time to go hunting, and the polluted land makes it harder every day. The Eagle spends its days pulling roll calls,
        transcripts and records so you can see what was said next to what was done. If that helps you, toss it a fish.
      </p>
      {tip.mode !== "live" && tip.mode !== "waking" && (
        <p className="sandbox-flag" role="note">
          <strong>Sandbox demo.</strong> This runs in PayPal's test mode. No real money moves yet.
          {tip.mode === "mock" && " This copy is in mock mode: PayPal is not contacted at all."}
        </p>
      )}

      {fed ? (
        <>
        <p className="paid" role="status">
          {tip.mode === "mock"
            ? `The Eagle is fed. Mock payment of ${money(cents)} recorded; PayPal was not contacted.`
            : `The Eagle is fed. Thank you. PayPal confirmed the ${money(cents)} payment with our server${tip.mode === "sandbox" ? " (sandbox, so no real money moved)" : ""}.`}
        </p>
        <Receipt r={receipt} />
        </>
      ) : (
        <>
          <fieldset className="feed-amounts">
            <legend>How big a fish?</legend>
            {amounts.map((c) => (
              <label key={c} className={c === cents ? "feed-amount on" : "feed-amount"}>
                <input type="radio" name="feed" value={c} checked={c === cents} onChange={() => setCents(c)} />
                {money(c)}
              </label>
            ))}
          </fieldset>
          <Checkout key={`${cents}-${tip.mode}`} item={{ feed: cents }} shop={tip} onDone={(r) => { setReceipt(r); setFed(true); }} paidText="" />
        </>
      )}

      <p className="feed-fine">
        Optional, in {currency}. Not tax-deductible, and not a contribution to any candidate or party. Feeding the Eagle never changes
        what the site says about anyone.
      </p>
      <p className="feed-fine">
        Rather give time? We're looking for interns who like digging through roll calls and transcripts. Email{" "}
        <a href="mailto:eagle@legitorfullofshit.com?subject=Intern">eagle@legitorfullofshit.com</a> with <b>Intern</b> in the subject.
      </p>
    </section>
  );
}

// The small version at the bottom of every page.
// `plain`: a text link instead of the pill (the home page keeps one big action, the ZIP box).
export function FeedNudge({ onFeed, where = "footer", plain = false }) {
  if (plain) {
    return (
      <p className="feed-nudge-row feed-plain">
        <button type="button" className="linkish" id="feed-nudge" onClick={() => { track("donate_click", { where }); onFeed(); }}>
          The Eagle's hungry. Toss it a snack
        </button>
      </p>
    );
  }
  return (
    <div className="feed-nudge-row">
    <button type="button" className="feed-nudge" id="feed-nudge" onClick={() => { track("donate_click", { where }); onFeed(); }}>
      <Mark />
      <span>
        <strong>The Eagle's hungry.</strong> Toss it a snack
      </span>
      <span className="feed-nudge-go" aria-hidden="true">→</span>
    </button>
    </div>
  );
}
