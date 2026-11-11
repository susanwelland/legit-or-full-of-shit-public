// Pictures for Agree to Disagree: Angelica, the site's AI host, and the animal avatars people pick
// when they join. All drawings are original SVGs.
import { useState } from "react";

// Angelica's photo lives at public/img/angelica.jpg. If it fails to load, her drawing is shown.
const PHOTO = `${import.meta.env.BASE_URL || "/"}img/angelica.jpg`;
export const ANGELICA_ALT = "Angelica, the site's AI host, a golden doodle in a stars-and-stripes top hat";

// A golden doodle with curly fur and a small red, white and blue top hat.
function DoodleWithHat() {
  const curls = [
    [14, 30], [22, 22], [32, 19], [42, 22], [50, 30], [12, 40], [52, 40], [16, 50], [48, 50], [24, 56], [40, 56], [32, 58],
  ];
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={ANGELICA_ALT}>
      <circle cx="32" cy="32" r="32" fill="#fff4d6" />
      {/* ears */}
      <ellipse cx="13" cy="40" rx="8" ry="13" fill="#c98a2e" />
      <ellipse cx="51" cy="40" rx="8" ry="13" fill="#c98a2e" />
      {/* curly head */}
      {curls.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="7" fill="#e3a94a" />
      ))}
      <circle cx="32" cy="38" r="17" fill="#e8b45a" />
      {[[24, 28], [32, 26], [40, 28], [28, 33], [36, 33]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.4" fill="#f1c779" />
      ))}
      {/* face */}
      <circle cx="26" cy="38" r="2.4" fill="#2a1a0c" />
      <circle cx="38" cy="38" r="2.4" fill="#2a1a0c" />
      <circle cx="26.8" cy="37.2" r="0.7" fill="#fff" />
      <circle cx="38.8" cy="37.2" r="0.7" fill="#fff" />
      <ellipse cx="32" cy="46" rx="8" ry="6" fill="#f4d08f" />
      <ellipse cx="32" cy="43.5" rx="3.4" ry="2.4" fill="#2a1a0c" />
      <path d="M32 46 v2.5 M29 49 q3 2.5 6 0" stroke="#2a1a0c" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      {/* top hat: red and white stripes, blue band with stars */}
      <g transform="rotate(-8 32 14)">
        <ellipse cx="32" cy="20" rx="13" ry="3" fill="#1d3a8a" />
        <rect x="24" y="4" width="16" height="16" fill="#fff" />
        <rect x="24" y="4" width="3.2" height="16" fill="#c62828" />
        <rect x="30.4" y="4" width="3.2" height="16" fill="#c62828" />
        <rect x="36.8" y="4" width="3.2" height="16" fill="#c62828" />
        <rect x="24" y="14" width="16" height="4" fill="#1d3a8a" />
        <circle cx="28" cy="16" r="0.9" fill="#fff" />
        <circle cx="32" cy="16" r="0.9" fill="#fff" />
        <circle cx="36" cy="16" r="0.9" fill="#fff" />
        <ellipse cx="32" cy="4" rx="8" ry="1.6" fill="#c62828" />
      </g>
    </svg>
  );
}

export function Angelica({ size = 56 }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className="bd-host-pic" style={{ width: size, height: size }}>
      {broken ? <DoodleWithHat /> : <img src={PHOTO} alt={ANGELICA_ALT} width={size} height={size} onError={() => setBroken(true)} />}
    </span>
  );
}

// The animals people can pick. Simple faces on a colored disc.
const eyes = (y = 30, dx = 8, r = 2.6) => (
  <>
    <circle cx={32 - dx} cy={y} r={r} fill="#1b1b1b" />
    <circle cx={32 + dx} cy={y} r={r} fill="#1b1b1b" />
  </>
);
const ANIMALS = {
  doodle: {
    label: "Golden doodle",
    bg: "#fde7b0",
    draw: (
      <>
        <ellipse cx="14" cy="34" rx="7" ry="12" fill="#c98a2e" />
        <ellipse cx="50" cy="34" rx="7" ry="12" fill="#c98a2e" />
        {[[20, 18], [32, 14], [44, 18], [16, 28], [48, 28]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="7" fill="#e3a94a" />)}
        <circle cx="32" cy="34" r="16" fill="#e8b45a" />
        {eyes(32, 7, 2.4)}
        <ellipse cx="32" cy="42" rx="7" ry="5" fill="#f4d08f" />
        <ellipse cx="32" cy="40" rx="3" ry="2.2" fill="#1b1b1b" />
      </>
    ),
  },
  fox: {
    label: "Fox",
    bg: "#ffd9c2",
    draw: (
      <>
        <path d="M12 14 L24 26 L14 34 Z M52 14 L40 26 L50 34 Z" fill="#d9601f" />
        <path d="M12 26 Q32 6 52 26 L46 44 Q32 56 18 44 Z" fill="#e8742c" />
        <path d="M20 40 Q32 56 44 40 Q38 46 32 46 Q26 46 20 40 Z" fill="#fff" />
        {eyes(32, 9)}
        <circle cx="32" cy="45" r="2.6" fill="#1b1b1b" />
      </>
    ),
  },
  owl: {
    label: "Owl",
    bg: "#e1d9f2",
    draw: (
      <>
        <path d="M14 16 L22 24 M50 16 L42 24" stroke="#6b4f2e" strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="32" cy="36" rx="19" ry="20" fill="#8a6a43" />
        <circle cx="24" cy="32" r="8" fill="#fff" />
        <circle cx="40" cy="32" r="8" fill="#fff" />
        <circle cx="24" cy="32" r="3.5" fill="#1b1b1b" />
        <circle cx="40" cy="32" r="3.5" fill="#1b1b1b" />
        <path d="M29 40 L32 46 L35 40 Z" fill="#f0a21a" />
      </>
    ),
  },
  turtle: {
    label: "Turtle",
    bg: "#d3eedb",
    draw: (
      <>
        <ellipse cx="32" cy="42" rx="20" ry="12" fill="#3d8b52" />
        <path d="M18 42 h28 M32 32 v20 M24 35 l16 14 M40 35 l-16 14" stroke="#2c6b3d" strokeWidth="1.6" />
        <circle cx="32" cy="22" r="11" fill="#8cc78f" />
        {eyes(20, 4.5, 2)}
        <path d="M28 26 q4 3 8 0" stroke="#1b1b1b" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </>
    ),
  },
  cat: {
    label: "Cat",
    bg: "#dfe5ea",
    draw: (
      <>
        <path d="M14 12 L26 22 L14 30 Z M50 12 L38 22 L50 30 Z" fill="#6f7780" />
        <circle cx="32" cy="34" r="18" fill="#8a929b" />
        <path d="M20 30 l-8 -2 M20 34 h-9 M44 30 l8 -2 M44 34 h9" stroke="#3a3f45" strokeWidth="1.2" />
        <ellipse cx="25" cy="31" rx="2.4" ry="3.4" fill="#1b1b1b" />
        <ellipse cx="39" cy="31" rx="2.4" ry="3.4" fill="#1b1b1b" />
        <path d="M30 38 L34 38 L32 40.5 Z" fill="#e88a9a" />
        <path d="M28 43 q4 3 8 0" stroke="#1b1b1b" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      </>
    ),
  },
  bear: {
    label: "Bear",
    bg: "#ecd8c6",
    draw: (
      <>
        <circle cx="16" cy="18" r="8" fill="#6d4a2f" />
        <circle cx="48" cy="18" r="8" fill="#6d4a2f" />
        <circle cx="32" cy="34" r="19" fill="#7b5536" />
        {eyes(30, 8)}
        <ellipse cx="32" cy="42" rx="8" ry="6" fill="#c8a07a" />
        <ellipse cx="32" cy="39.5" rx="3.2" ry="2.3" fill="#1b1b1b" />
      </>
    ),
  },
  rabbit: {
    label: "Rabbit",
    bg: "#f6dbe6",
    draw: (
      <>
        <ellipse cx="24" cy="14" rx="5" ry="13" fill="#e9e4e1" />
        <ellipse cx="40" cy="14" rx="5" ry="13" fill="#e9e4e1" />
        <ellipse cx="24" cy="14" rx="2.2" ry="9" fill="#f2b6c8" />
        <ellipse cx="40" cy="14" rx="2.2" ry="9" fill="#f2b6c8" />
        <circle cx="32" cy="38" r="17" fill="#f3efec" />
        {eyes(35, 7)}
        <path d="M30 41 L34 41 L32 43 Z" fill="#e88a9a" />
        <path d="M32 43 v3" stroke="#1b1b1b" strokeWidth="1.2" />
      </>
    ),
  },
  frog: {
    label: "Frog",
    bg: "#e2f2c4",
    draw: (
      <>
        <circle cx="21" cy="22" r="8" fill="#5aa83a" />
        <circle cx="43" cy="22" r="8" fill="#5aa83a" />
        <ellipse cx="32" cy="38" rx="21" ry="15" fill="#6dbd47" />
        <circle cx="21" cy="22" r="4" fill="#fff" />
        <circle cx="43" cy="22" r="4" fill="#fff" />
        <circle cx="21" cy="22" r="2" fill="#1b1b1b" />
        <circle cx="43" cy="22" r="2" fill="#1b1b1b" />
        <path d="M20 40 q12 9 24 0" stroke="#2f6b1f" strokeWidth="2" fill="none" strokeLinecap="round" />
      </>
    ),
  },
};
export const AVATAR_IDS = Object.keys(ANIMALS);
export const avatarLabel = (id) => (ANIMALS[id] || ANIMALS.doodle).label;

export function Avatar({ id, size = 40, label }) {
  const a = ANIMALS[id] || ANIMALS.doodle;
  return (
    <svg className="bd-avatar" viewBox="0 0 64 64" width={size} height={size} role={label ? "img" : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : true}>
      <circle cx="32" cy="32" r="32" fill={a.bg} />
      {a.draw}
    </svg>
  );
}
