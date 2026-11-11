// The issues as big illustrated panels, used on the home page and the state page. Panels in view
// get their accent and motion turned up.
import { useEffect, useRef } from "react";
import IssueArt from "./IssueArt.jsx";

export default function IssueReel({ issues, people, onOpen, heading = "The issues", deps = [] }) {
  const reel = useRef(null);
  useEffect(() => {
    const el = reel.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    el.classList.add("live");
    const io = new IntersectionObserver(
      (items) => items.forEach((it) => it.target.classList.toggle("inview", it.isIntersecting)),
      { threshold: 0.45 }
    );
    el.querySelectorAll(".panel").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, deps);

  return (
    <>
      <h2 className="reel-head">{heading}</h2>
      <section className="reel" ref={reel} aria-label="Issues on the record">
        {issues.map((i) => {
          const n = people.filter((p) => p.entries[i.id]).length;
          return (
            <article className="panel" key={i.id}>
              <IssueArt issue={i} />
              <div className="panel-text">
                <h2>{i.name}</h2>
                <p>{i.blurb}</p>
                <p className="panel-count">
                  {n} {n === 1 ? "person" : "people"} on file · {i.measures.length} {i.measures.length === 1 ? "measure" : "measures"}
                </p>
                <button id={`open-${i.id}`} className="panel-go" onClick={() => onOpen(i.id)}>
                  See who said what
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}
