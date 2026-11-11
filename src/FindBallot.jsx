// "Find my ballot": one box, a home address in, the visitor's own races out.
// The address goes once to the U.S. Census Bureau's lookup through our server and is not kept.
// Only the districts are saved, in this browser.
import { useState } from "react";
import { track } from "./analytics.js";
import { STATES, STATE_CODES } from "./route.js";
import { takeZip } from "./zip.js";

const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
// States with a page, by postal code.
export const OPEN_STATES = STATE_CODES;
const OPEN_NAMES = Object.values(STATES);
const openList = OPEN_NAMES.length > 1 ? `${OPEN_NAMES.slice(0, -1).join(", ")} and ${OPEN_NAMES[OPEN_NAMES.length - 1]}` : OPEN_NAMES[0];
// Where the national lookup is known to lag a new map, the U.S. House district is left for the
// visitor to pick rather than filled in wrong.
const NEW_US_MAP = { UT: "Utah's U.S. House map changed for 2026 and the national lookup still has the old lines" };

// Utah keeps its own keys ("lofs-found", "lofs-place"); every other state has its own pair, so
// districts found for one state never filter another.
export const foundKey = (slug) => (!slug || slug === "utah" ? "lofs-found" : `lofs-found-${slug}`);
export function readFound(slug) {
  try {
    return JSON.parse(sessionStorage.getItem(foundKey(slug)) || "null");
  } catch {
    return null;
  }
}

export default function FindBallot({ go, onFound, stateSlug, compact = false }) {
  // A ZIP typed on the home page starts the box, so only the street is left to add.
  const [fromZip] = useState(() => (stateSlug ? takeZip() : ""));
  // Street and ZIP are separate boxes so the phone's own saved-address autofill can fill them
  // (nothing is sent anywhere while typing). The ZIP from the home page is already filled in.
  const [street, setStreet] = useState("");
  const [zipCode, setZipCode] = useState(fromZip);
  const address = [street.trim(), zipCode.trim()].filter(Boolean).join(", ");
  const [state, setState] = useState("idle"); // idle | looking | note
  const [note, setNote] = useState("");
  const [other, setOther] = useState(null); // an open state the address turned out to be in

  const fallback = stateSlug ? "pick your districts below" : "open your state and pick your districts";
  async function find(e) {
    if (e) e.preventDefault();
    setOther(null);
    if (street.trim().length < 3 || !/^\d{5}/.test(zipCode.trim())) {
      setState("note");
      setNote(!street.trim() ? "Type your street address, like 123 Main St." : "Add your five-digit ZIP.");
      return;
    }
    if (!API) {
      setState("note");
      setNote(`The address lookup runs on the live site. Here, ${fallback}.`);
      return;
    }
    setState("looking");
    try {
      const r = await fetch(`${API}/api/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error || "The lookup did not answer.");
      track("ballot_lookup", { matched: !!b.matched, state: b.state || null });
      if (!b.matched) {
        setState("note");
        setNote(`No match for that address. Check the street number, city and ZIP, or ${fallback}.`);
        return;
      }
      const slug = OPEN_STATES[b.state];
      if (stateSlug && slug !== stateSlug) {
        setState("note");
        setOther(slug || null);
        setNote(`That address is in ${b.stateName || "another state"}. This page covers ${STATES[stateSlug] || stateSlug}.`);
        return;
      }
      if (!slug) {
        setState("note");
        setNote(`${b.stateName || "That state"} is not open yet. Open now: ${openList}.`);
        return;
      }
      if (slug !== "utah") {
        // The state page reads these districts against its own races (src/data/states/<slug>.js).
        const raw = { county: b.county || "", house: b.house || "", senate: b.senate || "", us: b.us || "" };
        try {
          sessionStorage.setItem(foundKey(slug), JSON.stringify({ ...raw, pending: !onFound }));
        } catch {
          /* the districts still apply for this page view */
        }
        setState("idle");
        if (onFound) onFound(raw, raw);
        else go({ page: "state", state: slug, view: "records" });
        return;
      }
      const usNote = NEW_US_MAP[b.state] || "";
      const place = { county: b.county || "", house: b.house || "", senate: b.senate || "", us: usNote ? "" : b.us || "", board: "" };
      try {
        localStorage.setItem("lofs-place", JSON.stringify(place));
        sessionStorage.setItem("lofs-found", JSON.stringify({ ...place, usNote }));
      } catch {
        /* the districts still apply for this page view */
      }
      setState("idle");
      if (onFound) onFound(place, { ...place, usNote });
      else go({ page: "state", state: slug, view: "records" });
    } catch (err) {
      setState("note");
      setNote(err.message);
    }
  }

  return (
    <form className={compact ? "find find-compact" : "find"} onSubmit={find} role="search" aria-label="Find my ballot">
      {fromZip && (
        <p className="find-zip" role="status">
          <strong>ZIP {fromZip} is in {STATES[stateSlug] || stateSlug}.</strong> Look around: everyone on the ballot is below, and every
          record shows its source. To see only your own races, add your street.
        </p>
      )}
      <p className="find-label" id="find-label">See only your races</p>
      <div className="find-row" role="group" aria-labelledby="find-label">
        <label className="sr" htmlFor="find-address">Street address</label>
        <input
          id="find-address"
          type="text"
          inputMode="text"
          autoComplete="address-line1"
          placeholder="Street address"
          value={street}
          onChange={(e) => setStreet(e.target.value)}
        />
        <label className="sr" htmlFor="find-zip">ZIP code</label>
        <input
          id="find-zip"
          className="find-zipbox"
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={10}
          placeholder="ZIP"
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value.replace(/[^\d-]/g, ""))}
        />
        <button type="submit" id="find-go" disabled={state === "looking"}>
          {state === "looking" ? "Looking…" : "Find my races"}
        </button>
      </div>
      <p className="find-fine">
        {state === "note" ? (
          <span role="status">
            {note}
            {other && go ? (
              <>
                {" "}
                <a href={`/${other}/`} onClick={(e) => { e.preventDefault(); go({ page: "state", state: other, view: "records" }); }}>Open {STATES[other]}</a>.
              </>
            ) : null}
          </span>
        ) : "Used once to find your districts. Never stored."}
      </p>
    </form>
  );
}
