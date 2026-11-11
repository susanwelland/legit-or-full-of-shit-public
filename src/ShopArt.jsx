// Product pictures for the Eagle's General Store, drawn from the shop mockup (directions A and B,
// plus the C certificate). Pictures only: nothing here is for sale until Printful is verified.

const TEE = "M78 14C90 26 150 26 162 14L222 40L206 86L176 74V216H64V74L34 86L18 40Z";
const NECK = "M78 14C90 26 150 26 162 14";

// The site's eagle head, at the mark's own coordinates (a 60 x 60 box at 85,28).
function EagleHead() {
  return (
    <>
      <path d="M100 88C98 78 100 70 104 64H137C141 70 143 78 141 88Z" fill="#4a2f1b" />
      <path d="M107 66C102 53 106 38 120 36C133 35 140 45 137 58L140 72L133 67L130 76L125 68L120 77L115 68L110 75Z" fill="#ffffff" />
      <path d="M109 45L96 46C91 47 89 53 93 59C94 54 98 52 104 53L112 55Z" fill="#ffc21a" />
      <path d="M108 41L125 38" fill="none" stroke="#14201f" strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="117" cy="45.5" r="3" fill="#ffc21a" />
      <circle cx="116.6" cy="45.5" r="1.5" fill="#14201f" />
    </>
  );
}

// A round seal: the eagle inside a gold ring of type.
export function Roundel({ id, top = "LEGIT OR FULL OF SHIT", bottom = "YOU MAKE THE CALL", r = 46, scale = 0.8, dark = "#14201f" }) {
  return (
    <g>
      <circle r={r + 6} fill="none" stroke="#f2b705" strokeWidth="2.5" />
      <circle r={r - 6} fill={dark} stroke="#f2b705" strokeWidth="1.5" />
      <g transform={`scale(${scale}) translate(-115,-60)`}>
        <EagleHead />
      </g>
      <path id={`${id}-t`} d={`M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0`} fill="none" />
      <text fontFamily="IBM Plex Mono, monospace" fontSize="8.4" fontWeight="600" fill="#f2b705" letterSpacing="1.5">
        <textPath href={`#${id}-t`} startOffset="50%" textAnchor="middle">{top}</textPath>
      </text>
      <path id={`${id}-b`} d={`M ${-r} 0 A ${r} ${r} 0 0 0 ${r} 0`} fill="none" />
      <text fontFamily="IBM Plex Mono, monospace" fontSize="8" fill="#f2b705" letterSpacing="2">
        <textPath href={`#${id}-b`} startOffset="50%" textAnchor="middle">{bottom}</textPath>
      </text>
    </g>
  );
}

const ART = {
  "record-tee": (
    <svg viewBox="0 0 240 230" role="img" aria-label="Cream T-shirt printed SAID. over DID.">
      <path d={TEE} fill="#fdfbf4" stroke="#14201f" strokeWidth="2" />
      <path d={NECK} fill="none" stroke="#14201f" strokeWidth="2" />
      <text x="120" y="96" textAnchor="middle" fontFamily="Bricolage Grotesque, Arial" fontWeight="800" fontSize="34" fill="#14201f">SAID.</text>
      <rect x="70" y="106" width="100" height="4" fill="#ffe14a" />
      <text x="120" y="142" textAnchor="middle" fontFamily="Bricolage Grotesque, Arial" fontWeight="800" fontSize="34" fill="#14201f">DID.</text>
      <text x="120" y="168" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9.5" fill="#56655f">you make the call</text>
    </svg>
  ),
  "roundel-tee": (
    <svg viewBox="0 0 240 230" role="img" aria-label="Dark green T-shirt with the eagle seal">
      <path d={TEE} fill="#1d2c28" stroke="#e9efec" strokeWidth="2" />
      <path d={NECK} fill="none" stroke="#e9efec" strokeWidth="2" />
      <g transform="translate(120,118)">
        <Roundel id="rt" bottom="EST. 2026 · UTAH" />
      </g>
    </svg>
  ),
  "roundel-cap": (
    <svg viewBox="0 0 240 220" role="img" aria-label="Dark green cap with a small gold seal">
      <path d="M40 128C40 78 78 48 120 48C162 48 200 78 200 128L40 128Z" fill="#1d2c28" stroke="#14201f" strokeWidth="2.5" />
      <path d="M40 128C20 132 8 144 6 158C40 150 200 150 234 158C232 144 220 132 200 128Z" fill="#14201f" />
      <circle cx="120" cy="96" r="26" fill="none" stroke="#f2b705" strokeWidth="2" />
      <g transform="translate(120,96) scale(0.28)">
        <path d="M-25 30C-27 20 -25 12 -21 6H12C16 12 18 20 16 30Z" fill="#f2b705" />
        <path d="M-18 8C-23 -5 -19 -20 -5 -22C8 -23 15 -13 12 0L15 14L8 9L5 18L0 10L-5 19L-10 10L-15 17Z" fill="#f2b705" />
      </g>
      <text x="120" y="186" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="8.5" fill="#56655f" letterSpacing="1">LEGIT OR FULL OF SHIT</text>
    </svg>
  ),
  "sticker-pack": (
    <svg viewBox="0 0 240 220" role="img" aria-label="Three stickers: I checked the record, said and did, and the round mark">
      <g transform="translate(52,44) rotate(-6)">
        <rect width="136" height="58" rx="10" fill="#14201f" stroke="#fff" strokeWidth="4" />
        <text x="68" y="26" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontWeight="600" fontSize="11" fill="#ffe14a">I CHECKED</text>
        <text x="68" y="44" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontWeight="600" fontSize="11" fill="#ffe14a">THE RECORD</text>
      </g>
      <g transform="translate(66,116) rotate(3)">
        <rect width="112" height="46" rx="23" fill="#fff" stroke="#14201f" strokeWidth="3" />
        <text x="56" y="29" textAnchor="middle" fontFamily="Bricolage Grotesque, Arial" fontWeight="800" fontSize="15" fill="#14201f">SAID ↔ DID</text>
      </g>
      <g transform="translate(180,110) rotate(9)">
        <circle cx="26" cy="26" r="26" fill="#ffe14a" stroke="#14201f" strokeWidth="3" />
        <text x="26" y="31" textAnchor="middle" fontFamily="Bricolage Grotesque, Arial" fontWeight="800" fontSize="12" fill="#14201f">LOFOS</text>
      </g>
    </svg>
  ),
  "source-mug": (
    <svg viewBox="0 0 240 220" role="img" aria-label="White mug printed word for word, with the source">
      <rect x="52" y="48" width="112" height="130" rx="12" fill="#ffffff" stroke="#14201f" strokeWidth="2.5" />
      <path d="M164 74h22a16 16 0 0 1 0 32h-6a16 16 0 0 1 0 32h-16" fill="none" stroke="#14201f" strokeWidth="2.5" />
      <text x="108" y="100" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="11" fill="#14201f">word for word,</text>
      <text x="108" y="118" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="11" fill="#14201f">with the source.</text>
      <rect x="78" y="132" width="60" height="4" fill="#ffe14a" />
      <text x="108" y="156" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="8" fill="#56655f">legitorfullofshit.com</text>
    </svg>
  ),
  "roundel-sticker": (
    <svg viewBox="0 0 240 220" role="img" aria-label="Round die-cut sticker of the eagle seal">
      <g transform="translate(120,108)">
        <circle r="72" fill="#14201f" />
        <circle r="72" fill="none" stroke="#fff" strokeWidth="6" opacity="0.9" />
        <Roundel id="rs" r={50} scale={0.95} />
      </g>
    </svg>
  ),
  "call-tee": (
    <svg viewBox="0 0 240 230" role="img" aria-label="Black T-shirt printed with your own call">
      <path d={TEE} fill="#14201f" stroke="#0b1512" strokeWidth="2" />
      <path d={NECK} fill="none" stroke="#e9efec" strokeWidth="1.5" />
      <text x="120" y="88" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="8" fill="#9fb0aa">THE NAME YOU CHECKED</text>
      <rect x="74" y="98" width="92" height="3" fill="#f2b705" />
      <text x="120" y="124" textAnchor="middle" fontFamily="Bricolage Grotesque, Arial" fontWeight="800" fontSize="19" fill="#ffe14a">I VOTED.</text>
      <text x="120" y="146" textAnchor="middle" fontFamily="Bricolage Grotesque, Arial" fontWeight="700" fontSize="11" fill="#e9efec">LEGIT!</text>
      <text x="120" y="160" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="7" fill="#9fb0aa">or</text>
      <text x="120" y="174" textAnchor="middle" fontFamily="Bricolage Grotesque, Arial" fontWeight="700" fontSize="11" fill="#e9efec">FULL OF SHIT!</text>
    </svg>
  ),
};

export function ProductArt({ id }) {
  return ART[id] || null;
}

// The certificate. With a name it is the finished, printable one; without, the preview.
export function Certificate({ name = "", date = "", calls = 0 }) {
  const shown = name.trim().slice(0, 40);
  return (
    <svg className="cert-svg" viewBox="0 0 240 220" role="img" aria-label={`I Made the Call certificate${shown ? ` for ${shown}` : ""}`}>
      <rect x="18" y="16" width="204" height="188" fill="#fdfbf4" stroke="#14201f" strokeWidth="2.5" />
      <rect x="26" y="24" width="188" height="172" fill="none" stroke="#14201f" strokeWidth="1" />
      <text x="120" y="50" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="7" letterSpacing="1.2" fill="#56655f">LEGITORFULLOFSHIT.COM CERTIFIES</text>
      <text x="120" y="82" textAnchor="middle" fontFamily="Bricolage Grotesque, Arial" fontWeight="800" fontSize="24" fill="#14201f">I Made the Call</text>
      <text x="120" y="107" textAnchor="middle" fontFamily="Bricolage Grotesque, Arial" fontWeight="700" fontSize={shown.length > 24 ? 10 : 13} fill="#14201f">{shown}</text>
      <line x1="60" y1="112" x2="180" y2="112" stroke="#56655f" strokeWidth="1" />
      {!shown && <text x="120" y="124" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="7.5" fill="#56655f">your name here</text>}
      <text x="120" y="144" textAnchor="middle" fontFamily="Public Sans, sans-serif" fontSize="9" fill="#14201f">checked the record, weighed said vs. did,</text>
      <text x="120" y="156" textAnchor="middle" fontFamily="Public Sans, sans-serif" fontSize="9" fill="#14201f">and voted like it matters.</text>
      <g transform="translate(120,180)">
        <circle r="14" fill="#ffe14a" stroke="#14201f" strokeWidth="1.5" />
        <path d="M0 -8 L2.4 -2.4 L8 -2.4 L3.4 1.4 L5 7 L0 3.6 L-5 7 L-3.4 1.4 L-8 -2.4 L-2.4 -2.4 Z" fill="#14201f" />
      </g>
      <text x="62" y="186" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="7" fill="#14201f">{date || "date"}</text>
      <text x="62" y="195" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="6" fill="#56655f">{calls ? `${calls} ${calls === 1 ? "call" : "calls"} made` : ""}</text>
      <text x="178" y="186" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="7" fill="#56655f">the eagle</text>
    </svg>
  );
}
