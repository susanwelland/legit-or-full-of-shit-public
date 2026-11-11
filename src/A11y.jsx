// Accessibility settings, always on screen: larger text, high contrast, reduced motion.
// Each is a class on <html>; index.html applies the saved ones before the page draws, so there
// is no flash. Saved in this browser only.
import { useEffect, useState } from "react";
import { track } from "./analytics.js";

export const A11Y_KEY = "lofs-a11y";
const OPTIONS = [
  { id: "text", cls: "a11y-text", label: "Larger text" },
  { id: "contrast", cls: "a11y-contrast", label: "High contrast" },
  { id: "motion", cls: "a11y-still", label: "Reduce motion" },
];

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(A11Y_KEY) || "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

function Icon() {
  // The universal access figure: a head, open arms and legs inside a circle.
  return (
    <svg className="a11y-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="6.6" r="1.7" fill="currentColor" />
      <path d="M6.5 9.4l5.5 1.2 5.5-1.2M12 10.6v3.6l-2.6 4.6M12 14.2l2.6 4.6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function A11yBar() {
  const [on, setOn] = useState(read);
  useEffect(() => {
    const root = document.documentElement;
    for (const o of OPTIONS) root.classList.toggle(o.cls, !!on[o.id]);
    try {
      localStorage.setItem(A11Y_KEY, JSON.stringify(on));
    } catch {
      /* settings last for this visit only */
    }
  }, [on]);

  return (
    <div className="a11y-bar" role="region" aria-label="Accessibility settings">
      <span className="a11y-badge">
        <Icon />
        <span>Accessibility</span>
      </span>
      <div className="a11y-toggles">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            id={`a11y-${o.id}`}
            className={on[o.id] ? "a11y-toggle on" : "a11y-toggle"}
            aria-pressed={!!on[o.id]}
            onClick={() => {
              const next = { ...on, [o.id]: !on[o.id] };
              setOn(next);
              track("a11y_toggle_used", { setting: o.id, on: next[o.id] });
            }}
          >
            {on[o.id] && <span className="a11y-check" aria-hidden="true">✓</span>}
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
