// The front of the "Wear your call" shirt, in one place so the site's picture and the printed
// shirt match: the eagle, SHOW ME / THE / RECEIPTS on the yellow bar, and the site's address.
// Returns SVG markup in a 300 x 400 frame (the 3:4 shape of the print area). The server copies
// this file (server/sync-data.mjs) and renders it at print size.
export function shirtFront({ font = "Bricolage Grotesque" } = {}) {
  const t = (y, size, fill, text, extra = "") =>
    `<text x="150" y="${y}" text-anchor="middle" font-family="${font}" font-weight="800" font-size="${size}" fill="${fill}"${extra}>${text}</text>`;
  return [
    // The eagle's head, the same drawing as the site's logo, without the dark tile.
    `<svg x="108" y="8" width="84" height="84" viewBox="88 32 56 56">`,
    `<path d="M100 88C98 78 100 70 104 64H137C141 70 143 78 141 88Z" fill="#7a4e2c"/>`,
    `<path d="M107 66C102 53 106 38 120 36C133 35 140 45 137 58L140 72L133 67L130 76L125 68L120 77L115 68L110 75Z" fill="#ffffff"/>`,
    `<path d="M109 45L96 46C91 47 89 53 93 59C94 54 98 52 104 53L112 55Z" fill="#ffc21a"/>`,
    `<path d="M108 41L125 38" fill="none" stroke="#14201f" stroke-width="2.8" stroke-linecap="round"/>`,
    `<circle cx="117" cy="45.5" r="3" fill="#ffc21a"/>`,
    `<circle cx="116.6" cy="45.5" r="1.5" fill="#14201f"/>`,
    `</svg>`,
    t(150, 52, "#ffffff", "SHOW ME", ` letter-spacing="-1"`),
    t(186, 30, "#ffffff", "THE"),
    `<g transform="rotate(-2 150 222)">`,
    `<rect x="40" y="195" width="220" height="54" fill="#ffe14a"/>`,
    t(238, 44, "#14201f", "RECEIPTS", ` letter-spacing="-0.6"`),
    `</g>`,
    t(282, 12.5, "#ffe14a", "LEGITORFULLOFSHIT.COM", ` letter-spacing="0.4"`),
  ].join("");
}
