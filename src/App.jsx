import { useEffect, useMemo, useRef, useState } from "react";
import { issues, people } from "./data/utah.js";
import { ballot, BALLOT_SOURCE } from "./data/utahBallot.js";
import { local, LOCAL_COVERAGE } from "./data/utahLocal.js";
import FindBallot, { readFound, foundKey } from "./FindBallot.jsx";
import IssueReel from "./IssueReel.jsx";
import { connectTallies } from "./tallies.js";
import { Top20, Odds, Blog, wantPost } from "./Pages.jsx";
import Composer, { TakeAction } from "./Action.jsx";
import { track, setPageContext } from "./analytics.js";
import { cameFromZip } from "./zip.js";
import Shop from "./Shop.jsx";
import Feed, { FeedNudge } from "./Feed.jsx";
import Match from "./Match.jsx";
import EvidenceFile from "./EvidenceFile.jsx";
import Tracker, { trackerShown } from "./Tracker.jsx";
import Eagle, { Bird, Mark } from "./Eagle.jsx";
import { HouseRules, Terms, Privacy } from "./Legal.jsx";
import { writeRoute, fileUrl, SHOP_ON, ODDS_ON, BOARD_ON } from "./route.js";
import { OPEN_STATES } from "./data/states/index.js";
import { QUESTIONS } from "./data/match.js";
import Board from "./Board.jsx";
import RollCall from "./RollCall.jsx";
import ShirtMock from "./ShirtMock.jsx";
import ShareCall from "./ShareCall.jsx";
import Follow from "./Follow.jsx";
import Divided from "./Divided.jsx";
import Corrections from "./Corrections.jsx";
// Donkey Tracker is demo-only: hidden unless VITE_TRACKER=on or this browser opened ?tracker=1.
const TRACKER_SHOWN = trackerShown();

const KIND_LABEL = {
  official: "Official record",
  press: "News report",
  tracker: "Vote tracker",
  records: "Records request",
  campaign: "Campaign's own words",
  guide: "Voter guide",
  filing: "Public filing",
};

const REQUEST_STATUS = {
  drafted: "Drafted, not filed",
  filed: "Filed, awaiting response",
  received: "Records received",
  denied: "Denied",
  appealed: "On appeal",
};

const VIEWS = [
  { id: "records", label: "Said vs. did" },
  { id: "match", label: "Who votes like you" },
  { id: "votes", label: "Roll call" },
  { id: "top20", label: "Utah Top 20" },
  ...(ODDS_ON ? [{ id: "odds", label: "The Odds" }] : []),
  { id: "action", label: "Take action" },
  ...(BOARD_ON ? [{ id: "board", label: "Agree to Disagree" }] : []),
  ...(SHOP_ON ? [{ id: "shop", label: "Shop" }] : []),
  { id: "blog", label: "Blog" },
];
// Which race a person is in, read from the office title.
function utahRaceOf(p) {
  let m;
  if (p.county) return { type: "county", value: p.county };
  if ((m = p.office.match(/^Utah House, District (\d+)/))) return { type: "house", value: m[1] };
  if ((m = p.office.match(/^Utah Senate, District (\d+)/))) return { type: "senate", value: m[1] };
  if ((m = p.office.match(/^U\.S\. House, District (\d+)/))) return { type: "us", value: m[1] };
  if ((m = p.office.match(/^State School Board, District (\d+)/))) return { type: "board", value: m[1] };
  if (/^Salt Lake City /.test(p.office)) return { type: "county", value: "Salt Lake" };
  if ((m = p.office.match(/^(.+?) County /))) return { type: "county", value: m[1] };
  return { type: "other", value: "" };
}
const UTAH_PLACES = [
  { type: "county", label: "County", any: "Any county" },
  { type: "house", label: "Utah House district", any: "Any" },
  { type: "senate", label: "Utah Senate district", any: "Any" },
  { type: "us", label: "U.S. House district", any: "Any" },
  { type: "board", label: "State School Board district", any: "Any" },
];
// The best-known city in each county, so the name means something to people who do not know it.
const COUNTY_SEAT = { Grand: "Moab", "Salt Lake": "Salt Lake City" };
const UTAH_NO_PLACE = { county: "", house: "", senate: "", us: "", board: "" };
function readPlace(key, none) {
  try {
    return { ...none, ...JSON.parse(localStorage.getItem(key) || "{}") };
  } catch {
    return none;
  }
}

// Everyone on the state ballot who has no file of their own yet. Matched to files by race and
// family name, so a person is never listed twice.
const familyName = (n) => n.toLowerCase().replace(/[^a-z ]/g, "").trim().split(" ").pop();
const countyOf = (p) => (p.office.match(/^(.+?) County /) || (/^Salt Lake City /.test(p.office) ? [0, "Salt Lake"] : []))[1];
const utahBallotOnly = [
  ...ballot
    .filter((b) => !people.some((p) => p.office === b.office && familyName(p.name) === familyName(b.name)))
    .map((b) => ({ ...b, status: "On the November 3, 2026 ballot", ballot: BALLOT_SOURCE, ballotOnly: true, entries: {} })),
  // County and local races. Matched to files by county, family name and first initial.
  ...local
    .filter((l) => !people.some((p) => countyOf(p) === l.county && familyName(p.name) === familyName(l.name) && p.name[0] === l.name[0]))
    .map(({ source, ...l }) => ({ ...l, status: "On the November 3, 2026 ballot", ballot: source, ballotOnly: true, entries: {} })),
];
const EMPTY = { said: [], did: [] };

function voteClass(vote, broad) {
  const v = vote.toLowerCase();
  if (v === "yea") return "yea";
  if (v === "nay") return "nay";
  if (v === "absent") return "absent";
  // Other states' records print Yes/No and Aye (Utah's page keeps its own labels as they were).
  if (broad && (v === "yes" || v === "aye")) return "yea";
  if (broad && v === "no") return "nay";
  return "other";
}

const hasFile = (e) => !!e && (e.said.length > 0 || e.did.length > 0 || (e.record || []).length > 0);

// Utah: everything the page needs, from the bundled data files.
const UTAH = {
  utah: true,
  slug: "utah",
  name: "Utah",
  issues,
  people,
  ballotOnly: utahBallotOnly,
  everyone: [...people, ...utahBallotOnly],
  places: UTAH_PLACES,
  raceOf: utahRaceOf,
  noPlace: UTAH_NO_PLACE,
  placeKey: "lofs-place",
  questions: QUESTIONS,
  // A person is listed on an issue once they have an entry for it, even an empty one.
  filed: (p, id) => !!p.entries[id],
  views: VIEWS,
};

// Any other open state, from its generated module (scripts/build-states.mjs). Everyone on the
// ballot is in `people`; a person is on an issue's list once a quote or a vote is on file there.
// "012" -> "12", "12a" -> "12A": Minnesota's House districts are 12A and 12B, so the letter counts.
export const districtKey = (v) => {
  const m = String(v || "").trim().match(/^0*(\d+)\s*([A-Za-z])?$/);
  return m ? `${parseInt(m[1], 10)}${(m[2] || "").toUpperCase()}` : String(v || "").trim();
};

function stateData(m) {
  const places = m.places.map((d) => ({ ...d, re: new RegExp(d.pattern), any: "Any" }));
  const noPlace = Object.fromEntries([...places.map((d) => [d.type, ""]), ["open", []]]);
  return {
    utah: false,
    slug: m.slug,
    name: m.name,
    scope: m.scope,
    electionDate: m.electionDate,
    ballotSource: m.ballotSource,
    issues: m.issues,
    people: m.people,
    ballotOnly: [],
    everyone: m.people,
    places,
    noPlace,
    placeKey: `lofs-place-${m.slug}`,
    raceOf: (p) => {
      for (const d of places) {
        const hit = p.office.match(d.re);
        if (hit) return { type: d.type, value: districtKey(hit[1]) };
      }
      return { type: "statewide", value: "" };
    },
    // The address lookup's districts, turned into this state's races. A race the lookup cannot be
    // trusted for (from: null) stays fully listed, with its note.
    placeFrom: (raw) => ({
      ...noPlace,
      ...Object.fromEntries(places.filter((d) => d.from).map((d) => [d.type, raw[d.from] ? districtKey(raw[d.from]) : ""])),
      open: places.filter((d) => !d.from).map((d) => d.type),
    }),
    questions: m.questions,
    gaps: (m.gaps || []).map((g) => ({ ...g, value: districtKey(g.value) })),
    filed: (p, id) => hasFile(p.entries[id]),
    views: [
      { id: "records", label: "Said vs. did" },
      ...(m.questions.length ? [{ id: "match", label: "Who votes like you" }] : []),
      { id: "votes", label: "Roll call" },
    ],
  };
}

// Other states' data, once loaded, so moving between pages never shows the loading line again.
const loadedStates = {};

export default function App({ route, go }) {
  const meta = OPEN_STATES.find((s) => s.slug === route.state);
  if (!meta) return <StatePage route={route} go={go} data={UTAH} />;
  return <LoadState key={meta.slug} meta={meta} route={route} go={go} />;
}

function LoadState({ meta, route, go }) {
  const [data, setData] = useState(() => loadedStates[meta.slug] || null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (data) return undefined;
    let alive = true;
    meta
      .load()
      .then((m) => {
        loadedStates[meta.slug] = loadedStates[meta.slug] || stateData(m);
        if (alive) setData(loadedStates[meta.slug]);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [meta.slug]);
  useEffect(() => {
    if (!data) document.title = `${meta.name} | Legit or Full of Shit`;
  }, [data]);
  if (data) return <StatePage route={route} go={go} data={data} />;
  return (
    <div className="page">
      <p className="eyebrow">
        <button className="linkish" onClick={() => go({ page: "home" })}>All states</button>
        {" / "}{meta.name}, general election November 3, 2026
      </p>
      <p className="empty" role="status">
        {failed ? (
          <>
            {meta.name}'s records did not load.{" "}
            <button className="linkish" onClick={() => location.reload()}>Try again</button>
          </>
        ) : (
          `Loading ${meta.name}'s records…`
        )}
      </p>
    </div>
  );
}

// Shown before anything else for a race whose official candidate list is not yet on file.
export function GapNotice({ gap }) {
  return (
    <p className="gap-notice" role="status" id={`gap-${gap.type}-${gap.value}`}>
      <strong>{gap.label}: we don't have the official candidate list yet.</strong> {gap.note} Nobody in this race is shown or
      compared until the official list is in. Every other race on your ballot is below.
    </p>
  );
}

function Source({ item }) {
  return (
    <p className="source">
      <span className={`kind kind-${item.kind}`}>{KIND_LABEL[item.kind]}</span>
      <a href={fileUrl(item.url)} target="_blank" rel="noreferrer" onClick={() => track(item.vote ? "vote_source_clicked" : "quote_source_clicked", { kind: item.kind, where: "record" })}>
        {item.source || "Open the record"}
      </a>
    </p>
  );
}

// After an address lookup: the topic and person to open first. Stays on the current topic when
// someone in the visitor's races has both a quote and a vote there; otherwise moves to the topic
// where their races have the most on file. Among equals the person is picked at random.
function bestStart(data, inRaces, current) {
  const { issues, people } = data;
  const any = (arr) => (arr.length ? arr[Math.floor(Math.random() * arr.length)].id : null);
  let best = null;
  for (const i of issues) {
    const ps = people.filter((p) => data.filed(p, i.id) && inRaces(p));
    const both = ps.filter((p) => p.entries[i.id].said.length && p.entries[i.id].did.length);
    const said = ps.filter((p) => p.entries[i.id].said.length);
    const pick = { issue: i.id, person: any(both) || any(said) || any(ps), score: both.length * 100 + said.length * 10 + ps.length };
    if (i.id === current && both.length) return pick;
    if (!best || pick.score > best.score) best = pick;
  }
  return best && best.person ? best : null;
}

// The Did column when there is no vote: say so plainly, then show what is on the record instead,
// each item in their own words or a checkable fact, labeled by type and sourced. No reading of
// which way they lean: the visitor decides that.
// The plain-words link between a vote and the issue on screen, so nobody has to dig through a
// long motion to see why it is here.
function tieOf(issue, r) {
  const m = issue && issue.measures.find((x) => x.id === r.measure);
  return m ? m.tie : "";
}
function Marked({ text, hit }) {
  const at = hit ? text.indexOf(hit) : -1;
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <mark>{hit}</mark>
      {text.slice(at + hit.length)}
    </>
  );
}

const NEVER_VOTED = new Set(["Challenger", "Candidate"]);
function NoVote({ person, entry }) {
  const items = entry.record || [];
  return (
    <>
      <p className="empty novote">
        <strong>No vote on record.</strong>{" "}
        {entry.gap || (NEVER_VOTED.has(person.status) ? `${person.name} hasn't held an office that voted on this.` : "No vote on this matched yet.")}
      </p>
      {items.length > 0 ? (
        <>
          <p className="instead">On the record instead</p>
          {items.map((r, i) => (
            <div className="record onrecord" key={i}>
              <span className="rec-type">{r.type}</span>
              {r.quote ? <blockquote>“{r.text}”</blockquote> : <p className="motion">{r.text}</p>}
              <p className="when">{r.date}</p>
              <Source item={r} />
            </div>
          ))}
        </>
      ) : (
        <p className="empty">Nothing else on file yet. Ask the Eagle below to dig.</p>
      )}
    </>
  );
}

function StatePage({ route, go, data }) {
  const { issues, people, ballotOnly, everyone, raceOf } = data;
  const PLACES = data.places;
  const NO_PLACE = data.noPlace;
  const GAPS = data.gaps || [];
  const VIEWS = data.views;
  const [view, setView] = useState(route.view || "records");
  useEffect(() => {
    setPageContext({ state: route.state, state_open: true });
    track("result_viewed", { state: route.state, state_open: true, via: cameFromZip() ? "zip" : "link" });
  }, [route.state]);
  // A link to one person lands on an issue where that person actually has something on file: a
  // link to someone on an issue they have no file for opens their nearest file instead.
  const [issueId, setIssueId] = useState(() => {
    const asked = issues.some((i) => i.id === route.issue) ? route.issue : issues[0].id;
    const who = route.person && people.find((p) => p.id === route.person);
    const has = (id) => {
      const e = who && who.entries[id];
      return !!(e && (e.said.length || e.did.length || (e.record || []).length));
    };
    if (!who || has(asked)) return asked;
    const other = issues.find((i) => has(i.id));
    return other ? other.id : asked;
  });
  // Districts found from the visitor's address on the home page (the address itself is not kept).
  const [found, setFound] = useState(() => readFound(data.slug));
  const [place, setPlace] = useState(() => {
    // Another state's lookup arrives as raw districts; read them against this state's races once.
    if (!data.utah && found && found.pending) {
      const next = data.placeFrom(found);
      try {
        localStorage.setItem(data.placeKey, JSON.stringify(next));
        sessionStorage.setItem(foundKey(data.slug), JSON.stringify({ ...found, pending: false }));
      } catch {
        /* the districts still apply for this page view */
      }
      return next;
    }
    return readPlace(data.placeKey, NO_PLACE);
  });
  const [personId, setPersonId] = useState(route.person || null);
  const [tally, setTally] = useState({ mode: "local", counts: null, mine: {}, canCall: true });
  const tallies = useRef(null);
  useEffect(() => {
    tallies.current = connectTallies(setTally);
    return () => tallies.current.stop();
  }, []);
  const calls = tally.mine;
  const [writing, setWriting] = useState(false);
  const [asking, setAsking] = useState(false);
  // On phones the finder starts folded so the record is reachable without a long scroll.
  const [wide] = useState(() => typeof matchMedia === "undefined" || !matchMedia("(max-width: 760px)").matches);

  const issue = issues.find((i) => i.id === issueId);
  // People with both a quote and a record come first; the rest keep file order.
  const onIssue = useMemo(() => {
    const rank = (p) => {
      const e = p.entries[issueId];
      return e.said.length && e.did.length ? 0 : e.said.length || e.did.length ? 1 : 2;
    };
    return people.filter((p) => data.filed(p, issueId)).sort((a, b) => rank(a) - rank(b));
  }, [issueId]);
  // People on the ballot with nothing on file yet, given an empty file for this issue.
  // Also anyone with a file on other issues but nothing on this one, so a race is never half shown.
  const blanks = useMemo(
    () => [
      // Utah gives them an empty file; other states keep the entry, whose gap says why it is empty.
      ...people.filter((p) => !data.filed(p, issueId)).map((p) => ({ ...p, blank: true, entries: data.utah ? { ...p.entries, [issueId]: EMPTY } : p.entries })),
      ...ballotOnly.map((b) => ({ ...b, blank: true, entries: { [issueId]: EMPTY } })),
    ],
    [issueId]
  );
  // Once a visitor sets any part of where they vote, only those races show.
  const placed = PLACES.some((d) => place[d.type]);
  // A race in the visitor's place whose official candidate list we don't have yet.
  const gapsHere = GAPS.filter((g) => place[g.type] && place[g.type] === g.value);
  const mine = (p) => {
    const r = raceOf(p);
    if (data.utah) return place[r.type] === r.value;
    // Statewide races are on every ballot in the state. A race the address lookup could not settle
    // stays fully listed until the visitor picks a district.
    if (r.type === "statewide") return true;
    if (place[r.type]) return place[r.type] === r.value;
    return (place.open || []).includes(r.type);
  };
  // With no address set, everyone on the ballot is still listed: the people with nothing on file
  // fold away behind one line under the list, so the full count is always reachable.
  const inRaces = placed ? [...onIssue.filter(mine), ...blanks.filter(mine)] : [...onIssue, ...blanks];
  // Someone opened from a shared link stays on screen even if they are outside the visitor's races.
  const pinned = personId && !inRaces.some((p) => p.id === personId) ? onIssue.find((p) => p.id === personId) : null;
  const shown = pinned ? [pinned, ...inRaces] : inRaces;
  const options = useMemo(() => {
    const out = {};
    for (const d of PLACES) {
      const vals = [...new Set([...everyone.map(raceOf).filter((r) => r.type === d.type).map((r) => r.value), ...GAPS.filter((g) => g.type === d.type).map((g) => g.value)])];
      out[d.type] = d.type === "county" ? vals.sort() : vals.sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
    }
    return out;
  }, []);
  function choosePlace(type, value) {
    const next = { ...place, [type]: value };
    setPlace(next);
    setPersonId(null);
    try {
      localStorage.setItem(data.placeKey, JSON.stringify(next));
    } catch {
      /* remembered for this visit only */
    }
  }
  // With nobody picked, open a different person each visit: anyone on this issue with both a
  // quote and a record, chosen at random once per issue, so no one is always first.
  const opener = useRef({});
  if (!(issueId in opener.current) || !shown.some((p) => p.id === opener.current[issueId])) {
    const both = shown.filter((p) => p.entries[issueId].said.length && p.entries[issueId].did.length);
    const some = shown.filter((p) => p.entries[issueId].said.length || p.entries[issueId].did.length);
    const pool = both.length ? both : some.length ? some : shown;
    opener.current[issueId] = pool.length ? pool[Math.floor(Math.random() * pool.length)].id : null;
  }
  const person = shown.find((p) => p.id === personId) || shown.find((p) => p.id === opener.current[issueId]) || shown[0];
  // The list leads with people who have something on file. Names with nothing yet fold away
  // behind one line, so a race full of empty files doesn't bury the ones worth reading.
  const [showEmpty, setShowEmpty] = useState(false);
  const withFile = shown.filter((p) => hasFile(p.entries[issueId]) || (person && p.id === person.id));
  const hidden = shown.length - withFile.length;
  const listed = showEmpty ? shown : withFile;
  const entry = person ? person.entries[issueId] : null;
  const callKey = person ? `${issueId}:${person.id}` : "";
  const call = calls[callKey];

  const first = useRef(true);
  useEffect(() => {
    if (first.current) first.current = false;
    else setPersonId(null);
    if (view === "board") return; // the board writes its own addresses (/utah/board/<thread>)
    writeRoute({ page: "state", state: route.state, view, issue: issueId });
  }, [issueId, view]);

  // Arriving from a shared link to one person: go straight to their file, past the page header.
  useEffect(() => {
    if (!route.person || view !== "records") return undefined;
    const t = setTimeout(() => {
      const el = document.querySelector(".file");
      if (el) el.scrollIntoView({ block: "start" });
    }, 250);
    return () => clearTimeout(t);
  }, []);

  // A person someone picked gets their own address (/utah/lake/owens), and every page its own
  // title, so links and search results land on the right file.
  useEffect(() => {
    if (view === "records" && personId) writeRoute({ page: "state", state: route.state, view, issue: issueId, person: personId });
  }, [personId]);
  useEffect(() => {
    if (view === "board") return; // the board sets its own titles
    const NAMES = { votes: data.utah ? "Roll call" : `${data.name} roll call`, top20: "Utah Top 20", odds: "The Odds", action: "Take action", blog: "Blog", match: "Who votes like you?", feed: "Feed the Eagle", rules: "House rules", terms: "Terms of service", privacy: "Privacy", corrections: "Send a correction" };
    const head =
      view === "records" && person && issue
        ? `${person.name} on ${issue.name}: said vs. did`
        : view === "records" && issue
          ? `${issue.name} in ${data.name}: who said what, who voted how`
          : NAMES[view] || data.name;
    document.title = `${head} | Legit or Full of Shit`;
  }, [view, issueId, person && person.id]);

  // The floating "Ask the Eagle" button steps aside while the Ask box itself, the address box or the
  // row of issue buttons is on screen, so it never covers the question, the answer or a button.
  const [eagleInView, setEagleInView] = useState(false);
  useEffect(() => {
    const els = [...["eagle", "records"].map((id) => document.getElementById(id)), document.querySelector("form.find")].filter(Boolean);
    if (!els.length || typeof IntersectionObserver === "undefined") return undefined;
    const seen = new Map();
    const io = new IntersectionObserver((entries) => {
      for (const it of entries) seen.set(it.target, it.isIntersecting);
      setEagleInView([...seen.values()].some(Boolean));
    }, { threshold: 0 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [view, issueId, person && person.id]);


  // Open one person's file on one issue, from another page.
  function openPerson(pid, iid) {
    setView("records");
    setIssueId(iid);
    setTimeout(() => {
      setPersonId(pid);
      document.getElementById("records")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  function openIssue(id) {
    setIssueId(id);
    setView("records");
    setTimeout(() => {
      const target = document.getElementById("records");
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  // A fresh candidate or issue starts with the email closed.
  useEffect(() => {
    setWriting(false);
    setAsking(false);
  }, [callKey]);

  // Calls are final, like a vote: once made on this device, the buttons lock.
  function makeCall(value) {
    if (call) return;
    tallies.current.cast(callKey, value);
  }

  return (
    <div className="page">
      <header className="masthead">
        <div className="masthead-bird" aria-hidden="true">
          <Bird sky={false} spread />
        </div>
        <p className="eyebrow">
          <button className="linkish" id="all-states" onClick={() => go({ page: "home" })}>All states</button>
          {" / "}{data.name}, general election November 3, 2026
        </p>
        <h1>
          <a className="home-link" href="/" onClick={(e) => { e.preventDefault(); go({ page: "home" }); }}>
            <Mark />
            <span>Legit <span className="or">or</span> <mark>Full of Shit</mark></span>
          </a>
        </h1>
        {data.utah ? (
          <p className="lede coverage">
            All {ballot.length} candidates for Congress, the Legislature and the State School Board, plus {local.length} local
            candidates from {LOCAL_COVERAGE.counties} of {LOCAL_COVERAGE.of} counties. {people.length} people have files of quotes
            and records so far.
          </p>
        ) : (
          <p className="lede coverage">
            All {everyone.length} candidates for {data.scope}, from the{" "}
            <a href={data.ballotSource.url} target="_blank" rel="noreferrer">{data.ballotSource.label}</a>.{" "}
            {people.filter((p) => issues.some((i) => data.filed(p, i.id))).length} people have files of quotes and records so far.
          </p>
        )}
      </header>

      <nav className="views" aria-label="Pages">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            id={`view-${v.id}`}
            className={v.id === view ? "view on" : "view"}
            aria-pressed={v.id === view}
            onClick={() => { setView(v.id); window.scrollTo(0, 0); }}
          >
            {v.label}
          </button>
        ))}
      </nav>

      {data.utah && view === "top20" && <Top20 openIssue={openIssue} counts={tally.counts} issues={issues} />}
      {data.utah && view === "action" && (
        <TakeAction calls={calls} people={people} issues={issues} goRecords={() => setView("records")} />
      )}
      {data.utah && ODDS_ON && view === "odds" && <Odds />}
      {data.utah && view === "blog" && <Blog />}
      {view === "match" && data.questions.length > 0 && (
        <Match
          stateSlug={route.state}
          gaps={gapsHere}
          questions={data.questions}
          people={[...people, ...ballotOnly]}
          placed={placed}
          mine={mine}
          open={openPerson}
          goFinder={() => {
            setView("records");
            setTimeout(() => {
              const f = document.querySelector(".finder-wrap");
              if (f) { f.open = true; f.scrollIntoView({ behavior: "smooth", block: "start" }); }
            }, 60);
          }}
        />
      )}
      {view === "votes" && <RollCall stateName={data.name} people={people} issues={issues} openPerson={(person, issue) => go({ page: "state", state: route.state, view: "records", issue, person })} />}
      {data.utah && SHOP_ON && view === "shop" && <Shop goRecords={() => setView("records")} calls={Object.keys(calls || {}).length} />}
      {data.utah && BOARD_ON && view === "board" && <Board route={route} go={go} />}
      {view === "feed" && <Feed />}
      {view === "rules" && <HouseRules />}
      {view === "terms" && <Terms />}
      {view === "privacy" && <Privacy />}
      {view === "corrections" && <Corrections about={route.about || ""} page={route.pageUrl || ""} />}

      {view === "records" && (<>
      {data.questions.length > 0 && (
        <button
          type="button"
          className="eagle-match match-nudge"
          id="match-nudge"
          onClick={() => { track("match_nudge_click", { state: route.state }); setView("match"); window.scrollTo(0, 0); }}
        >
          Not sure who fits you? <strong>Let the Eagle ask you {data.questions.length} questions →</strong>
        </button>
      )}
      {!(found && placed) && (
        <section className="find-strip" aria-label="Find your races">
          <FindBallot
            compact
            stateSlug={route.state}
            go={go}
            onFound={(found, info) => {
              const next = data.utah ? found : data.placeFrom(found);
              if (!data.utah) {
                try { localStorage.setItem(data.placeKey, JSON.stringify(next)); } catch { /* this visit only */ }
              }
              setPlace(next);
              setFound(info);
              // Open on someone from the visitor's own races who has both a quote and a vote, on the
              // topic where their races have the most on file.
              const inRaces = (p) => {
                const r = raceOf(p);
                if (data.utah) return next[r.type] === r.value;
                return r.type !== "statewide" && (next[r.type] ? next[r.type] === r.value : (next.open || []).includes(r.type));
              };
              const start = bestStart(data, inRaces, issueId);
              if (start && start.issue !== issueId) {
                setIssueId(start.issue);
                setTimeout(() => setPersonId(start.person), 0);
              } else setPersonId(start ? start.person : null);
            }}
          />
        </section>
      )}
      {gapsHere.map((g) => <GapNotice key={g.label} gap={g} />)}
      <nav className="issues" id="records" aria-label="Issues">
        {issues.map((i) => (
          <button
            key={i.id}
            id={`issue-${i.id}`}
            className={i.id === issueId ? "issue on" : "issue"}
            aria-pressed={i.id === issueId}
            onClick={() => setIssueId(i.id)}
          >
            {i.name}
            <span className="count">{people.filter((p) => data.filed(p, i.id)).length}</span>
          </button>
        ))}
      </nav>

      <p className="blurb">{issue.blurb}</p>

      {found && placed && data.utah && (
        <p className="found-note" role="status">
          <strong>Your races, from your address:</strong>{" "}
          {[found.county && `${found.county} County`, found.house && `Utah House ${found.house}`, found.senate && `Utah Senate ${found.senate}`, found.us && `U.S. House ${found.us}`]
            .filter(Boolean)
            .join(" · ")}
          .{found.usNote ? ` Pick your U.S. House district below: ${found.usNote}.` : ""}{" "}
          <button className="linkish" id="found-clear" onClick={() => {
            try { sessionStorage.removeItem("lofs-found"); } catch { /* nothing kept */ }
            setFound(null);
            setPlace(NO_PLACE);
            setPersonId(null);
            try { localStorage.setItem("lofs-place", JSON.stringify(NO_PLACE)); } catch { /* nothing kept */ }
          }}>Show everyone</button>
        </p>
      )}
      {found && placed && !data.utah && (
        <p className="found-note" role="status">
          <strong>Your races, from your address:</strong>{" "}
          {[
            ...PLACES.filter((d) => d.from && place[d.type]).map(
              (d) => `${d.label.replace(/ district$/, "")} ${place[d.type]}${GAPS.some((g) => g.type === d.type && g.value === place[d.type]) ? " (candidate list not yet on file)" : options[d.type].includes(place[d.type]) ? "" : " (not on the ballot this year)"}`
            ),
            "statewide races",
          ].join(" · ")}.
          {PLACES.filter((d) => !d.from && !place[d.type] && (place.open || []).includes(d.type)).map((d) => ` ${d.note}`).join("")}{" "}
          <button className="linkish" id="found-clear" onClick={() => {
            try { sessionStorage.removeItem(foundKey(data.slug)); } catch { /* nothing kept */ }
            setFound(null);
            setPlace(NO_PLACE);
            setPersonId(null);
            try { localStorage.setItem(data.placeKey, JSON.stringify(NO_PLACE)); } catch { /* nothing kept */ }
          }}>Show everyone</button>
        </p>
      )}

      <div className="workspace">
        <aside className="roster" aria-label="Candidates">
          <details className="finder-wrap" open={wide}>
          <summary>Where do you vote?</summary>
          <fieldset className="finder">
            <legend className="sr">Where do you vote?</legend>
            {PLACES.map((d) => (
              <label className="field" htmlFor={`place-${d.type}`} key={d.type}>
                {d.label}
                <select id={`place-${d.type}`} value={place[d.type]} onChange={(e) => choosePlace(d.type, e.target.value)}>
                  <option value="">{d.any}</option>
                  {options[d.type].map((v) => (
                    <option key={v} value={v}>{d.type === "county" ? `${v} County${COUNTY_SEAT[v] ? ` (${COUNTY_SEAT[v]})` : ""}` : `District ${v}`}</option>
                  ))}
                </select>
              </label>
            ))}
            {data.utah ? (
              <p className="finder-help">
                Not sure of your districts?{" "}
                <a href="https://le.utah.gov/GIS/findDistrict.jsp" target="_blank" rel="noreferrer">
                  Look them up by address
                </a>{" "}
                on the Utah Legislature's map, then pick them here.
              </p>
            ) : (
              <p className="finder-help">Not sure of your districts? Type your home address in the box above. Statewide races show for everyone.</p>
            )}
            <p className="finder-count">
              {placed
                ? `${shown.length} in your races, ${shown.filter((p) => hasFile(p.entries[issueId])).length} with something on file for this issue.`
                : `Showing the ${onIssue.filter((p) => hasFile(p.entries[issueId])).length} with something on file for this issue. Pick where you vote to see your races.`}
            </p>
          </fieldset>
          </details>
          <ul>
            {listed.map((p) => {
              const e = p.entries[issueId];
              return (
                <li key={p.id}>
                  <button
                    id={`pick-${p.id}`}
                    className={person && p.id === person.id ? "pick on" : "pick"}
                    aria-pressed={person && p.id === person.id}
                    onClick={() => setPersonId(p.id)}
                  >
                    <span className="pick-name">{p.name}</span>
                    <span className="pick-office">{p.office}</span>
                    <span className="pick-meta">
                      {hasFile(e)
                        ? [
                            e.said.length && `${e.said.length} ${e.said.length === 1 ? "quote" : "quotes"}`,
                            e.did.length && `${e.did.length} ${e.did.length === 1 ? "vote or record" : "votes and records"}`,
                            !e.did.length && (e.record || []).length && `${e.record.length} on the record`,
                          ].filter(Boolean).join(" · ")
                        : "Nothing on file yet"}
                      {calls[`${issueId}:${p.id}`] ? " · called" : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {hidden > 0 && (
            <button type="button" className="linkish more-people" id="more-people" onClick={() => setShowEmpty((v) => !v)}>
              {showEmpty ? `Hide the ${hidden} with nothing on file yet` : `+ ${hidden} more with nothing on file yet`}
            </button>
          )}
        </aside>

        {!person && (
          <main className="file">
            <p className="empty">
              {placed
                ? "No one in the races you picked is on file for this issue yet. Clear a choice to see everyone."
                : "No candidate is matched to this issue yet."}
            </p>
          </main>
        )}

        {person && (
          <main className="file" aria-live="polite">
            <div className="who">
              <h2>{person.name}</h2>
              <p className="who-line">
                {person.office} · {person.party} · {person.status}
              </p>
              <p className="who-ballot">
                {person.ballot.off ? "Not on the November 2026 ballot. In office per" : "On the ballot per"}{" "}
                <a href={person.ballot.url} target="_blank" rel="noreferrer">{person.ballot.label}</a>
              </p>
              <Follow key={person.id} person={person} />
              <p className="who-fix">
                <button className="linkish" id="fix-this" onClick={() => go({ page: "state", state: route.state, view: "corrections", about: person.name, pageUrl: typeof location !== "undefined" ? location.href : "" })}>
                  See something wrong? Send a correction
                </button>
              </p>
            </div>

            <div className="ledger">
              <section className="col said">
                <h3>Said</h3>
                {entry.said.length === 0 && <p className="empty">{entry.gap && entry.did.length ? entry.gap : "No quote on file yet."}</p>}
                {entry.said.length === 0 && !person.blank && (
                  <div className="ask-stance">
                    {asking ? (
                      <Composer key={`ask-${callKey}`} person={person} issue={issue} mode="ask" />
                    ) : (
                      <button type="button" className="panel-go" id="ask-stance" onClick={() => { setAsking(true); track("ask_stance", { person: person.id, issue: issue.id }); }}>
                        Ask {person.name} where they stand
                      </button>
                    )}
                    {!asking && <p className="call-note">We don't have a public statement from them on this yet. Ask them yourself: we'll draft the email, you send it.</p>}
                  </div>
                )}
                {entry.said.length === 0 && person.noAnswer && (
                  <div className="record onrecord">
                    <span className="rec-type">Questionnaire</span>
                    <p className="motion">Did not answer {person.noAnswer.source}'s 2026 candidate questionnaire.</p>
                    <p className="when">{person.noAnswer.date} · The page says: “{person.noAnswer.text}”</p>
                    <Source item={{ ...person.noAnswer, kind: "press" }} />
                  </div>
                )}
                {entry.said.map((q, i) => (
                  <figure className="quote" key={i}>
                    <blockquote>“{q.text.replace(/,$/, "")}”</blockquote>
                    <figcaption>
                      {q.date} · {q.venue}
                    </figcaption>
                    {q.note && <p className="quote-note">{q.note}</p>}
                    <Source item={q} />
                  </figure>
                ))}
              </section>

              <section className="col did">
                <h3>Did</h3>
                {entry.did.length === 0 && <NoVote person={person} entry={entry} />}
                {(entry.requests || []).map((q, i) => (
                  <div className="request" key={i}>
                    <div className="record-top">
                      <span className="measure">Public records request</span>
                      <span className={`status status-${q.status}`}>{REQUEST_STATUS[q.status]}</span>
                    </div>
                    <p className="motion">To: {q.agency}</p>
                    <ul className="asked">
                      {q.asked.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                    {q.released && (
                      <div className="released">
                        <p><strong>Released {q.received}:</strong></p>
                        <ul className="asked">{q.released.map((r) => <li key={r}>{r}</li>)}</ul>
                        {q.notReleased && (<>
                          <p><strong>Not in the release:</strong></p>
                          <ul className="asked">{q.notReleased.map((r) => <li key={r}>{r}</li>)}</ul>
                        </>)}
                      </div>
                    )}
                    <p className="when">
                      {q.filed ? `Filed ${q.filed}. ` : ""}
                      {q.ref ? `${q.ref} ` : ""}
                      {q.due && !q.received ? `Response due ${q.due}. ` : ""}
                      {q.law}
                    </p>
                    {q.status !== "drafted" && (
                      <button className="linkish" onClick={() => { wantPost("sheriff-records-requests"); setView("blog"); window.scrollTo(0, 0); }}>
                        Read the request
                      </button>
                    )}
                  </div>
                ))}
                {entry.did.map((r, i) => (
                  <div className="record" key={i}>
                    <div className="record-top">
                      <span className="measure">{r.measure}</span>
                      <span className={`vote ${voteClass(r.vote, !data.utah)}`}>{r.vote}</span>
                    </div>
                    {(r.tie || tieOf(issue, r)) && (
                      <p className="tie"><span>Why it's here</span> {r.tie || tieOf(issue, r)}</p>
                    )}
                    <p className="motion"><Marked text={r.motion} hit={r.hit} /></p>
                    <p className="when">
                      {r.date}
                      {r.tally ? ` · ${r.tally}` : ""}
                    </p>
                    {r.note && <p className="quote-note">{r.note}</p>}
                    <Source item={r} />
                  </div>
                ))}
              </section>
            </div>

            {entry.context && (
              <p className="context">
                <strong>Context.</strong> {entry.context}
              </p>
            )}

            {person.blank && (
              <p className="context blank-note">
                <strong>Nothing on file yet.</strong> {person.name} {person.ballot && person.ballot.off ? "holds this office" : "is on the November 3 ballot"}, but no quote or record
                on {issue.name.toLowerCase()} has been checked and added. There is nothing to call yet. Ask the Eagle
                below what to dig up, and it goes on the research list.
              </p>
            )}

            <div className="call" style={person.blank ? { display: "none" } : undefined}>
              <p className="call-ask">Your call on {person.name}, {issue.name}:</p>
              {tally.week >= 10 && <p className="call-week">{tally.week.toLocaleString()} people made a call on this site in the last 7 days.</p>}
              <div className="call-buttons">
                <button id="call-legit" className={call === "legit" ? "legit on" : "legit"} aria-pressed={call === "legit"} disabled={!!call} onClick={() => makeCall("legit")}>
                  Legit
                </button>
                <button id="call-fos" className={call === "fos" ? "fos on" : "fos"} aria-pressed={call === "fos"} disabled={!!call} onClick={() => makeCall("fos")}>
                  Full of shit
                </button>
              </div>
              {call && (
                <div className="send">
                  <button id="send-email" className="panel-go" onClick={() => setWriting(!writing)}>
                    {writing ? "Close the email" : "Send email now"}
                  </button>
                  {writing && <Composer key={callKey + call} person={person} issue={issue} call={call} />}
                  <ShareCall person={person} issue={issue} call={call} state={route.state} entry={entry} />
                </div>
              )}
              {(() => {
                const c = (tally.counts && tally.counts[callKey]) || { legit: 0, fos: 0 };
                const total = c.legit + c.fos;
                if (tally.mode === "local") {
                  return (
                    <p className="call-note">
                      {call ? `Saved on this device: ${call === "legit" ? "Legit" : "Full of shit"}. ` : ""}
                      Public tallies show here once the tally service is connected.
                    </p>
                  );
                }
                if (!call) {
                  return (
                    <p className="call-note">
                      {tally.canCall
                        ? "Make your call to see how everyone else called it."
                        : "Sign in with edit access to make a call on this preview."}
                    </p>
                  );
                }
                const pct = total ? Math.round((c.legit / total) * 100) : 0;
                return (
                  <div className="tally" id="tally">
                    <div className="tally-bar" role="img" aria-label={`${c.legit} legit, ${c.fos} full of shit`}>
                      <span className="tally-legit" style={{ width: `${total ? pct : 50}%` }} />
                    </div>
                    <p className="tally-nums">
                      <span>Legit {c.legit}</span>
                      <span>Full of shit {c.fos}</span>
                    </p>
                    <p className="tally-yours">The tallies are your opinion, not ours.</p>
                    <p className="call-note">
                      {total} {total === 1 ? "call" : "calls"} so far.{" "}
                      {tally.mode === "shared"
                        ? "Preview: counts come from people this page is shared with."
                        : "One call per device, and it's final, like a vote."}
                    </p>
                  </div>
                );
              })()}
              {call && <ShirtMock person={person} call={call} callKey={callKey} />}
            </div>

            <Eagle key={callKey} person={person} issue={issue} />
            {!person.blank && TRACKER_SHOWN && <Tracker key={`tracker-${person.id}`} person={person} issue={issue} />}
            {!person.blank && <EvidenceFile key={`file-${callKey}`} person={person} issue={issue} />}
          </main>
        )}
      </div>

      {person && (
        <button
          id="eagle-fab"
          className={eagleInView ? "fab fab-hidden" : "fab"}
          aria-hidden={eagleInView}
          tabIndex={eagleInView ? -1 : 0}
          onClick={() => {
            const el = document.getElementById("eagle");
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
            const box = document.getElementById("eagle-q");
            if (box) box.focus({ preventScroll: true });
          }}
        >
          <Bird sky={false} />
          <span>Ask the Eagle</span>
        </button>
      )}

      <section className="measures">
        <h3>What these measures do</h3>
        <dl>
          {issue.measures.map((m) => (
            <div className="measure-row" key={m.id}>
              <dt>
                <a href={m.url} target="_blank" rel="noreferrer">{m.id}</a>
                <span>{m.title}</span>
              </dt>
              <dd>
                {m.what}
                {m.status && (
                  <span className="measure-status">
                    <strong>Court status{m.statusAsOf ? `, as of ${m.statusAsOf}` : ""}:</strong> {m.status}
                    {(m.statusSources || []).length > 0 && (
                      <>
                        {" "}Sources:{" "}
                        {m.statusSources.map((u, n) => (
                          <span key={u}>
                            {n > 0 ? ", " : ""}
                            <a href={u} target="_blank" rel="noreferrer">{(() => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return "source"; } })()}</a>
                          </span>
                        ))}
                        .
                      </>
                    )}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <Divided counts={tally.counts} mine={calls} people={people} issues={issues}
        open={(pid, iid) => { setIssueId(iid); setTimeout(() => { setPersonId(pid); document.getElementById("records")?.scrollIntoView({ behavior: "smooth" }); }, 0); }} />

      {data.utah && <IssueReel issues={issues} people={people} onOpen={openIssue} deps={[view]} />}

      </>)}

      <footer className="foot">
        {view !== "feed" && <FeedNudge onFeed={() => { setView("feed"); window.scrollTo(0, 0); }} />}
        <p className="foot-line">The tallies are your opinion, not ours.</p>
        <nav className="foot-links" aria-label="Site rules and policies">
          {[["rules", "House rules"], ["terms", "Terms of service"], ["privacy", "Privacy"], ["corrections", "Send a correction"]].map(([id, label]) => (
            <button key={id} id={`foot-${id}`} className="linkish" onClick={() => { setView(id); window.scrollTo(0, 0); }}>
              {label}
            </button>
          ))}
        </nav>
      </footer>
    </div>
  );
}
