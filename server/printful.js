// Printful prints and ships the "Wear your call" shirt: a plain tee from Printful's catalog with
// the visitor's call printed on the back. When PayPal confirms a paid shirt, the server sends the
// order to Printful with the shipping address PayPal collected and a link to the back print.
//
// Safety: the Printful order is a DRAFT (nothing printed, nothing charged to the store) unless
// PayPal checkout is live AND PRINTFUL_CONFIRM=on. Sandbox payments can only ever make drafts.
// The shipping address goes from PayPal to Printful and is not stored by this site.
//
// Env: PRINTFUL_API_KEY (a private token for the Printful store), PRINTFUL_STORE_ID (only for
// account-level tokens), PRINTFUL_CATALOG_PRODUCT (default 71, Bella+Canvas 3001 unisex tee),
// PRINTFUL_COLOR (default Black), PRINTFUL_CONFIRM ("on" to submit live orders for printing).

export function printfulSettings(env = process.env) {
  return {
    on: Boolean(env.PRINTFUL_API_KEY),
    base: (env.PRINTFUL_API_BASE || "https://api.printful.com").replace(/\/$/, ""),
    key: env.PRINTFUL_API_KEY || "",
    storeId: env.PRINTFUL_STORE_ID || "",
    product: env.PRINTFUL_CATALOG_PRODUCT || "71",
    color: env.PRINTFUL_COLOR || "Black",
    confirmWanted: env.PRINTFUL_CONFIRM === "on",
  };
}

async function call(s, method, path, body) {
  const headers = { Authorization: `Bearer ${s.key}`, "Content-Type": "application/json" };
  if (s.storeId) headers["X-PF-Store-Id"] = s.storeId;
  const r = await fetch(s.base + path, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) });
  const json = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, json };
}

// Size -> Printful catalog variant id for the chosen tee in the chosen color.
let sizes = null;
export async function shirtSizes(s = printfulSettings(), { fresh = false } = {}) {
  if (sizes && !fresh && sizes.at > Date.now() - 60 * 60 * 1000) return sizes.map;
  const r = await call(s, "GET", `/products/${encodeURIComponent(s.product)}`);
  if (!r.ok) throw new Error(`printful catalog ${r.status}: ${(r.json.error && r.json.error.message) || r.json.result || "no detail"}`);
  const map = {};
  const want = s.color.toLowerCase();
  for (const v of (r.json.result && r.json.result.variants) || []) {
    // Variant names end like "(Black / M)"; use the fields when present, the name when not.
    const m = String(v.name || "").match(/\(([^()]+?)\s*\/\s*([^()]+)\)\s*$/) || [];
    const color = String(v.color || m[1] || "").trim().toLowerCase();
    const size = String(v.size || m[2] || "").trim().toUpperCase();
    if (color === want && size && v.in_stock !== false && !map[size]) map[size] = v.id;
  }
  sizes = { at: Date.now(), map };
  return map;
}
// The ship-to address from a captured PayPal order, in Printful's shape. Exported for tests.
export function recipientFrom(paypalOrder) {
  const ship = (((paypalOrder || {}).purchase_units || [])[0] || {}).shipping || {};
  const a = ship.address || {};
  if (!a.address_line_1 || !a.country_code) return null;
  return {
    name: String((ship.name && ship.name.full_name) || "").slice(0, 100),
    address1: a.address_line_1,
    ...(a.address_line_2 ? { address2: a.address_line_2 } : {}),
    city: a.admin_area_2 || "",
    ...(a.admin_area_1 ? { state_code: a.admin_area_1 } : {}),
    country_code: a.country_code,
    zip: a.postal_code || "",
  };
}

// Send one paid shirt order to Printful. frontUrl and backUrl are public links to its prints.
// Returns { ok, printfulId, draft, note }.
export async function sendShirt({ row, paypalOrder, paypalLive, backUrl, frontUrl }, s = printfulSettings()) {
  if (!s.on) return { ok: false, note: "Printful is not connected (PRINTFUL_API_KEY)." };
  if (!backUrl || !frontUrl) return { ok: false, note: "No print files for this order." };
  const recipient = recipientFrom(paypalOrder);
  if (!recipient) return { ok: false, note: "PayPal returned no shipping address." };
  let variant;
  try {
    variant = (await shirtSizes(s))[String(row.size || "").toUpperCase()];
  } catch (err) {
    return { ok: false, note: err.message };
  }
  if (!variant) return { ok: false, note: `No ${s.color} ${row.size} in Printful's catalog product ${s.product}.` };
  const confirm = Boolean(paypalLive && s.confirmWanted);
  const r = await call(s, "POST", `/orders?confirm=${confirm ? "true" : "false"}`, {
    external_id: `lofs-${row.id}`,
    recipient,
    items: [{ variant_id: variant, quantity: 1, files: [{ type: "front", url: frontUrl }, { type: "back", url: backUrl }] }],
  });
  if (!r.ok) {
    const why = (r.json.error && r.json.error.message) || (typeof r.json.result === "string" ? r.json.result : "") || "no detail";
    return { ok: false, note: `Printful refused the order (${r.status}): ${why}`.slice(0, 300) };
  }
  return { ok: true, printfulId: String(r.json.result && r.json.result.id), draft: !confirm, note: confirm ? "submitted for printing" : "draft only" };
}
