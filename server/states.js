// The open states besides Utah, read from the same generated modules the site uses
// (src/data/states/, copied here by sync-data.mjs). Utah's data is still read directly where it was.
import { OPEN_STATES } from "./data/states/index.js";

export const states = await Promise.all(OPEN_STATES.map((s) => s.load()));

// A person on one of these ballots, with their state's issues.
export function statePerson(id) {
  for (const s of states) {
    const person = s.people.find((p) => p.id === id);
    if (person) return { person, issues: s.issues, state: s };
  }
  return null;
}

const onFile = (e) => !!e && (e.said.length > 0 || e.did.length > 0);

// Call keys, "issue:person", for everyone with a quote or a vote on file on that issue. Person ids
// carry their state's prefix (ca-, or-, wy-), so these never collide with Utah's keys.
export const stateKeys = states.flatMap((s) =>
  s.people.flatMap((p) => s.issues.filter((i) => onFile(p.entries[i.id])).map((i) => `${i.id}:${p.id}`))
);
