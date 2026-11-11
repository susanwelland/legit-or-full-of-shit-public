// After `vite build`: write a real HTML page for every address search engines should find, plus
// sitemap.xml and robots.txt. Each page carries its own title, description and a plain-HTML copy
// of what the app shows there (the same quotes, votes and sources), so a crawler reads the content
// without running JavaScript. When the app loads, React replaces that copy with the live page.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { issues, people } from "../src/data/utah.js";
import { ballot } from "../src/data/utahBallot.js";
import { local } from "../src/data/utahLocal.js";
import { posts } from "../src/data/posts.js";
import { top20, asOf } from "../src/data/top20.js";
import { OPEN_STATES } from "../src/data/states/index.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// OUT_DIR lets a test build write somewhere other than dist/.
const DIST = process.env.OUT_DIR ? resolve(process.env.OUT_DIR) : join(ROOT, "dist");
const SITE = "https://legitorfullofshit.com";
const TEMPLATE = readFileSync(join(DIST, "index.html"), "utf8");
const TODAY = new Date().toISOString().slice(0, 10);

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const clip = (s, n = 158) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s);
// Site addresses end in "/": the host serves a prerendered page only at /path/ (see page()).
const slash = (p) => (p === "/" || p.endsWith("/") || /[?#]|\.[a-z0-9]+$/i.test(p) || !p.startsWith("/") ? p : p + "/");
const link = (href, text) => `<a href="${esc(slash(href))}">${esc(text)}</a>`;
const out = (href, text) => `<a href="${esc(href)}" rel="noopener">${esc(text)}</a>`;

const filed = people.filter((p) => Object.values(p.entries).some((e) => e.said.length || e.did.length || (e.record || []).length));
const onFile = (p, id) => {
  const e = p.entries[id];
  return e && (e.said.length || e.did.length || (e.record || []).length);
};
const total = ballot.length + local.length;

// index: false keeps the page reachable (shared links still work) but asks search engines not to
// list it, and leaves it out of the sitemap. Used for person pages with no quote on file: thousands
// of near-identical vote-only pages would read as thin content.
const listed = new Set();
function page(path, { title, description, body, jsonld, index = true }) {
  const url = SITE + slash(path);
  if (index) listed.add(path);
  let html = TEMPLATE.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(description)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(description)}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${esc(url)}$2`)
    .replace("</head>", `    <link rel="canonical" href="${esc(url)}" />\n${index ? "" : `    <meta name="robots" content="noindex, follow" />\n`}${jsonld ? `    <script type="application/ld+json">${JSON.stringify(jsonld)}</script>\n` : ""}  </head>`)
    .replace('<div id="root"></div>', `<div id="root"><div class="seo-snapshot">${body}</div></div>`);
  const file = path === "/" ? join(DIST, "index.html") : join(DIST, path.slice(1), "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  return path;
}

const NAV = `<nav>${link("/", "Home")} · ${link("/utah", "Utah")} · ${issues.map((i) => link(`/utah/${i.id}`, i.name)).join(" · ")} · ${link("/utah/match", "Who votes like you")} · ${link("/utah/top20", "Utah Top 20")} · ${link("/utah/blog", "Blog")}</nav>`;
const LEDE = "What candidates and officials said, next to what they did. Word for word, with the source. No scores from us. You make the call.";

const paths = [];

// Home
paths.push(
  page("/", {
    title: "Is your politician legit or full of shit? Check by ZIP | Legit or Full of Shit",
    description: "Type your ZIP and see what your officials said next to how they voted, with the bill, the date and the official record. No scores. You make the call.",
    jsonld: { "@context": "https://schema.org", "@type": "WebSite", name: "Legit or Full of Shit", url: SITE + "/", description: LEDE },
    body: `<h1>Is your politician legit or full of shit?</h1><p>Type your zip. Get the answer in 10 seconds, with the votes to prove it.</p><p>${esc(LEDE)}</p>${NAV}<h2>Open states</h2><ul><li>${link("/utah", "Utah")}</li>${OPEN_STATES.map((st) => `<li>${link(`/${st.slug}`, st.name)}</li>`).join("")}</ul><h2>The first proof state: Utah</h2><ul>${issues
      .map((i) => `<li>${link(`/utah/${i.id}`, i.name)}: ${esc(i.blurb)}</li>`)
      .join("")}</ul><p>${total} candidates on Utah's November 3, 2026 ballot. ${filed.length} people have files of quotes and records so far.</p>`,
  })
);

// Utah
paths.push(
  page("/utah", {
    title: "Utah: what politicians said vs. what they did | Legit or Full of Shit",
    description: `${filed.length} Utah candidates and officials from the 2026 election, with quotes and votes on the Great Salt Lake, data centers, plate-reader cameras and police drones.`,
    body: `<h1>Utah: said vs. did</h1><p>${esc(LEDE)}</p>${NAV}<h2>People on file</h2><ul>${filed
      .map((p) => {
        const first = issues.find((i) => onFile(p, i.id));
        return `<li>${link(`/utah/${first.id}/${p.id}`, p.name)}, ${esc(p.office)} (${esc(p.party)})</li>`;
      })
      .join("")}</ul>`,
  })
);

// Each issue, and each person on it
for (const i of issues) {
  const on = filed.filter((p) => onFile(p, i.id));
  paths.push(
    page(`/utah/${i.id}`, {
      title: `${i.name} in Utah: who said what, who voted how | Legit or Full of Shit`,
      description: clip(`${i.blurb} Quotes and votes from ${on.length} Utah candidates and officials, each with its source.`),
      body: `<h1>${esc(i.name)}</h1><p>${esc(i.blurb)}</p>${NAV}<h2>The measures</h2><ul>${i.measures
        .map((m) => `<li>${out(m.url, m.id)}: ${esc(m.title)}. ${esc(m.what)}</li>`)
        .join("")}</ul><h2>Who said what</h2><ul>${on
        .map((p) => `<li>${link(`/utah/${i.id}/${p.id}`, p.name)}, ${esc(p.office)}: ${p.entries[i.id].said.length} quotes, ${p.entries[i.id].did.length} votes and records</li>`)
        .join("")}</ul>`,
    })
  );
  for (const p of on) {
    const e = p.entries[i.id];
    const said = e.said.length
      ? e.said
          .map((q) => `<blockquote>“${esc(q.text)}”</blockquote><p>${esc(q.date)} · ${esc(q.venue)} · ${out(q.url, q.source)}</p>${q.note ? `<p>${esc(q.note)}</p>` : ""}`)
          .join("")
      : `<p>No quote on file yet.</p>${p.noAnswer ? `<p>Did not answer ${esc(p.noAnswer.source)}'s 2026 candidate questionnaire. ${esc(p.noAnswer.date)}. The page says: “${esc(p.noAnswer.text)}” ${out(p.noAnswer.url, p.noAnswer.source)}</p>` : ""}`;
    const did = e.did.length
      ? `<ul>${e.did.map((r) => `<li>${esc(r.measure)}: ${esc(r.vote)}. ${esc(r.motion)}. ${esc(r.date)}${r.tally ? ` · ${esc(r.tally)}` : ""}. ${out(r.url, "Record")}</li>`).join("")}</ul>`
      : `<p>No vote on record. ${esc(e.gap || "")}</p>`;
    const firstQuote = e.said[0] ? `“${e.said[0].text}”` : "";
    paths.push(
      page(`/utah/${i.id}/${p.id}`, {
        index: e.said.length > 0,
        title: `${p.name} on ${i.name}: said vs. did | Legit or Full of Shit`,
        description: clip(`${p.name}, ${p.office}. ${firstQuote ? firstQuote + " " : ""}${e.said.length} quotes and ${e.did.length} votes and records on ${i.name.toLowerCase()}, with sources.`),
        body: `<h1>${esc(p.name)} on ${esc(i.name)}</h1><p>${esc(p.office)} · ${esc(p.party)} · ${esc(p.status)}</p>${NAV}<h2>Said</h2>${said}<h2>Did</h2>${did}${
          e.context ? `<p>Context: ${esc(e.context)}</p>` : ""
        }<p>Legit or full of shit? You make the call.</p>`,
      })
    );
  }
}

// The other pages
const simple = [
  ["/utah/match", "Who votes like you? Match your views to Utah votes | Legit or Full of Shit", "Answer five yes/no questions, each tied to a real Utah vote, and see how the people on your 2026 ballot actually voted. No endorsements.", "<h1>Who votes like you?</h1><p>Five yes/no questions, each tied to one real recorded vote. Then see how the people in your races voted, with the roll call.</p>"],
  ["/utah/top20", "Utah Top 20: what Utah voters care about | Legit or Full of Shit", `Twenty issues Utah voters and Utah news are focused on, as of ${asOf}, with the polls and sources behind each number.`, `<h1>Utah Top 20</h1><ul>${top20.map((t) => `<li><strong>${esc(t.title)}</strong> (${esc(t.stat)}): ${esc(t.line)}</li>`).join("")}</ul>`],
  ["/utah/blog", "Blog | Legit or Full of Shit", "Why this site exists, and the public records requests behind it.", `<h1>Blog</h1>${posts.map((p) => `<article><h2>${esc(p.title)}</h2><p>${esc(p.date)}</p><p>${esc(p.dek)}</p>${p.blocks.filter((b) => b.p).map((b) => `<p>${esc(b.p)}</p>`).join("")}</article>`).join("")}`],
  ["/utah/votes", "Utah roll calls on the lake, data centers and surveillance | Legit or Full of Shit", "How every Utah legislator voted on the Great Salt Lake, data center and license plate reader bills, from the official roll calls.", "<h1>Roll call</h1>"],
  ["/utah/odds", "The Odds: 2026 midterm prediction markets | Legit or Full of Shit", "Prediction-market prices for the 2026 House and Senate and Utah's 1st District, read with care.", "<h1>The Odds</h1>"],
  ["/utah/action", "Take action: write to Utah officials | Legit or Full of Shit", "Write to your officials about what they said and what they did.", "<h1>Take action</h1>"],
  ["/rules", "House rules | Legit or Full of Shit", "How this site works: quotes word for word, every line sourced, no verdicts from us.", "<h1>House rules</h1>"],
  ["/privacy", "Privacy | Legit or Full of Shit", "What this site collects and what it doesn't.", "<h1>Privacy</h1>"],
  ["/terms", "Terms of service | Legit or Full of Shit", "Terms for using Legit or Full of Shit.", "<h1>Terms of service</h1>"],
  ["/feed", "Feed the Eagle | Legit or Full of Shit", "Chip in a few dollars to keep the Eagle digging up receipts.", "<h1>Feed the Eagle</h1>"],
  ["/corrections", "Send a correction | Legit or Full of Shit", "See something wrong? Send a correction with a source.", "<h1>Send a correction</h1>"],
];
for (const [path, title, description, body] of simple) paths.push(page(path, { title, description, body: body + NAV }));

// Every other open state: its landing page, each issue, each person on each issue, and its roll call.
for (const meta of OPEN_STATES) {
  const st = await meta.load();
  const base = `/${st.slug}`;
  const has = (p, id) => {
    const e = p.entries[id];
    return e && (e.said.length || e.did.length);
  };
  const stFiled = st.people.filter((p) => st.issues.some((i) => has(p, i.id)));
  const issueList = st.issues.map((i) => i.name.toLowerCase());
  const issueWords = issueList.length > 1 ? `${issueList.slice(0, -1).join(", ")} and ${issueList[issueList.length - 1]}` : issueList[0];
  const nav = `<nav>${link("/", "Home")} · ${link(base, st.name)} · ${st.issues.map((i) => link(`${base}/${i.id}`, i.name)).join(" · ")}${
    meta.match ? ` · ${link(`${base}/match`, "Who votes like you")}` : ""
  } · ${link(`${base}/votes`, "Roll call")}</nav>`;
  const source = `<p>Candidate list: ${out(st.ballotSource.url, st.ballotSource.label)}.</p>`;
  paths.push(
    page(base, {
      title: `${st.name}: what politicians said vs. what they did | Legit or Full of Shit`,
      description: clip(`${stFiled.length} ${st.name} candidates and officials from the 2026 election, with quotes and votes on ${issueWords}, each with its source.`),
      body: `<h1>${esc(st.name)}: said vs. did</h1><p>${esc(st.name)}, after the general election of ${esc(st.electionDate)}. ${esc(LEDE)}</p>${nav}<p>All ${st.people.length} people on the ballot for ${esc(st.scope)}. ${stFiled.length} people have files of quotes and records so far.</p>${source}<h2>What we're tracking</h2><ul>${st.issues
        .map((i) => `<li>${link(`${base}/${i.id}`, i.name)}: ${esc(i.blurb)}</li>`)
        .join("")}</ul><h2>People on file</h2><ul>${stFiled
        .map((p) => {
          const first = st.issues.find((i) => has(p, i.id));
          return `<li>${link(`${base}/${first.id}/${p.id}`, p.name)}, ${esc(p.office)} (${esc(p.party)})</li>`;
        })
        .join("")}</ul>`,
    })
  );
  for (const i of st.issues) {
    const on = stFiled.filter((p) => has(p, i.id));
    paths.push(
      page(`${base}/${i.id}`, {
        title: `${i.name} in ${st.name}: who said what, who voted how | Legit or Full of Shit`,
        description: clip(`${i.blurb} Quotes and votes from ${on.length} ${st.name} candidates and officials, each with its source.`),
        body: `<h1>${esc(i.name)} in ${esc(st.name)}</h1><p>${esc(i.blurb)}</p>${nav}<h2>The measures</h2><ul>${i.measures
          .map((m) => `<li>${out(m.url, m.id)}: ${esc(m.title)}. ${esc(m.what)}${m.status ? ` Court status${m.statusAsOf ? `, as of ${esc(m.statusAsOf)}` : ""}: ${esc(m.status)}` : ""}</li>`)
          .join("")}</ul><h2>Who said what</h2><ul>${on
          .map((p) => `<li>${link(`${base}/${i.id}/${p.id}`, p.name)}, ${esc(p.office)}: ${p.entries[i.id].said.length} quotes, ${p.entries[i.id].did.length} votes</li>`)
          .join("")}</ul>`,
      })
    );
    for (const p of on) {
      const e = p.entries[i.id];
      const said = e.said.length
        ? e.said.map((q) => `<blockquote>“${esc(q.text)}”</blockquote><p>${esc(q.date)} · ${esc(q.venue)} · ${out(q.url, q.source)}</p>${q.note ? `<p>${esc(q.note)}</p>` : ""}`).join("")
        : `<p>${esc(e.gap || "No quote on file yet.")}</p>`;
      const did = e.did.length
        ? `<ul>${e.did.map((r) => `<li>${esc(r.measure)}: ${esc(r.vote)}. ${esc(r.motion)}. ${esc(r.date)}${r.tally ? ` · ${esc(r.tally)}` : ""}. ${out(r.url, "Record")}</li>`).join("")}</ul>`
        : `<p>No vote on record. ${esc(e.gap || "")}</p>`;
      const firstQuote = e.said[0] ? `“${e.said[0].text}”` : "";
      paths.push(
        page(`${base}/${i.id}/${p.id}`, {
          index: e.said.length > 0,
          title: `${p.name} on ${i.name}: said vs. did | Legit or Full of Shit`,
          description: clip(`${p.name}, ${p.office}, ${st.name}. ${firstQuote ? firstQuote + " " : ""}${e.said.length} quotes and ${e.did.length} votes on ${i.name.toLowerCase()}, with sources.`),
          body: `<h1>${esc(p.name)} on ${esc(i.name)}</h1><p>${esc(p.office)} · ${esc(p.party)} · ${esc(p.status)}</p>${nav}<h2>Said</h2>${said}<h2>Did</h2>${did}<p>Legit or full of shit? You make the call.</p>`,
        })
      );
    }
  }
  paths.push(
    page(`${base}/votes`, {
      title: `${st.name} roll calls: how they voted | Legit or Full of Shit`,
      description: clip(`How ${st.name} legislators voted on ${issueWords}, from the official roll calls.`),
      body: `<h1>${esc(st.name)} roll call</h1>${nav}`,
    })
  );
  if (meta.match) {
    paths.push(
      page(`${base}/match`, {
        title: `Who votes like you? Match your views to ${st.name} votes | Legit or Full of Shit`,
        description: `Answer ${st.questions.length} yes/no questions, each tied to a real ${st.name} vote, and see how the people on your 2026 ballot actually voted. No endorsements.`,
        body: `<h1>Who votes like you?</h1><p>${st.questions.length} yes/no questions, each tied to one real recorded vote in ${esc(st.name)}.</p><ul>${st.questions
          .map((q) => `<li>${esc(q.ask)} ${esc(q.note)}</li>`)
          .join("")}</ul>${nav}`,
      })
    );
  }
}

writeFileSync(
  join(DIST, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths
    .filter((p) => listed.has(p))
    .map((p) => `  <url><loc>${SITE}${slash(p)}</loc></url>`)
    .join("\n")}\n</urlset>\n`
);
writeFileSync(join(DIST, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`seo: ${paths.length} pages (${listed.size} in the sitemap, ${paths.length - listed.size} noindex), sitemap.xml, robots.txt`);
