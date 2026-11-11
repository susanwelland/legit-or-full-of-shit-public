// Short emails to the owner when a visitor shows buying interest: an evidence file built, a
// checkout started, a payment completed. Sent through Resend from the site's own address.
// At most one email per kind every ten minutes; anything in between is counted into the next one.
const WINDOW_MS = 10 * 60 * 1000;
const last = new Map(); // kind -> { at, held }

export async function alertOwner(kind, subject, lines) {
  const { RESEND_API_KEY, INBOX_FORWARD_TO, INBOX_ADDRESS = "eagle@legitorfullofshit.com", RESEND_API_BASE = "https://api.resend.com" } = process.env;
  if (!RESEND_API_KEY || !INBOX_FORWARD_TO) return false;
  const now = Date.now();
  const seen = last.get(kind) || { at: 0, held: 0 };
  if (now - seen.at < WINDOW_MS) {
    seen.held += 1;
    last.set(kind, seen);
    return false;
  }
  const extra = seen.held ? [`(${seen.held} more like this in the last ten minutes.)`] : [];
  last.set(kind, { at: now, held: 0 });
  try {
    const r = await fetch(`${RESEND_API_BASE}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: `Eagle alerts <${INBOX_ADDRESS}>`,
        to: [INBOX_FORWARD_TO],
        subject: `[Eagle · alert] ${subject}`.slice(0, 250),
        text: [...lines, ...extra, "", "Sent by legitorfullofshit.com. No visitor contact details are included."].join("\n"),
      }),
    });
    if (!r.ok) console.error("alert failed", r.status);
    return r.ok;
  } catch (err) {
    console.error("alert failed", err.message);
    return false;
  }
}
