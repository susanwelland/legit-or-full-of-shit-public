// "Share my call": a link that opens this person on this issue, with the visitor's call as the
// opening line and the reason from the record (their vote, or a short quote). Phones get the system
// share sheet; everywhere else gets copy-link and a few direct links. No share buttons from the
// networks themselves, so nothing tracks visitors. Instagram has no web share link, so it copies
// the caption.
import { useState } from "react";
import { track } from "./analytics.js";

const HASH = import.meta.env.VITE_SINGLE === "1";

// Why they made the call, in the record's own terms: their first recorded vote on this issue, or
// failing that, a short quote. Never a summary of ours.
function because(entry) {
  if (!entry) return "";
  const did = (entry.did || []).filter((d) => d.measure && d.vote);
  const r = did.find((d) => /^(yea|aye|yes|nay|no)$/i.test(String(d.vote).trim())) || did[0];
  if (r) {
    const v = String(r.vote).trim();
    const how = /^(yea|aye|yes|nay|no)$/i.test(v) ? `voted ${v[0].toUpperCase() + v.slice(1).toLowerCase()} on` : `were recorded ${v.toLowerCase()} on`;
    return ` They ${how} ${r.measure}.`;
  }
  const q = (entry.said || []).find((x) => x.text && x.text.length <= 110);
  if (q) return ` They said: "${q.text}"`;
  return "";
}

export default function ShareCall({ person, issue, call, state, entry }) {
  const [copied, setCopied] = useState(false);
  const [igCopied, setIgCopied] = useState(false);
  const verdict = call === "legit" ? "Legit" : "Full of Shit";
  const origin = typeof location !== "undefined" && /^https?:/.test(location.protocol) ? location.origin : "https://legitorfullofshit.com";
  const url = HASH ? `${origin}/` : `${origin}/${state}/${issue.id}/${encodeURIComponent(person.id)}/`;
  const text = `I voted ${verdict} on ${person.name} (${issue.name}).${because(entry)} See the receipts and make your own call:`;
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function share() {
    track("share_clicked", { state, item: `${issue.id}:${person.id}`, how: canShare ? "native" : "copy" });
    if (canShare) {
      try {
        await navigator.share({ title: "Legit or Full of Shit", text, url });
        return;
      } catch {
        /* closed the sheet, or not allowed: fall through to copying */
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  async function instagram() {
    track("share_clicked", { state, item: `${issue.id}:${person.id}`, how: "instagram" });
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setIgCopied(true);
      setTimeout(() => setIgCopied(false), 4000);
    } catch {
      setIgCopied(false);
    }
  }

  const enc = encodeURIComponent;
  return (
    <div className="share">
      <button type="button" className="share-go" id="share-call" onClick={share}>
        {copied ? "Link copied. Paste it anywhere." : "Share your call"}
      </button>
      <p className="share-links">
        Or post it:{" "}
        <a href={`https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`} target="_blank" rel="noreferrer" onClick={() => track("share_clicked", { state, how: "x" })}>X</a>
        {" · "}
        <a href={`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`} target="_blank" rel="noreferrer" onClick={() => track("share_clicked", { state, how: "facebook" })}>Facebook</a>
        {" · "}
        <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`} target="_blank" rel="noreferrer" onClick={() => track("share_clicked", { state, how: "linkedin" })}>LinkedIn</a>
        {" · "}
        <button type="button" className="linkish" id="share-ig" onClick={instagram}>Instagram</button>
        {" · "}
        <a href={`sms:?&body=${enc(`${text} ${url}`)}`} onClick={() => track("share_clicked", { state, how: "text" })}>Text a friend</a>
      </p>
      <p className="share-preview">“{text} {url}”</p>
      {igCopied && <p className="call-note" role="status">Caption copied. Paste it into your Instagram post or story, with a screenshot of the record.</p>}
    </div>
  );
}
