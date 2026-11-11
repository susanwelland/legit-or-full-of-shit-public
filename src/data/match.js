// "Who votes like you": each question is one real recorded vote. A Yes answer matches a Yea/Aye
// vote on that measure. Only measures where a yes vote has one plain meaning are used, so mixed
// bills (SB 172, HB 507, the Dec 9 budget motion) are left out on purpose.
export const QUESTIONS = [
  {
    id: "hb328",
    issue: "lake",
    measure: "HB 328 (2026)",
    ask: "Should new businesses in the Great Salt Lake basin be barred from spray-watering decorative grass?",
    note: "HB 328 (2026). Passed the Utah House 39-29, then died in the Senate.",
  },
  {
    id: "hcr9",
    issue: "lake",
    measure: "HCR 9 (2026)",
    ask: "Should Utah ask the federal government to help pay to restore the Great Salt Lake?",
    note: "HCR 9 (2026), a resolution. Passed the House 70-1 and the Senate 26-1.",
  },
  {
    id: "hb76",
    issue: "datacenters",
    measure: "HB 76 (2026)",
    ask: "Should large new data centers have to report how much water they use and where it comes from?",
    note: "HB 76 (2026). Became law in March 2026.",
  },
  {
    id: "datapause",
    issue: "datacenters",
    measures: ["Resolution 26-792, with a data center moratorium added", "Grand County pause"],
    ask: "Should your county pause new data center approvals while it writes rules?",
    note: "Salt Lake County's pause failed 4-4 on Aug 18, 2026. Grand County adopted a 180-day pause 7-0 on July 7, 2026.",
  },
  {
    id: "hb468",
    issue: "flock",
    measure: "HB 468 (2025)",
    ask: "Should the state set rules for police license plate cameras and the data they collect?",
    note: "HB 468 (2025). Passed the House 64-2, never got a Senate vote.",
  },
];

// Yes / no / no comparison, from one recorded vote.
export function sideOf(vote) {
  const v = String(vote || "").toLowerCase();
  if (v === "yea" || v === "aye" || v === "yes") return "yes";
  if (v === "nay" || v === "no") return "no";
  return null;
}
