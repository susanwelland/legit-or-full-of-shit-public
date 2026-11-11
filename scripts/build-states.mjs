// Turns a state's checked staging files into the data module the site reads:
//   src/data/states/<slug>.js   { slug, name, code, issues, people, ballotSource, electionDate, places, questions }
//   src/data/states/index.js    the list of open states, each loaded on demand
//
// Run:  node scripts/build-states.mjs                      (every state in STATES below)
//       node scripts/build-states.mjs oregon               (one state; the index still lists every built module)
//       STATE_WORK=/path/to/staging node scripts/build-states.mjs
//
// Input, per state, in <STATE_WORK>/<slug>/:
//   ballot.json (or, for California, src/data/californiaBallot.js), ballot-source.json,
//   issues.json, votes.json (only rows with kind "official" are used), quotes.verified.json.
// Nothing is written into a quote or a vote that is not in those files. The generated modules are
// committed, so building the site never needs the staging folder.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WORK = process.env.STATE_WORK || "/home/claude/state-work";
const OUT = join(ROOT, "src", "data", "states");
const ELECTION = "November 3, 2026";

// How a person's office maps to the races the finder and the address lookup know about.
// `from` names the field of the address lookup (server/lookup.js) that fills it; null means the
// lookup cannot be trusted for it, so after a lookup everyone in that race stays listed, with `note`.
// Offices that match no pattern are statewide and show for every address in the state.
const STATES = {
  arizona: {
    code: "AZ",
    name: "Arizona",
    places: [
      { type: "house", label: "Legislative district (House)", pattern: "^State House, District (\\d+)", from: "house" },
      { type: "senate", label: "Legislative district (Senate)", pattern: "^State Senate, District (\\d+)", from: "senate" },
      { type: "us", label: "U.S. House district", pattern: "^U\\.S\\. House, District (\\d+)", from: "us" },
    ],
    questions: [
      { id: "hcr2001", issue: "elections", measure: "HCR 2001 (2026)", last: true, ask: "Should the state constitution require every voter, in person or by mail, to show government-issued proof of identity before casting a ballot?", note: "HCR 2001 (2026), now Prop 144. House final reading 31-23 (Jun 12, 2026); Senate 16-12 (Jun 12, 2026)." },
      { id: "sb1611", issue: "water", measure: "SB 1611 (2025)", last: true, ask: "Should home builders in the Phoenix and Pinal areas be able to get groundwater rights from farmers who retire their farmland, as the 2025 ag-to-urban law allows?", note: "SB 1611 (2025). Senate 26-4 (Jun 19, 2025); House 35-20 (Jun 23, 2025); signed Jun 30, 2025." },
      { id: "hcr2021", issue: "cost", measure: "HCR 2021 (2025)", last: true, ask: "Should a city tax on groceries need local voter approval and be capped at 2 percent?", note: "HCR 2021 (2025), now Prop 316. House 37-21 (Mar 4, 2025); Senate 23-5 (Jun 20, 2025)." },
      { id: "scr1004", issue: "cost", measure: "SCR 1004 (2025)", last: true, ask: "Should the state and local governments be barred from taxing drivers by the mile?", note: "SCR 1004 (2025), now Prop 141. Senate 17-12 (Feb 20, 2025); House 31-0 with 29 not voting (Jun 13, 2025)." },
      { id: "scr1032", issue: "schools", measure: "SCR 1032 (2026)", last: true, ask: "Should large school districts have to spend at least 60 percent of their operating budgets on direct instruction?", note: "SCR 1032 (2026), now Prop 320. Senate 16-12 (Mar 23, 2026); House 31-22 (Jun 13, 2026)." },
      { id: "hcr2055", issue: "border", measure: "HCR 2055 (2025)", last: true, ask: "Should state law declare drug cartels terrorist organizations?", note: "HCR 2055 (2025), now Prop 317. House 32-27 (Feb 26, 2025); Senate 16-13 on reconsideration (Jun 27, 2025)." },
    ],
  },
  california: {
    code: "CA",
    name: "California",
    places: [
      { type: "house", label: "Assembly district", pattern: "^California Assembly, District (\\d+)", from: "house" },
      { type: "senate", label: "State Senate district", pattern: "^California Senate, District (\\d+)", from: "senate" },
      {
        type: "us",
        label: "U.S. House district",
        pattern: "^U\\.S\\. House, District (\\d+)",
        from: null,
        note: "California's U.S. House races use the new Prop 50 maps, and the national address lookup may still have the old lines, so every U.S. House race is listed. Pick your district to narrow it.",
      },
      {
        type: "boe",
        label: "Board of Equalization district",
        pattern: "^Board of Equalization, District (\\d+)",
        from: null,
        note: "The address lookup does not return Board of Equalization districts, so every one is listed. Pick yours to narrow it.",
      },
    ],
    // "Who votes like you": each question is one real recorded vote where a yes vote has one plain
    // meaning. `last` uses the person's final recorded vote on that measure (final passage).
    // Every ask restates the measure's own `what` text in issues.json; the note quotes its numbers.
    questions: [
      { id: "sb79", issue: "housing", measure: "SB 79 (2025)", last: true, ask: "Should the state allow taller apartment buildings near major transit stops, even where city zoning says no?", note: "SB 79 (2025). Passed the Assembly 43-19 and the Senate 21-8; signed Oct 10, 2025." },
      { id: "sb237", issue: "gas", measure: "SB 237 (2025)", last: true, ask: "Should California speed up permits for new oil and gas wells in Kern County?", note: "SB 237 (2025). Passed the Assembly 66-4 and the Senate 28-0 on Sep 13, 2025; signed Sep 19, 2025." },
      { id: "sb627", issue: "immigration", measure: "SB 627 (2025)", last: true, ask: "Should officers, including federal agents, be barred from covering their faces during most public operations?", note: "SB 627 (2025), the No Secret Police Act. Passed the Assembly 45-23 and the Senate 28-11; signed Sep 20, 2025." },
      { id: "aca8", issue: "redistricting", measure: "ACA 8 (2025)", last: true, ask: "Should the Legislature's new congressional maps have gone before voters as Prop 50?", note: "ACA 8 (2025). Adopted by the Assembly 57-20 and the Senate 30-8 on Aug 21, 2025; voters approved Prop 50 in Nov 2025." },
      { id: "hjres88", issue: "gas", measure: "H.J.Res. 88 (2025)", ask: "Should Congress cancel the waiver that lets California enforce its rule phasing out sales of new gas-only cars?", note: "H.J.Res. 88 (2025), a U.S. House vote. Passed 246-164 on May 1, 2025." },
      { id: "s5", issue: "immigration", measure: "S. 5, Laken Riley Act (2025)", ask: "Should federal authorities have to detain immigrants without legal status who are charged with or arrested for certain crimes, such as theft?", note: "The Laken Riley Act (S. 5, 2025), a U.S. House vote. Passed 263-156 on Jan 22, 2025." },
    ],
  },
  wyoming: {
    code: "WY",
    name: "Wyoming",
    places: [
      { type: "house", label: "Wyoming House district", pattern: "^Wyoming House District (\\d+)", from: "house" },
      { type: "senate", label: "Wyoming Senate district", pattern: "^Wyoming Senate District (\\d+)", from: "senate" },
    ],
    questions: [
      { id: "sf69", issue: "propertytax", measure: "SF 69 (2025)", last: true, ask: "Should Wyoming give homeowners a property tax exemption on their primary residence?", note: "SF 69 (2025). The final version passed the Senate 26-3 and the House 49-7 on Feb 27, 2025; signed Mar 4, 2025." },
      { id: "hb64", issue: "abortion", measure: "HB 64 (2025)", last: true, ask: "Should an ultrasound and a 48-hour wait be required before a medication abortion?", note: "HB 64 (2025). Gov. Gordon vetoed it; the House (45-16) and the Senate (22-9) overrode the veto." },
      { id: "hb199", issue: "schoolchoice", measure: "HB 199 (2025)", last: true, ask: "Should Wyoming expand its education savings accounts, which pay for private school and other costs outside public schools?", note: "HB 199 (2025). The final version passed the House 42-19 and the Senate 21-8 on Feb 27, 2025; signed Mar 4, 2025. See the court status under the measure." },
      { id: "hb156", issue: "elections", measure: "HB 156 (2025)", last: true, ask: "Should people registering to vote have to show documents proving U.S. citizenship and Wyoming residency?", note: "HB 156 (2025). Passed the House 51-8 and the Senate 26-4; the House agreed to the Senate's changes 54-3." },
      { id: "hb121", issue: "health", measure: "HB 121 (2025)", last: true, ask: "Should hospitals have to list their prices for medical items and services?", note: "HB 121 (2025). Passed the House 58-3, then failed in the Senate 14-16 on Mar 4, 2025." },
    ],
  },
  oregon: {
    code: "OR",
    name: "Oregon",
    places: [
      { type: "house", label: "Oregon House district", pattern: "^Oregon House, District (\\d+)", from: "house" },
      { type: "senate", label: "Oregon Senate district", pattern: "^Oregon Senate, District (\\d+)", from: "senate" },
      { type: "us", label: "U.S. House district", pattern: "^U\\.S\\. House, District (\\d+)", from: "us" },
    ],
    questions: [
      { id: "hb3991", issue: "transportation", measure: "HB 3991 (2025 special session)", last: true, ask: "Should Oregon raise the gas tax 6 cents a gallon, along with vehicle registration and title fees, to pay for roads and transit?", note: "HB 3991 (2025 special session). Passed the House 36-12 and the Senate 18-11. Voters rejected the tax parts as Measure 120 on May 19, 2026." },
      { id: "sb1599", issue: "transportation", measure: "SB 1599 (2026)", last: true, ask: "Should the public vote on HB 3991 have been held at the May 2026 primary instead of the November general election?", note: "SB 1599 (2026). Passed the Senate 17-13 and the House 31-20; signed Mar 2, 2026." },
      { id: "hb4138", issue: "immigration", measure: "HB 4138 (2026)", last: true, ask: "Should every officer working in Oregon, including federal agents, have to identify themselves, with limits on face coverings?", note: "HB 4138 (2026). Passed the House 36-19 and the Senate 18-10; the House agreed to the Senate's changes 34-18. Signed Mar 31, 2026." },
      { id: "hb3644", issue: "housing", measure: "HB 3644 (2025)", last: true, ask: "Should Oregon put a permanent statewide shelter program into law?", note: "HB 3644 (2025). Passed the House 33-11 and the Senate 19-10." },
    ],
  },
  idaho: {
    code: "ID",
    name: "Idaho",
    places: [
      { type: "house", label: "Legislative district (House)", pattern: "^Idaho House, District (\\d+)", from: "house" },
      { type: "senate", label: "Legislative district (Senate)", pattern: "^Idaho Senate, District (\\d+)", from: "senate" },
      { type: "us", label: "U.S. House district", pattern: "^U\\.S\\. House, District (\\d+)", from: "us" },
    ],
    questions: [
      { id: "hb93", issue: "choice", measure: "HB 93 (2025)", last: true, ask: "Should Idaho give families a refundable tax credit for private school tuition and other nonpublic education costs?", note: "HB 93 (2025). Passed the House 42-28 and the Senate 20-15; signed Feb 27, 2025." },
      { id: "hb40", issue: "taxes", measure: "HB 40 (2025)", last: true, ask: "Should Idaho lower its income tax rate?", note: "HB 40 (2025). Passed the House 63-7 and the Senate 27-8; signed March 6, 2025." },
      { id: "hb913", issue: "health", measure: "HB 913 (2026)", last: true, ask: "Should adults covered by Medicaid expansion have to work to keep their coverage?", note: "HB 913 (2026). Passed the House 59-9 and the Senate 28-6; signed April 10, 2026." },
      { id: "sb1046", issue: "abortion", measure: "SB 1046 (2025)", last: true, ask: "Should public schools have to include fetal development videos in human growth and development lessons?", note: "SB 1046 (2025). Passed the Senate 27-8 and the House 63-6; signed March 26, 2025." },
    ],
  },
  washington: {
    code: "WA",
    name: "Washington",
    places: [
      { type: "house", label: "Legislative district (House)", pattern: "^State Representative, Legislative District (\\d+)", from: "house" },
      { type: "senate", label: "Legislative district (Senate)", pattern: "^State Senator, Legislative District (\\d+)", from: "senate" },
      { type: "us", label: "U.S. House district", pattern: "^U\\.S\\. House, District (\\d+)", from: "us" },
    ],
    questions: [
      { id: "6346", issue: "taxes", measure: "ESSB 6346 (2026)", last: true, ask: "Should Washington tax individual income over $1 million at 9.9%?", note: "ESSB 6346 (2026). Passed the Senate 27-21 and the House 51-46; signed Mar 30, 2026. It starts Jan 1, 2028." },
      { id: "1217", issue: "rent", measure: "EHB 1217 (2025)", last: true, ask: "Should yearly rent increases be capped at 7% plus inflation or 10%, whichever is lower?", note: "EHB 1217 (2025). Final votes: House 54-44, Senate 27-20; signed May 7, 2025." },
      { id: "1163", issue: "guns", measure: "E2SHB 1163 (2025)", last: true, ask: "Should buyers need a state permit before they can purchase a gun?", note: "E2SHB 1163 (2025). Final votes: Senate 29-19, House 57-39; signed May 20, 2025." },
      { id: "5814", issue: "taxes", measure: "ESSB 5814 (2025)", last: true, ask: "Should the sales tax apply to services such as advertising, IT support and software development?", note: "ESSB 5814 (2025). Final votes: House 50-47, Senate 26-22; signed May 20, 2025." },
    ],
  },
  "north-carolina": {
    code: "NC",
    name: "North Carolina",
    places: [
      { type: "house", label: "N.C. House district", pattern: "^N\\.C\\. House, District (\\d+)", from: "house" },
      { type: "senate", label: "N.C. Senate district", pattern: "^N\\.C\\. Senate, District (\\d+)", from: "senate" },
      { type: "us", label: "U.S. House district", pattern: "^U\\.S\\. House, District (\\d+)", from: "us" },
    ],
    questions: [
      { id: "hb318", issue: "immigration", measure: "HB 318 (2025)", last: true, ask: "Should jails have to hold a person with an ICE detainer for up to 48 hours after they would otherwise be released?", note: "HB 318 (2025). Vetoed June 20, 2025; the House (72-48) and Senate (30-19) overrode the veto July 29, 2025." },
      { id: "sb50", issue: "guns", measure: "SB 50 (2025)", last: true, ask: "Should adults 18 and older be able to carry a concealed handgun without a permit?", note: "SB 50 (2025). Passed the Senate 26-18 and the House 59-48; vetoed June 20, 2025." },
      { id: "sb266", issue: "energy", measure: "SB 266 (2025)", last: true, ask: "Should the state drop its 2030 goal of a 70% cut in utility carbon emissions?", note: "SB 266 (2025). It keeps the 2050 carbon-neutrality goal. The veto was overridden." },
      { id: "hb307", issue: "crime", measure: "HB 307 (2025)", last: true, ask: "Should North Carolina tighten pretrial release conditions for people charged with violent offenses (Iryna's Law)?", note: "HB 307 (2025). Senate 28-8, House 81-31; signed Oct 3, 2025." },
    ],
  },
  texas: {
    code: "TX",
    name: "Texas",
    places: [
      { type: "house", label: "Texas House district", pattern: "^Texas House, District (\\d+)", from: "house" },
      { type: "senate", label: "Texas Senate district", pattern: "^Texas Senate, District (\\d+)", from: "senate" },
      { type: "us", label: "U.S. House district", pattern: "^U\\.S\\. House, District (\\d+)", from: "us" },
      {
        type: "sboe",
        label: "State Board of Education district",
        pattern: "^State Board of Education, District (\\d+)",
        from: null,
        note: "The address lookup does not return State Board of Education districts, so every one is listed. Pick yours to narrow it.",
      },
    ],
    questions: [
      { id: "sb2", issue: "school-choice", measure: "SB 2 (89R)", last: true, ask: "Should Texas create education savings accounts that families can spend on private school and other approved education costs?", note: "SB 2 (89R, 2025). House 86-61 (Record 300, Apr 17, 2025); the Senate concurred 19-12 (Apr 24, 2025). Signed May 3, 2025." },
      { id: "hb4", issue: "redistricting", measure: "HB 4 (892)", last: true, ask: "Should the Legislature have redrawn Texas's 38 U.S. House districts in 2025, in the middle of the decade?", note: "HB 4 (2025, second special session). House 88-52 (Record 30, Aug 20, 2025); Senate 18-11 (Aug 23, 2025)." },
      { id: "sb8", issue: "bathroom", measure: "SB 8 (892)", last: true, ask: "Should the use of certain spaces and facilities, such as restrooms, be set by sex, with a civil penalty and a private right to sue?", note: "SB 8 (2025, second special session). House 86-45 (Record 134, Aug 28, 2025); the Senate concurred 18-8 (Sep 3, 2025). Signed Sep 22, 2025." },
      { id: "sb10", issue: "ten-commandments", measure: "SB 10 (89R)", last: true, ask: "Should the Ten Commandments have to be displayed in public school classrooms?", note: "SB 10 (89R, 2025). House 82-46 (Record 3503, May 25, 2025); the Senate concurred 21-10 (May 28, 2025). Signed June 20, 2025." },
      { id: "sb3", issue: "thc", measure: "SB 3 (89R)", last: true, ask: "Should consumable hemp products be limited to CBD and CBG, ending sales of hemp products with THC?", note: "SB 3 (89R, 2025). House 87-54 (Record 3304, May 22, 2025); the Senate concurred 25-6 (May 25, 2025). Vetoed June 22, 2025." },
    ],
  },
  florida: {
    code: "FL",
    name: "Florida",
    places: [
      { type: "house", label: "Florida House district", pattern: "^State House, District (\\d+)", from: "house" },
      { type: "senate", label: "Florida Senate district", pattern: "^State Senate, District (\\d+)", from: "senate" },
      { type: "us", label: "U.S. House district", pattern: "^U\\.S\\. House, District (\\d+)", from: "us" },
    ],
    questions: [
      { id: "hjr1f", issue: "property-taxes", measure: "HJR 1-F (2026F)", last: true, ask: "Should Florida's constitution raise the homestead exemption on non-school property taxes and limit how counties and cities use property taxes (Amendment 3)?", note: "HJR 1-F (2026), now Amendment 3 on the ballot. House 75-26, Senate 30-9." },
      { id: "hb1d", issue: "redistricting", measure: "HB 1-D (2026D)", last: true, ask: "Should Florida adopt the new congressional map drawn in 2026, in the middle of the decade?", note: "HB 1-D (2026 special session). House 83-28, Senate 21-17. Two House members recorded Yea later filed a change to Nay; the recorded vote is shown." },
      { id: "hb1205", issue: "ballot-initiatives", measure: "HB 1205 (2025)", last: true, ask: "Should Florida add new rules and criminal penalties for gathering signatures to put citizen amendments on the ballot?", note: "HB 1205 (2025). House 81-30, Senate 28-9 (May 1-2, 2025)." },
      { id: "sb2c", issue: "immigration", measure: "SB 2-C (2025C)", last: true, ask: "Should Florida create new state immigration crimes and new state immigration enforcement boards and programs, as passed in February 2025?", note: "SB 2-C (2025 special session), Chapter 2025-1. House 85-30, Senate 27-10 (Feb 13, 2025)." },
    ],
  },
  pennsylvania: {
    code: "PA",
    name: "Pennsylvania",
    places: [
      { type: "house", label: "State House district", pattern: "^State House, District (\\d+)", from: "house" },
      { type: "senate", label: "State Senate district", pattern: "^State Senate, District (\\d+)", from: "senate" },
      { type: "us", label: "U.S. House district", pattern: "^U\\.S\\. House, District (\\d+)", from: "us" },
    ],
    questions: [
      { id: "hb2189", issue: "minimum-wage", measure: "HB 2189 (2026)", last: true, ask: "Should Pennsylvania raise its minimum wage to $15 an hour by 2029, then adjust it each year for inflation?", note: "HB 2189 (2026). House 104-95, 1 on leave (Mar 24, 2026). In a Senate committee; no Senate floor vote." },
      { id: "hb1200", issue: "cannabis", measure: "HB 1200 (2025)", last: true, ask: "Should Pennsylvania legalize adult-use marijuana, sold through state-run stores?", note: "HB 1200 (2025). House 102-101 (May 7, 2025). No Senate floor vote." },
      { id: "hb1834", issue: "data-centers", measure: "HB 1834 (2026)", last: true, ask: "Should data centers be barred from shifting their power costs onto other electric customers, and have to meet clean firm energy requirements?", note: "HB 1834 (2026). House 104-95, 1 on leave (Mar 24, 2026). No Senate floor vote." },
      { id: "hb2650", issue: "data-centers", measure: "HB 2650 (2026)", last: true, ask: "Should new data centers get the state sales tax break only if they meet new state certification standards, including clean firm energy?", note: "HB 2650 (2026). House 134-68 (Jun 24, 2026). Referred to a Senate committee." },
      { id: "sb160", issue: "budget", measure: "SB 160 (2025)", last: true, ask: "Should the Legislature have passed the final 2025-26 state budget adopted on Nov 12, 2025?", note: "SB 160 (2025), Act 1A of 2025. Final votes Nov 12, 2025: House 156-47, Senate 40-9." },
    ],
  },
  nevada: {
    code: "NV",
    name: "Nevada",
    places: [
      { type: "house", label: "Assembly district", pattern: "^State Assembly, District (\\d+)", from: "house" },
      { type: "senate", label: "State Senate district", pattern: "^State Senate, District (\\d+)", from: "senate" },
      { type: "us", label: "U.S. House district", pattern: "^U\\.S\\. House, District (\\d+)", from: "us" },
    ],
    questions: [
      { id: "ab280", issue: "housing", measure: "AB 280 (2025)", last: true, ask: "Should Nevada temporarily limit how much landlords can raise the rent for certain existing tenants?", note: "AB 280 (2025). Assembly 27-15, Senate 13-8. Vetoed by the Governor." },
      { id: "sb391", issue: "housing", measure: "SB 391 (2025)", last: true, ask: "Should Nevada limit how many homes large corporate investors can buy each year?", note: "SB 391 (2025). Senate 13-8, short of the two-thirds it needed, so it failed." },
      { id: "ab44", issue: "prices", measure: "AB 44 (2025)", last: true, ask: "Should manipulating the price of essential goods or services be an unlawful trade practice in Nevada?", note: "AB 44 (2025). Assembly 24-18, Senate 13-8. Vetoed by the Governor." },
      { id: "ab306", issue: "elections", measure: "AB 306 (2025)", last: true, ask: "Should counties be required to offer more mail ballot drop-box locations before Election Day?", note: "AB 306 (2025). Assembly 28-14, Senate 12-8. Vetoed by the Governor." },
      { id: "ab597", issue: "elections", measure: "AB 597 (2025)", last: true, ask: "Should nonpartisan voters be allowed to vote in a major party's primary?", note: "AB 597 (2025). Assembly 27-15, Senate 12-9. Vetoed by the Governor June 12, 2025." },
    ],
  },
  minnesota: {
    code: "MN",
    name: "Minnesota",
    places: [
      { type: "house", label: "State House district", pattern: "^State House, District (\\d+[AB])", from: "house" },
      { type: "senate", label: "State Senate district", pattern: "^State Senate, District (\\d+)", from: "senate" },
      { type: "us", label: "U.S. House district", pattern: "^U\\.S\\. House, District (\\d+)", from: "us" },
    ],
    questions: [
      { id: "hf1", issue: "health", measure: "HF 1 (2025 1st Special Session)", last: true, ask: "Should adults who are undocumented immigrants lose MinnesotaCare eligibility, starting Jan 1, 2026?", note: "HF 1 (2025 First Special Session, Chapter 2). House 68-65, Senate 37-30 (Jun 9, 2025). Per the House Research act summary, it ends MinnesotaCare eligibility for undocumented adults 18 and older beginning Jan 1, 2026." },
      { id: "hf9", issue: "taxes", measure: "HF 9 (2025 1st Special Session)", last: true, ask: "Should Minnesota have passed the 2025 special-session omnibus tax bill?", note: "HF 9 (2025 First Special Session). House 93-39, Senate 34-33 (Jun 9, 2025)." },
      { id: "hf3378", issue: "fraud", measure: "HF 3378 (2026)", last: true, ask: "Should legislators get the full, unredacted Optum reports on fraud risk from the Department of Human Services?", note: "HF 3378 (2026). House 107-27 (Mar 12, 2026); no Senate final vote." },
      { id: "sf856", issue: "fraud", measure: "SF 856 (2025-2026)", last: true, ask: "Should Minnesota create an independent state Office of the Inspector General to investigate fraud in state programs?", note: "SF 856, 2026 Chapter 92. Senate 60-7 (2025); House 127-5 (May 7, 2026); Senate repassed it 66-0 (May 11, 2026)." },
    ],
  },
  ohio: {
    code: "OH",
    name: "Ohio",
    places: [
      { type: "house", label: "Ohio House district", pattern: "^State House, District (\\d+)", from: "house" },
      { type: "senate", label: "Ohio Senate district", pattern: "^State Senate, District (\\d+)", from: "senate" },
      { type: "us", label: "U.S. House district", pattern: "^U\\.S\\. House, District (\\d+)", from: "us" },
    ],
    gaps: [
      {
        type: "house",
        value: "88",
        label: "Ohio House District 88",
        note: "This district's candidates are certified by the Sandusky County Board of Elections, and its website was unavailable when we checked (Oct 24, 2026).",
      },
    ],
    questions: [
      { id: "hb335", issue: "property-taxes", measure: "HB 335 (136th GA)", last: true, ask: "Should Ohio limit how much revenue from \"inside millage\" property taxes can grow after a reappraisal, to the rate of inflation?", note: "HB 335 (136th General Assembly). House 71-24; Senate 23-10; House concurrence 67-22 (Nov 19, 2025). Per the LSC Final Analysis, the limit is GDP deflator growth over the three preceding years." },
      { id: "sb1", issue: "higher-ed", measure: "SB 1 (136th GA)", last: true, ask: "Should Ohio's public universities be required to end DEI offices and trainings, and should full-time faculty be barred from striking?", note: "SB 1 (136th General Assembly). Senate 21-11; House 59-34; Senate concurrence 20-11 (Mar 26, 2025)." },
      { id: "sb293", issue: "elections", measure: "SB 293 (136th GA)", last: true, ask: "Should mailed absentee ballots have to arrive by the close of the polls on Election Day to count (military and overseas ballots excepted)?", note: "SB 293 (136th General Assembly). Senate 23-10; House 61-30; Senate concurrence 23-10 (Nov 19, 2025)." },
      { id: "sjr10", issue: "elections", measure: "SJR 10 (136th GA)", last: true, ask: "Should Ohio's constitution require voters to show photo ID to vote in person?", note: "SJR 10 (136th General Assembly), now Issue 3 on the ballot. Senate 22-9 (June 3, 2026); House 62-30 (June 10, 2026)." },
      { id: "sb56", issue: "marijuana", measure: "SB 56 (136th GA)", last: true, ask: "Should Ohio adopt SB 56's changes to its marijuana law, including new rules for intoxicating hemp products?", note: "SB 56 (136th General Assembly), conference report: House 52-34 (Nov 19, 2025); Senate 22-7 (Dec 9, 2025)." },
    ],
  },
  maine: {
    code: "ME",
    name: "Maine",
    places: [
      { type: "house", label: "Maine House district", pattern: "^State House, District (\\d+)", from: "house" },
      { type: "senate", label: "Maine Senate district", pattern: "^State Senate, District (\\d+)", from: "senate" },
      { type: "us", label: "U.S. House district", pattern: "^U\\.S\\. House, District (\\d+)", from: "us" },
    ],
    questions: [
      { id: "ld1126", issue: "guns", measure: "LD 1126 (2025-2026)", ask: "Should Maine require serial numbers on firearms and prohibit undetectable firearms?", note: "LD 1126. House enactment 76-72 (June 17, 2025). Became law without the Governor's signature, Jan 11, 2026. House votes only for now." },
      { id: "ld307", issue: "energy", measure: "LD 307 (2026)", ask: "Should Maine establish a Data Center Coordination Council and place a temporary limitation on certain data centers?", note: "LD 307. House enactment 79-62 (April 14, 2026). Vetoed; the veto was sustained April 29, 2026. House votes only for now." },
      { id: "ld210", issue: "budget", measure: "LD 210 (2025)", ask: "Should Maine have enacted LD 210, the Governor's budget bill for the fiscal years ending June 30, 2025, 2026 and 2027?", note: "LD 210. House enactment 74-73 (June 18, 2025). Signed June 20, 2025 (Public Law, Chapter 388). House votes only for now." },
    ],
  },
  georgia: {
    code: "GA",
    name: "Georgia",
    places: [
      { type: "house", label: "State House district", pattern: "^State House, District (\\d+)", from: "house" },
      { type: "senate", label: "State Senate district", pattern: "^State Senate, District (\\d+)", from: "senate" },
      { type: "us", label: "U.S. House district", pattern: "^U\\.S\\. House, District (\\d+)", from: "us" },
      {
        type: "psc",
        label: "Public Service Commission district",
        pattern: "^Public Service Commission, District (\\d+)",
        from: null,
        note: "Public Service Commission seats are elected statewide but tied to a district, so every one is listed for every address.",
      },
    ],
    questions: [
      { id: "hb111", issue: "cost", measure: "HB 111 (2025)", last: true, ask: "Should Georgia cut its state income tax rate?", note: "HB 111 (2025), Act 7. House 110-60 (Mar 6, 2025); Senate 30-23 (Mar 20, 2025). Signed Apr 15, 2025." },
      { id: "sb68", issue: "lawsuits", measure: "SB 68 (2025)", last: true, ask: "Should Georgia change the rules for injury lawsuits, including limits on pain-and-suffering arguments, as passed in 2025?", note: "SB 68 (2025), Act 9. House 91-82 (Mar 20, 2025); the Senate agreed 34-21 (Mar 21, 2025). Signed Apr 21, 2025." },
      { id: "sb3ex", issue: "elections", measure: "SB 3EX (2026 special session)", last: true, ask: "Should a state committee pick a new voting system based on hand-marked paper ballots for 2028, and should Georgia require a statewide hand recount when a covered race is within 0.5%?", note: "SB 3EX (June 2026 special session), Act 1EX. House 94-79; the Senate agreed 36-16 (Jun 23, 2026). Signed Jun 25, 2026." },
      { id: "sb410", issue: "data-centers", measure: "SB 410 (2026)", last: true, ask: "Should Georgia end the sales tax break for new data center equipment?", note: "SB 410 (2026). Passed the Senate 32-21 on Mar 6, 2026." },
      { id: "sb175", issue: "elections", measure: "SB 175 (2025-26)", last: true, ask: "Should Georgia ban ranked-choice voting?", note: "SB 175. Senate 36-19; the House vote was 89-73, short of the 91 needed, so it failed." },
    ],
  },
  michigan: {
    code: "MI",
    name: "Michigan",
    places: [
      { type: "house", label: "State House district", pattern: "^State House, District (\\d+)", from: "house" },
      { type: "senate", label: "State Senate district", pattern: "^State Senate, District (\\d+)", from: "senate" },
      { type: "us", label: "U.S. House district", pattern: "^U\\.S\\. House, District (\\d+)", from: "us" },
    ],
    questions: [
      { id: "sb8", issue: "wages", measure: "SB 8 (2025)", last: true, ask: "Should Michigan keep a lower minimum wage for tipped workers, rising to 50% of the regular minimum wage by 2031, instead of phasing it out?", note: "SB 8 (2025), Public Act 1 of 2025. Senate 20-12 (Feb 13, 2025); House 69-40 (Feb 19, 2025). Signed Feb 21, 2025." },
      { id: "hb4951", issue: "roads", measure: "HB 4951 (2025)", last: true, ask: "Should Michigan add a 24% wholesale tax on marijuana to pay for local roads?", note: "HB 4951 (2025), Public Act 23 of 2025. House 78-21 (Sep 25, 2025); Senate 19-17 (Oct 3, 2025). Signed Oct 7, 2025." },
      { id: "hjrb", issue: "elections", measure: "HJR B (2025)", last: true, ask: "Should voters be asked to amend the state constitution to require proof of U.S. citizenship to register to vote?", note: "HJR B (2025). House 58-48 on May 1, 2025; it needed 74 votes (two-thirds of members serving), so it was not adopted." },
    ],
  },
  wisconsin: {
    code: "WI",
    name: "Wisconsin",
    places: [
      { type: "house", label: "Assembly district", pattern: "^State Assembly, District (\\d+)", from: "house" },
      { type: "senate", label: "State Senate district", pattern: "^State Senate, District (\\d+)", from: "senate" },
      { type: "us", label: "U.S. House district", pattern: "^U\\.S\\. House, District (\\d+)", from: "us" },
    ],
    questions: [
      { id: "sjr116", issue: "partial-veto", measure: "2025 SJR 116", last: true, ask: "Should the governor be barred from using the partial veto to create or raise any tax or fee?", note: "2025 SJR 116, now Question 1 on the ballot. Final votes: Assembly 54-41, Senate 18-15." },
      { id: "ajr102", issue: "government-discrimination", measure: "2025 AJR 102", last: true, ask: "Should the state constitution bar government from discriminating against, or giving preferential treatment to, anyone based on race, sex, color, ethnicity or national origin?", note: "2025 AJR 102, now Question 3 on the ballot. Assembly 54-45, Senate 18-15." },
      { id: "sb36", issue: "tips-overtime", measure: "2025 SB 36", last: true, ask: "Should cash tips be exempt from state income tax?", note: "2025 SB 36. Senate 21-12, Assembly 60-31; vetoed Apr 3, 2026." },
      { id: "ab24", issue: "immigration-ice", measure: "2025 AB 24", last: true, ask: "Should county sheriffs be required to assist with certain federal immigration functions?", note: "2025 AB 24. Passed the Assembly 51-43; the Senate concurred with no roll call; vetoed Apr 3, 2026." },
    ],
  },
};

const readJson = (dir, f) => JSON.parse(readFileSync(join(dir, f), "utf8"));
const fail = (msg) => {
  throw new Error(msg);
};
const sideOf = (v) => (/^(yea|aye|yes)$/i.test(v) ? "yes" : /^(nay|no)$/i.test(v) ? "no" : null);

async function loadBallot(slug, dir) {
  // California's candidate list already lives in the site (src/data/californiaBallot.js).
  const inSite = join(ROOT, "src", "data", `${slug}Ballot.js`);
  if (!existsSync(join(dir, "ballot.json")) && existsSync(inSite)) {
    const m = await import(pathToFileURL(inSite).href);
    return { ballot: m.ballot, source: m.BALLOT_SOURCE, from: `src/data/${slug}Ballot.js` };
  }
  return { ballot: readJson(dir, "ballot.json"), source: readJson(dir, "ballot-source.json"), from: `${slug}/ballot.json and ballot-source.json` };
}

// Which kinds of office are on this ballot, in plain words, for the page header.
function scopeOf(ballot, places) {
  const offices = ballot.map((b) => b.office);
  const hit = (re) => offices.some((o) => re.test(o));
  const legislature = places.filter((p) => p.type === "house" || p.type === "senate").map((p) => new RegExp(p.pattern));
  const districted = places.map((p) => new RegExp(p.pattern));
  const statewide = [...new Set(offices.filter((o) => !/^U\.S\. /.test(o) && !districted.some((re) => re.test(o))))];
  const parts = [];
  if (hit(/^U\.S\. (Senate|House)/)) parts.push("Congress");
  if (statewide.length === 1) parts.push(statewide[0] === "Governor" ? "governor" : statewide[0]);
  else if (statewide.length > 1) parts.push("statewide office");
  if (offices.some((o) => legislature.some((re) => re.test(o)))) parts.push("the Legislature");
  if (hit(/^Board of Equalization/)) parts.push("the Board of Equalization");
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0] || "";
}

async function build(slug) {
  const cfg = STATES[slug] || fail(`Unknown state "${slug}". Add it to STATES in scripts/build-states.mjs.`);
  const dir = join(WORK, slug);
  if (!existsSync(dir)) fail(`No staging folder at ${dir}`);
  const { ballot, source, from } = await loadBallot(slug, dir);
  const issuesIn = readJson(dir, "issues.json");
  const votesIn = readJson(dir, "votes.json");
  const quotes = readJson(dir, "quotes.verified.json");
  const skipped = votesIn.filter((v) => v.kind !== "official");
  const votes = votesIn.filter((v) => v.kind === "official");

  const ids = new Set(ballot.map((b) => b.id));
  if (ids.size !== ballot.length) fail(`${slug}: duplicate ids in the ballot`);
  const issueIds = new Set(issuesIn.map((i) => i.id));
  for (const r of [...votes, ...quotes]) {
    if (!ids.has(r.personId)) fail(`${slug}: ${r.personId} is not on the ballot`);
    if (!issueIds.has(r.issue)) fail(`${slug}: unknown issue ${r.issue}`);
  }
  for (const v of votes) {
    const issue = issuesIn.find((i) => i.id === v.issue);
    if (!issue.measures.some((m) => m.id === v.measure)) fail(`${slug}: vote on ${v.measure} is not a measure of ${v.issue}`);
    for (const f of ["measure", "motion", "date", "vote", "url"]) if (!v[f]) fail(`${slug}: a vote for ${v.personId} has no ${f}`);
  }
  for (const q of quotes) for (const f of ["text", "date", "venue", "source", "url", "kind"]) if (!q[f]) fail(`${slug}: a quote for ${q.personId} has no ${f}`);

  const issues = issuesIn.map((i) => ({
    id: i.id,
    name: i.name,
    blurb: i.blurb,
    measures: i.measures.map((m) => ({
      id: m.id,
      title: m.title,
      tie: m.tie,
      what: m.what,
      url: m.url,
      ...(m.status ? { status: m.status, statusSources: m.statusSources || [], statusAsOf: m.statusAsOf || "" } : {}),
    })),
  }));

  // Anyone with a recorded vote on any issue sat in the body that voted on these measures.
  const voted = new Set(votes.map((v) => v.personId));
  // Issues whose measures include a U.S. House roll call (California's Congress votes).
  const congress = new Set(votes.filter((v) => /^https:\/\/clerk\.house\.gov\//.test(v.url)).map((v) => v.issue));
  const order = (issueId, measure) => issuesIn.find((i) => i.id === issueId).measures.findIndex((m) => m.id === measure);

  const people = ballot.map((b) => {
    const entries = {};
    for (const i of issuesIn) {
      const said = quotes
        .filter((q) => q.personId === b.id && q.issue === i.id)
        .map((q) => ({ text: q.text, date: q.date, venue: q.venue, source: q.source, url: q.url, kind: q.kind, ...(q.note ? { note: q.note } : {}) }));
      const did = votes
        .filter((v) => v.personId === b.id && v.issue === i.id)
        .map((v, n) => ({ v, n }))
        .sort((a, z) => order(i.id, a.v.measure) - order(i.id, z.v.measure) || Date.parse(a.v.date) - Date.parse(z.v.date) || a.n - z.n)
        .map(({ v }) => ({
          measure: v.measure,
          motion: v.motion,
          date: v.date,
          // A vote a substitute cast in this member's seat is not the member's own vote (Idaho prints
          // it as "Member(Substitute)"). It is shown, labeled, and never counted as theirs.
          vote: v.ownVote === false && !v.asSubstituteFor ? "Cast in this seat by a substitute" : v.vote,
          tally: v.tally || "",
          url: v.url,
          kind: v.kind,
          // Notes written while a vote still came from a third-party tracker are left out: the
          // vote shown is the official record at `url`.
          ...(v.ownVote === false && !v.asSubstituteFor
            ? { note: `Not this member's own vote. The roll call prints "${v.printedAs || "this seat"}": a qualified substitute held the seat that day and voted ${v.vote}.` }
            : v.asSubstituteFor
              ? { note: `Cast as substitute for ${v.asSubstituteFor}.` }
              : v.note && !/tracker/i.test(v.note) ? { note: v.note } : {}),
        }));
      const entry = { said, did };
      if (!did.length) {
        entry.gap = voted.has(b.id)
          ? "No recorded vote on this issue."
          : congress.has(i.id)
            ? "Not in the Legislature or Congress for these votes."
            : "Not in the Legislature for these votes.";
      } else if (!said.length) entry.gap = "No quote on file yet.";
      entries[i.id] = entry;
    }
    return { id: b.id, name: b.name, office: b.office, party: b.party, status: b.unopposed ? "Unopposed: elected without appearing on the ballot" : `On the ${ELECTION} ballot`, entries };
  });

  // Questions are kept only when the votes behind them exist on both sides.
  const questions = (cfg.questions || []).filter((q) => {
    const issue = issuesIn.find((i) => i.id === q.issue);
    if (!issue || !issue.measures.some((m) => m.id === q.measure)) fail(`${slug}: question ${q.id} names an unknown measure`);
    const sides = new Set(votes.filter((v) => v.issue === q.issue && v.measure === q.measure).map((v) => sideOf(v.vote)).filter(Boolean));
    return sides.size === 2;
  });

  const ballotSource = { label: source.label, url: source.url, ...(source.asOf ? { asOf: source.asOf } : {}) };
  const counts = {
    people: people.length,
    withFile: people.filter((p) => Object.values(p.entries).some((e) => e.said.length || e.did.length)).length,
    issues: issues.length,
    measures: issues.reduce((n, i) => n + i.measures.length, 0),
    quotes: people.reduce((n, p) => n + Object.values(p.entries).reduce((m, e) => m + e.said.length, 0), 0),
    votes: people.reduce((n, p) => n + Object.values(p.entries).reduce((m, e) => m + e.did.length, 0), 0),
    questions: questions.length,
  };
  const module = {
    slug,
    name: cfg.name,
    code: cfg.code,
    electionDate: ELECTION,
    scope: scopeOf(ballot, cfg.places),
    ballotSource,
    places: cfg.places,
    questions,
    issues,
    // Races on the ballot whose official candidate list is not yet on file. The site says so before
    // showing anything for that race, and leaves it out of "Who votes like you".
    gaps: cfg.gaps || [],
  };
  const head = `// ${cfg.name}, ${ELECTION} general election. GENERATED by scripts/build-states.mjs: do not edit by hand.
// Sources: ${from}, ${slug}/issues.json, ${slug}/votes.json (kind "official" only), ${slug}/quotes.verified.json.
// ${counts.people} people on the ballot, ${counts.withFile} with something on file; ${counts.issues} issues, ${counts.measures} measures; ${counts.quotes} quotes, ${counts.votes} votes.
`;
  const body = Object.entries(module)
    .map(([k, v]) => `export const ${k} = ${JSON.stringify(v, null, 1)};`)
    .join("\n");
  // Every person points at the one candidate list they were read from.
  const peopleJs = `const PEOPLE = ${JSON.stringify(people)};\nexport const people = PEOPLE.map((p) => ({ ...p, ballot: ballotSource }));\n`;
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, `${slug}.js`), `${head}${body}\n${peopleJs}`);
  console.log(`${slug}: ${JSON.stringify(counts)}${skipped.length ? `; left out ${skipped.length} votes that are not kind "official"` : ""}`);
}

async function writeIndex() {
  const built = Object.keys(STATES).filter((slug) => existsSync(join(OUT, `${slug}.js`)));
  const extra = readdirSync(OUT).filter((f) => f.endsWith(".js") && f !== "index.js" && f !== "proof.js" && !built.includes(f.slice(0, -3)));
  if (extra.length) console.warn(`Not listed (no entry in STATES): ${extra.join(", ")}`);
  const rows = [];
  for (const slug of built) {
    const m = await import(pathToFileURL(join(OUT, `${slug}.js`)).href + `?t=${Date.now()}`);
    const n = { people: m.people.length, quotes: 0, votes: 0 };
    for (const p of m.people) for (const e of Object.values(p.entries)) { n.quotes += e.said.length; n.votes += e.did.length; }
    rows.push(`  { slug: "${slug}", code: "${m.code}", name: "${m.name}", match: ${m.questions.length > 0}, questions: ${m.questions.length}, onFile: ${JSON.stringify(n)}, load: () => import("./${slug}.js") },`);
  }
  await writeProof(built);
  writeFileSync(
    join(OUT, "index.js"),
    `// Open states besides Utah (Utah's data is bundled with the site). GENERATED by scripts/build-states.mjs.
// Each state's data loads only when someone opens it. To hold a state back, remove its module and rerun.
export const OPEN_STATES = [
${rows.join("\n")}
];
`
  );
  console.log(`index: ${built.join(", ")}`);
}

// The home page's proof card: one real quote next to that same person's recorded vote, copied
// out of the built state data (so the card can never drift from the record it shows). Chosen by
// hand: a quote about a measure, and the person's later official vote on that same measure.
const PROOF = {
  state: "california",
  person: "ca-catherine-s-blakespear-california-senate-district-38",
  issue: "housing",
  said: "I come from local government, and it’s hard for me to support that",
  measure: "SB 677 (2026)",
  motion: /Concurrence/,
  context: "The Assembly changed the bill after she said this. The vote shown is the Senate agreeing to the Assembly's changes, the bill's final vote.",
};
async function writeProof(built) {
  const file = join(OUT, "proof.js");
  if (!built.includes(PROOF.state)) return writeFileSync(file, "export const proof = null;\n");
  const m = await import(pathToFileURL(join(OUT, `${PROOF.state}.js`)).href + `?p=${Date.now()}`);
  const p = m.people.find((x) => x.id === PROOF.person);
  const e = p && p.entries[PROOF.issue];
  const said = e && e.said.find((q) => q.text === PROOF.said);
  const did = e && e.did.find((d) => d.measure === PROOF.measure && PROOF.motion.test(d.motion) && d.kind === "official");
  const issue = m.issues.find((i) => i.id === PROOF.issue);
  const measure = issue && issue.measures.find((x) => x.id === PROOF.measure);
  if (!said || !did || !measure) fail(`proof: the quote or the official vote is no longer in ${PROOF.state}'s data`);
  const out = {
    state: PROOF.state,
    stateName: m.name,
    person: { id: p.id, name: p.name, party: p.party, office: p.office },
    issue: { id: issue.id, name: issue.name },
    measure: { id: measure.id, title: measure.title, tie: measure.tie, url: measure.url },
    said,
    did,
    context: PROOF.context,
  };
  writeFileSync(file, `// GENERATED by scripts/build-states.mjs from ${PROOF.state}'s built data: do not edit by hand.\nexport const proof = ${JSON.stringify(out, null, 1)};\n`);
  console.log(`proof: ${p.name}, ${PROOF.measure}`);
}

const asked = process.argv.slice(2);
for (const slug of asked.length ? asked : Object.keys(STATES)) await build(slug);
await writeIndex();
