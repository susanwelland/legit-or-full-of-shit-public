// Original line-and-shape illustrations, one per issue. To use a photo instead, add
// image: { src, alt, credit, creditUrl } to the issue in src/data/utah.js.
const frame = { viewBox: "0 0 600 380", preserveAspectRatio: "xMidYMid slice", role: "img" };

function Flock() {
  return (
    <svg {...frame} aria-label="A license plate camera on a pole watching a car on a road">
      <rect className="a-bg" width="600" height="380" />
      <rect className="a-low" y="270" width="600" height="110" />
      <path className="a-line m-road" d="M-80 325h70M-40 325M0 325h70M110 325h70M220 325h70M330 325h70M440 325h70M550 325h70" />
      <polygon className="a-mark beam" points="168,96 470,246 470,318 168,128" />
      <rect className="a-ink" x="118" y="60" width="12" height="230" />
      <polygon className="a-mid" points="78,34 176,22 180,44 82,56" />
      <rect className="a-ink" x="126" y="92" width="52" height="40" rx="4" />
      <circle className="a-bg" cx="166" cy="112" r="9" />
      <circle className="a-mark m-blink" cx="166" cy="112" r="4" />
      <g className="m-drive">
      <path className="a-ink" d="M330 300v-28q0-10 10-12l34-6 22-34q5-8 14-8h84q10 0 15 8l20 34 32 6q9 2 9 12v28z" />
      <rect className="a-bg" x="414" y="226" width="42" height="26" rx="3" />
      <rect className="a-bg" x="464" y="226" width="40" height="26" rx="3" />
      <circle className="a-bg" cx="382" cy="302" r="22" />
      <circle className="a-ink" cx="382" cy="302" r="14" />
      <circle className="a-bg" cx="520" cy="302" r="22" />
      <circle className="a-ink" cx="520" cy="302" r="14" />
      <rect className="a-mark" x="336" y="272" width="34" height="14" rx="2" />
      </g>
    </svg>
  );
}

function Drones() {
  return (
    <svg {...frame} aria-label="A drone hovering over rooftops with a search beam">
      <rect className="a-bg" width="600" height="380" />
      <polygon className="a-mark beam m-sway" points="300,120 150,380 450,380" />
      <path className="a-low" d="M0 380v-70h60v-34h74v50h52v-78h66v60h44v-40h80v72h56v-52h70v48h98v44z" />
      <path className="a-bg" d="M150 300h14v16h-14zM204 262h12v14h-12zM204 290h12v14h-12zM330 300h14v16h-14zM460 310h14v16h-14z" />
      <g className="m-hover">
      <rect className="a-ink" x="262" y="92" width="76" height="26" rx="10" />
      <path className="a-ink" d="M266 100l-70-22v-8l76 14zM334 100l70-22v-8l-76 14z" />
      <rect className="a-ink" x="186" y="60" width="8" height="20" />
      <rect className="a-ink" x="406" y="60" width="8" height="20" />
      <ellipse className="a-mid m-rotor" cx="190" cy="58" rx="46" ry="5" />
      <ellipse className="a-mid m-rotor" cx="410" cy="58" rx="46" ry="5" />
      <circle className="a-bg" cx="300" cy="118" r="11" />
      <circle className="a-mark" cx="300" cy="118" r="5" />
      </g>
      <circle className="a-mid m-blink" cx="90" cy="70" r="2" />
      <circle className="a-mid" cx="520" cy="130" r="2" />
      <circle className="a-mid" cx="480" cy="40" r="2" />
    </svg>
  );
}

function DataCenters() {
  const vents = [];
  for (let i = 0; i < 12; i++) vents.push(<rect key={i} className="a-bg" x={64 + i * 40} y="226" width="22" height="46" />);
  return (
    <svg {...frame} aria-label="A long windowless data center beside power lines">
      <rect className="a-bg" width="600" height="380" />
      <rect className="a-low" y="300" width="600" height="80" />
      <path className="a-line" d="M510 300l24-190 24 190M518 236h32M522 190h24M498 132h72M506 160h56" />
      <path className="a-line" d="M0 150q260 40 498-18M0 178q260 36 506-18" />
      <rect className="a-ink" x="40" y="196" width="490" height="104" />
      <rect className="a-mid" x="40" y="186" width="490" height="12" />
      {vents}
      <rect className="a-mark beam" x="40" y="282" width="490" height="6" />
      <rect className="a-mid" x="90" y="160" width="50" height="26" />
      <rect className="a-mid" x="170" y="160" width="50" height="26" />
      <rect className="a-mid" x="250" y="160" width="50" height="26" />
      <path className="a-steam beam m-steam" d="M108 150q-14-22 4-40t0-40M190 150q-14-22 4-40t0-40M272 150q-14-22 4-40t0-40" />
      <path className="a-water m-water" d="M0 340q40-10 80 0t80 0 80 0 80 0 80 0 80 0 80 0 40 0" />
    </svg>
  );
}

function Lake() {
  return (
    <svg {...frame} aria-label="A shrinking lake with old shorelines and mountains behind it">
      <rect className="a-bg" width="600" height="380" />
      <circle className="a-mark beam m-sun" cx="430" cy="120" r="44" />
      <polygon className="a-mid" points="0,190 90,110 160,160 250,84 340,170 420,128 520,176 600,140 600,200 0,200" />
      <rect className="a-low" y="198" width="600" height="182" />
      <ellipse className="a-ring m-ring" cx="300" cy="300" rx="330" ry="86" />
      <ellipse className="a-ring m-ring r2" cx="300" cy="304" rx="262" ry="64" />
      <ellipse className="a-ring m-ring r3" cx="300" cy="308" rx="196" ry="44" />
      <ellipse className="a-ink" cx="300" cy="312" rx="132" ry="26" />
      <rect className="a-mark beam" x="410" y="306" width="40" height="5" rx="2" />
      <path className="a-line" d="M96 250v38M92 250h8M92 264h8M92 278h8" />
    </svg>
  );
}

const ART = { flock: Flock, drones: Drones, datacenters: DataCenters, lake: Lake };

export default function IssueArt({ issue }) {
  if (issue.image) {
    return (
      <figure className="art photo">
        <img src={issue.image.src} alt={issue.image.alt} loading="lazy" />
        <figcaption>
          Photo:{" "}
          {issue.image.creditUrl ? (
            <a href={issue.image.creditUrl} target="_blank" rel="noreferrer">{issue.image.credit}</a>
          ) : (
            issue.image.credit
          )}
        </figcaption>
      </figure>
    );
  }
  const Art = ART[issue.id];
  return <div className="art">{Art ? <Art /> : null}</div>;
}
