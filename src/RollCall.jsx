// Every vote and official action on file, in one table: who voted how on what.
import { useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { gridTheme, publisherOf } from "./EvidenceFile.jsx";
import { fileUrl } from "./route.js";

const KIND = { official: "Official record", press: "News report", tracker: "Vote tracker", records: "Records request" };
const voteClass = (v) => (/^(yea|aye|yes)$/i.test(v) ? "yea" : /^(nay|no)$/i.test(v) ? "nay" : "other");

export default function RollCall({ people, issues, openPerson, stateName = "Utah" }) {
  const grid = useRef(null);
  const rows = useMemo(
    () =>
      people.flatMap((p) =>
        issues.flatMap((i) =>
          ((p.entries[i.id] || {}).did || []).map((r) => ({
            personId: p.id, issueId: i.id, person: p.name, office: p.office, party: p.party, issue: i.name,
            measure: r.measure, vote: r.vote, motion: r.motion, date: r.date, result: r.tally || "",
            holder: publisherOf(r.url), sourceType: r.kind, url: r.url,
          }))
        )
      ),
    [people, issues]
  );
  const [shown, setShown] = useState(rows.length);
  const [quick, setQuick] = useState("");
  const cols = useMemo(
    () => [
      {
        field: "person", headerName: "Person", filter: "agTextColumnFilter", width: 190, pinned: typeof innerWidth !== "undefined" && innerWidth > 760 ? "left" : null,
        cellRenderer: (p) => <button className="linkish" onClick={() => openPerson(p.data.personId, p.data.issueId)}>{p.value}</button>,
      },
      { field: "vote", headerName: "Vote", filter: true, width: 120, cellRenderer: (p) => <span className={`vote ${voteClass(p.value)}`}>{p.value}</span> },
      { field: "measure", headerName: "Measure", filter: true, width: 230 },
      { field: "motion", headerName: "Exact motion", flex: 2, minWidth: 280, wrapText: true, autoHeight: true, filter: "agTextColumnFilter" },
      { field: "issue", headerName: "Issue", filter: true, width: 190 },
      { field: "office", headerName: "Office", filter: "agTextColumnFilter", width: 230 },
      { field: "party", headerName: "Party", filter: true, width: 150 },
      { field: "date", headerName: "Date", width: 140 },
      { field: "result", headerName: "Result", width: 200 },
      { field: "sourceType", headerName: "Source type", filter: true, width: 150, valueFormatter: (p) => KIND[p.value] || p.value },
      { field: "url", headerName: "Record", width: 130, sortable: false, cellRenderer: (p) => <a href={fileUrl(p.value)} target="_blank" rel="noreferrer noopener">{p.data.holder}</a> },
    ],
    [openPerson]
  );
  const reset = () => {
    setQuick("");
    grid.current.api.setFilterModel(null);
    grid.current.api.setGridOption("quickFilterText", "");
    grid.current.api.applyColumnState({ defaultState: { sort: null } });
  };
  return (
    <section className="rollcall">
      <h2>Roll call</h2>
      <p className="rollcall-lede">
        Every vote and official action on file for {stateName}, {rows.length} in all. Sort any column, filter by measure or
        vote, or search. Each row links to the record. A vote on one motion is not a position on the whole issue, so
        read the exact motion.
      </p>
      <div className="evidence-table">
        <div className="evidence-tools">
          <label className="sr" htmlFor="rollcall-search">Search the roll call</label>
          <input id="rollcall-search" value={quick} placeholder="Search a name, a bill, a word in the motion"
            onChange={(e) => { setQuick(e.target.value); grid.current.api.setGridOption("quickFilterText", e.target.value); }} />
          <button type="button" className="copy" id="rollcall-reset" onClick={reset}>Reset</button>
          <span className="evidence-count" role="status">{shown} of {rows.length} rows</span>
        </div>
        <div className="evidence-grid">
          <AgGridReact ref={grid} theme={gridTheme} rowData={rows} columnDefs={cols}
            defaultColDef={{ sortable: true, resizable: true }} domLayout="autoHeight"
            initialState={{ sort: { sortModel: [{ colId: "measure", sort: "asc" }, { colId: "person", sort: "asc" }] } }}
            pagination paginationPageSize={25} paginationPageSizeSelector={[25, 50, 100]}
            onModelUpdated={(e) => setShown(e.api.getDisplayedRowCount())}
            overlayNoRowsTemplate="No rows match. Use Reset." />
        </div>
      </div>
    </section>
  );
}
