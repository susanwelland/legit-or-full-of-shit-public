// ZIP code to state, from the first three digits (the USPS sectional center prefix). A few ZIPs
// cross a state line; the street-address lookup on the state page settles those.
// Ranges are inclusive: [from, to, postal code].
const RANGES = [
  [5, 5, "NY"], [6, 9, "PR"], [10, 27, "MA"], [28, 29, "RI"], [30, 38, "NH"], [39, 49, "ME"],
  [50, 54, "VT"], [55, 55, "MA"], [56, 59, "VT"], [60, 69, "CT"], [70, 89, "NJ"],
  [100, 149, "NY"], [150, 196, "PA"], [197, 199, "DE"], [200, 200, "DC"], [201, 201, "VA"], [202, 205, "DC"],
  [206, 219, "MD"], [220, 246, "VA"], [247, 268, "WV"], [270, 289, "NC"], [290, 299, "SC"],
  [300, 319, "GA"], [320, 339, "FL"], [341, 349, "FL"], [350, 369, "AL"], [370, 385, "TN"],
  [386, 397, "MS"], [398, 399, "GA"], [400, 427, "KY"], [430, 459, "OH"], [460, 479, "IN"],
  [480, 499, "MI"], [500, 528, "IA"], [530, 549, "WI"], [550, 567, "MN"], [569, 569, "DC"],
  [570, 577, "SD"], [580, 588, "ND"], [590, 599, "MT"], [600, 629, "IL"], [630, 658, "MO"],
  [660, 679, "KS"], [680, 693, "NE"], [700, 714, "LA"], [716, 729, "AR"], [730, 732, "OK"],
  [733, 733, "TX"], [734, 749, "OK"], [750, 799, "TX"], [800, 816, "CO"], [820, 831, "WY"],
  [832, 838, "ID"], [840, 847, "UT"], [850, 865, "AZ"], [870, 884, "NM"], [885, 885, "TX"],
  [889, 898, "NV"], [900, 961, "CA"], [967, 968, "HI"], [970, 979, "OR"], [980, 994, "WA"],
  [995, 999, "AK"],
];

export const STATE_NAMES = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut",
  DE: "Delaware", DC: "Washington, D.C.", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
  NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  PR: "Puerto Rico", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas",
  UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

// "84103" or "84103-1234" -> "UT". Anything else -> null.
export function stateOfZip(raw) {
  const m = String(raw || "").trim().match(/^(\d{5})(?:-\d{4})?$/);
  if (!m) return null;
  const p = parseInt(m[1].slice(0, 3), 10);
  const hit = RANGES.find(([a, b]) => p >= a && p <= b);
  return hit ? hit[2] : null;
}

// The ZIP travels from the home page to the state page in this tab only, so the address box there
// can start with it. Never sent anywhere by itself.
const KEY = "lofs-zip";
let handedAt = 0;
// True for a state page opened by the ZIP box a moment ago (for analytics: result_viewed via zip).
export const cameFromZip = () => Date.now() - handedAt < 15000;
export function handZip(zip) {
  handedAt = Date.now();
  try { sessionStorage.setItem(KEY, zip); } catch { /* the state page just starts empty */ }
}
export function takeZip() {
  try {
    const z = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return z && /^\d{5}$/.test(z) ? z : "";
  } catch {
    return "";
  }
}

// A full address typed on the home page goes to the state page's address lookup in this tab only,
// and is removed as soon as that page reads it.
const ADDR = "lofs-address";
export function handAddress(address) {
  handedAt = Date.now();
  try { sessionStorage.setItem(ADDR, address.slice(0, 200)); } catch { /* the state page just starts empty */ }
}
export function takeAddress() {
  try {
    const a = sessionStorage.getItem(ADDR);
    sessionStorage.removeItem(ADDR);
    return a || "";
  } catch {
    return "";
  }
}
// The ZIP at the end of an address ("... Salt Lake City, UT 84103"), or a ZIP typed alone.
export function zipIn(raw) {
  const all = String(raw || "").match(/\b\d{5}(?:-\d{4})?\b/g);
  return all ? all[all.length - 1].slice(0, 5) : "";
}
