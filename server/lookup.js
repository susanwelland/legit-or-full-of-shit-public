// "Find my ballot": a home address in, districts out, through the U.S. Census Bureau's free
// geocoder (no key). The address is sent once and never stored or logged. It comes in a POST
// body, not the URL, so it stays out of access logs.
const CENSUS = process.env.CENSUS_GEOCODER_BASE || "https://geocoding.geo.census.gov";
const PER_HOUR = 20;
const seen = new Map(); // ip hash -> timestamps

function limited(hash) {
  const now = Date.now();
  const list = (seen.get(hash) || []).filter((t) => now - t < 3_600_000);
  list.push(now);
  seen.set(hash, list);
  return list.length > PER_HOUR;
}

const first = (geos, re) => {
  const key = Object.keys(geos || {}).find((k) => re.test(k));
  return key && geos[key] && geos[key][0] ? { key, g: geos[key][0] } : null;
};
const num = (g, ...fields) => {
  for (const f of fields) {
    const v = g && g[f];
    if (v !== undefined && v !== null && /\d/.test(String(v))) {
      // Keep a district letter (Minnesota House 12A/12B); otherwise just the number.
      const m = String(v).match(/(\d+)\s*([A-Za-z])?\s*$/);
      if (m) return `${parseInt(m[1], 10)}${(m[2] || "").toUpperCase()}`;
      return String(parseInt(String(v).replace(/\D/g, ""), 10));
    }
  }
  return "";
};

// Turns the Census answer into the site's districts. Exported for tests.
export function readCensus(body) {
  const match = body && body.result && body.result.addressMatches && body.result.addressMatches[0];
  if (!match) return { matched: false };
  const geos = match.geographies || {};
  const state = first(geos, /^States$/);
  const county = first(geos, /^Counties$/);
  const cd = first(geos, /Congressional Districts/);
  const upper = first(geos, /State Legislative Districts - Upper/);
  const lower = first(geos, /State Legislative Districts - Lower/);
  return {
    matched: true,
    state: (state && state.g.STUSAB) || "",
    stateName: (state && state.g.NAME) || "",
    county: (county && (county.g.BASENAME || String(county.g.NAME || "").replace(/ County$/, ""))) || "",
    us: cd ? num(cd.g, "BASENAME", ...Object.keys(cd.g).filter((k) => /^CD\d+$/.test(k))) : "",
    usMap: cd ? cd.key : "",
    senate: upper ? num(upper.g, "BASENAME", "SLDU") : "",
    house: lower ? num(lower.g, "BASENAME", "SLDL") : "",
  };
}

export function mountLookup({ app, ipHash }) {
  app.post("/api/lookup", async (req, res) => {
    const address = String((req.body || {}).address || "").replace(/\s+/g, " ").trim();
    if (address.length < 5 || address.length > 200) return res.status(400).json({ error: "Type your street address, city and ZIP." });
    if (limited(ipHash(req))) return res.status(429).json({ error: "Too many lookups from this network. Try again in an hour." });
    const url = `${CENSUS}/geocoder/geographies/onelineaddress?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`;
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (!r.ok) throw new Error(`census ${r.status}`);
      res.set("Cache-Control", "no-store").json(readCensus(await r.json()));
    } catch (err) {
      console.error("lookup failed", err.message); // never the address
      res.status(502).json({ error: "The address lookup is not answering right now. Pick your districts by hand." });
    }
  });
}
