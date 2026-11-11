// The calls where visitors are most evenly split. It ranks by how close the split is, never by
// which way it leans, and it shows the numbers only for calls this visitor has already made,
// so the rule "tallies stay hidden until you make your own call" still holds.
const MIN_CALLS = 10;

export default function Divided({ counts, mine, people, issues, open }) {
  const rows = Object.entries(counts || {})
    .map(([key, c]) => {
      const [issueId, personId] = key.split(":");
      const person = people.find((p) => p.id === personId);
      const issue = issues.find((i) => i.id === issueId);
      const total = (c.legit || 0) + (c.fos || 0);
      if (!person || !issue || total < MIN_CALLS) return null;
      return { key, person, issue, c, total, split: 1 - Math.abs(c.legit - c.fos) / total };
    })
    .filter(Boolean)
    .sort((a, b) => b.split - a.split || b.total - a.total)
    .slice(0, 5);

  return (
    <section className="divided" aria-labelledby="divided-head">
      <h2 id="divided-head">Most divided</h2>
      <p className="divided-lede">
        The calls where visitors here are closest to an even split. This ranks how divided people are, not which way they
        lean. Numbers show only for calls you have made yourself.
      </p>
      {rows.length === 0 ? (
        <p className="empty">
          Not enough calls yet. Once at least {MIN_CALLS} people have made a call on someone, the closest splits show here.
        </p>
      ) : (
        <ol className="divided-list">
          {rows.map((r) => (
            <li key={r.key}>
              <button className="linkish divided-name" onClick={() => open(r.person.id, r.issue.id)}>{r.person.name}</button>
              <span className="divided-meta">{r.person.office} · {r.issue.name}</span>
              <span className="divided-count">
                {mine && mine[r.key]
                  ? `Legit ${r.c.legit} · Full of shit ${r.c.fos}`
                  : `${r.total} calls. Make yours to see the split.`}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
