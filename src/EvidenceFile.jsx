import { useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import { Checkout, Receipt } from "./Shop.jsx";
import { voterId } from "./tallies.js";
import { fileUrl } from "./route.js";
import { track } from "./analytics.js";

ModuleRegistry.registerModules([AllCommunityModule]);

const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const money = (cents) => `$${(cents / 100).toFixed(2)}`;
const KIND = { official: "Official record", press: "News report", tracker: "Vote tracker", records: "Records request", lead: "Unchecked lead" };

// Who holds a record, read from its address. Unknown hosts are named by their address.
export function publisherOf(url) {
  let host = "";
  if (url && url.startsWith("/records/grand-county/")) return "Grand County (GRAMA release)";
  try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { return "Record source"; }
  if (host === "le.utah.gov") return "Utah Legislature";
  if (host === "utah.gov") return "Utah Public Notice Website";
  if (host.endsWith("civicclerk.com") || host.endsWith("saltlakecounty.gov")) return "Salt Lake County";
  if (host === "fastdemocracy.com") return "FastDemocracy (vote tracker)";
  if (host === "leginfo.legislature.ca.gov") return "California Legislature";
  if (host === "clerk.assembly.ca.gov") return "California Assembly Clerk";
  if (host === "clerk.house.gov") return "U.S. House Clerk";
  if (host === "wyoleg.gov") return "Wyoming Legislature";
  if (host === "olis.oregonlegislature.gov") return "Oregon Legislature";
  return host;
}

// The same rows the service builds from records on file, for the free sample table.
function sampleRows(person, issue) {
  const e = person.entries[issue.id];
  return [
    ...e.said.map((q) => ({ type: "Statement", what: `"${q.text}"`, date: q.date, publisher: q.source, sourceType: q.kind, url: q.url, note: q.venue, origin: "On file" })),
    ...e.did.map((r) => ({ type: "Record", what: `${r.measure}: ${r.vote}. ${r.motion}`, date: r.date, publisher: publisherOf(r.url), sourceType: r.kind, url: r.url, note: r.tally || "", origin: "On file" })),
    ...(e.requests || []).map((q) => ({ type: "Records request", what: `To ${q.agency}: ${q.asked.join("; ")}`, date: q.filed || "", publisher: q.agency, sourceType: "records", url: "", note: q.ref || "", origin: "On file" })),
  ];
}

export const gridTheme = themeQuartz.withParams({
  backgroundColor: "var(--surface)",
  foregroundColor: "var(--ink)",
  headerBackgroundColor: "var(--neutral-bg)",
  borderColor: "var(--line)",
  accentColor: "var(--link)",
  fontFamily: "inherit",
  fontSize: 14,
});

function Table({ rows }) {
  const grid = useRef(null);
  const [shown, setShown] = useState(rows.length);
  const [quick, setQuick] = useState("");
  const cols = useMemo(
    () => [
      { field: "type", headerName: "Type", filter: true, width: 140 },
      { field: "what", headerName: "What it says", flex: 2, minWidth: 260, wrapText: true, autoHeight: true, filter: "agTextColumnFilter" },
      { field: "date", headerName: "Date", width: 150, valueFormatter: (p) => p.value || "unknown" },
      { field: "publisher", headerName: "Source", filter: true, width: 190 },
      { field: "sourceType", headerName: "Source type", filter: true, width: 150, valueFormatter: (p) => KIND[p.value] || p.value },
      { field: "note", headerName: "Detail", flex: 1, minWidth: 180, wrapText: true, autoHeight: true },
      {
        field: "url",
        headerName: "Open",
        width: 110,
        sortable: false,
        cellRenderer: (p) => (p.value ? <a href={fileUrl(p.value)} target="_blank" rel="noreferrer noopener">Source</a> : "None yet"),
      },
    ],
    []
  );
  const reset = () => {
    setQuick("");
    grid.current.api.setFilterModel(null);
    grid.current.api.setGridOption("quickFilterText", "");
  };
  return (
    <div className="evidence-table">
      <div className="evidence-tools">
        <label className="sr" htmlFor="evidence-search">Search the evidence</label>
        <input
          id="evidence-search"
          value={quick}
          placeholder="Search the evidence"
          onChange={(e) => { setQuick(e.target.value); grid.current.api.setGridOption("quickFilterText", e.target.value); }}
        />
        <button type="button" className="copy" id="evidence-reset" onClick={reset}>Reset filters</button>
        <span className="evidence-count" role="status">{shown} of {rows.length} rows</span>
      </div>
      <div className="evidence-grid">
        <AgGridReact
          ref={grid}
          theme={gridTheme}
          rowData={rows}
          columnDefs={cols}
          defaultColDef={{ sortable: true, resizable: true }}
          domLayout="autoHeight"
          onModelUpdated={(e) => setShown(e.api.getDisplayedRowCount())}
          overlayNoRowsTemplate="No rows match. Use Reset filters."
        />
      </div>
    </div>
  );
}

export default function EvidenceFile({ person, issue }) {
  const [state, setState] = useState("idle"); // idle | building | offer | unlocked | sample | error
  const [file, setFile] = useState(null);
  const [shop, setShop] = useState({ mode: "off", clientId: null, reportCents: 100 });
  const [note, setNote] = useState("");
  const headers = { "Content-Type": "application/json", "X-Voter": voterId() };

  // A file this browser already paid for comes straight back, unlocked, on every visit.
  useEffect(() => {
    if (!API) return;
    fetch(`${API}/api/reports/paid?person=${encodeURIComponent(person.id)}&issue=${encodeURIComponent(issue.id)}`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => { if (b && b.unlocked) { setFile(b); setState("unlocked"); } })
      .catch(() => {});
  }, [person.id, issue.id]);

  async function build() {
    if (!API) return setState("sample");
    setState("building");
    try {
      const [cfg, r] = await Promise.all([
        fetch(`${API}/api/shop`).then((x) => x.json()),
        fetch(`${API}/api/reports`, { method: "POST", headers, body: JSON.stringify({ person: person.id, issue: issue.id }) }),
      ]);
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || "The Eagle could not build the file.");
      setShop(cfg);
      setFile(body);
      setState(body.unlocked ? "unlocked" : "offer");
      track("evidence_file_built", { person: person.id, issue: issue.id, rows: body.rowCount });
    } catch (e) {
      setNote(e.message);
      setState("error");
    }
  }
  async function open() {
    const r = await fetch(`${API}/api/reports/${file.reportId}`, { headers });
    const body = await r.json();
    if (r.ok && body.unlocked) {
      setFile(body);
      setState("unlocked");
    } else {
      setNote("The payment has not been confirmed, so the file is still locked.");
      setState("error");
    }
  }

  return (
    <section className="evidence" id="evidence" aria-label="Evidence file">
      <h3>The evidence file</h3>
      <p>
        Everything on {person.name} and {issue.name} in one table you can sort, filter and search: every statement, every
        record and every source. It contains no verdict. That part is yours.
      </p>

      {state === "idle" && (
        <button className="panel-go" id="evidence-build" onClick={build}>Have the Eagle build it</button>
      )}
      {state === "building" && <p className="call-note" role="status">The Eagle is gathering sources…</p>}

      {state === "offer" && file && (
        <div className="evidence-offer">
          <p>
            <strong>The file is ready: {file.rowCount} {file.rowCount === 1 ? "row" : "rows"}.</strong>{" "}
            {Object.entries(file.counts).map(([k, n]) => `${n} ${k.toLowerCase()}${n === 1 ? "" : "s"}`).join(", ")}.{" "}
            {file.searched ? "It includes unchecked leads from a web search." : "Web search is not switched on, so it holds the records already on file."}
          </p>
          {file.preview[0] && (
            <p className="evidence-preview"><span className="kind">Preview</span> {file.preview[0].type}: {file.preview[0].what}</p>
          )}
          <p className="sandbox-flag" role="note">
            <strong>Unlock for {money(shop.reportCents)} in PayPal sandbox.</strong> No real money moves. Paying never changes what the file says.
          </p>
          <Checkout item={{ report: file.reportId }} shop={shop} onDone={open} paidText="" />
        </div>
      )}

      {state === "unlocked" && file && (
        <>
          <p className="paid" role="status">Payment confirmed by the server. The file is unlocked for you and stays unlocked if you reload.</p>
          <Receipt r={file.receipt} />
          <Table rows={file.rows} />
        </>
      )}

      {state === "sample" && (
        <>
          <p className="sandbox-flag" role="note">
            <strong>Sample.</strong> This copy of the site is not connected to checkout, so this table shows only the records already on the page. The paid file adds what the Eagle's search finds.
          </p>
          <Table rows={sampleRows(person, issue)} />
        </>
      )}
      {state === "error" && <p className="call-note" role="alert">{note}</p>}
    </section>
  );
}
