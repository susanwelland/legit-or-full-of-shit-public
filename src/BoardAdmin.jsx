// The board's moderation queue, at /utah/board/admin. Not linked anywhere. Asks for the admin token
// and keeps it in this tab only (sessionStorage). Every action is checked by the server.
import { useEffect, useState } from "react";

const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const KEY = "lofs-board-admin";
const readToken = () => {
  try {
    return sessionStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
};

export default function BoardAdmin({ back }) {
  const [token, setToken] = useState(readToken);
  const [typed, setTyped] = useState("");
  const [queue, setQueue] = useState(null);
  const [msg, setMsg] = useState("");

  async function admin(path, method = "GET") {
    const r = await fetch(`${API}${path}`, { method, headers: { "X-Admin": token, "Content-Type": "application/json" }, body: method === "POST" ? "{}" : undefined });
    if (r.status === 404 && path.endsWith("/queue")) throw Object.assign(new Error("That token did not work."), { bad: true });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(b.error || `Failed (${r.status}).`);
    return b;
  }
  async function load() {
    try {
      const b = await admin("/api/admin/board/queue");
      setQueue(b.queue);
    } catch (e) {
      setMsg(e.message);
      if (e.bad) {
        try { sessionStorage.removeItem(KEY); } catch { /* nothing kept */ }
        setToken("");
      }
    }
  }
  useEffect(() => {
    document.title = "Board queue | Legit or Full of Shit";
    if (token) load();
  }, [token]);

  async function act(path, label) {
    setMsg("");
    try {
      await admin(path, "POST");
      setMsg(label);
      load();
    } catch (e) {
      setMsg(e.message);
    }
  }

  if (!token) {
    return (
      <section className="bd bd-admin">
        <h2 className="bd-title">Board queue</h2>
        <form
          className="bd-join"
          onSubmit={(e) => {
            e.preventDefault();
            try { sessionStorage.setItem(KEY, typed); } catch { /* this visit only */ }
            setToken(typed);
            setMsg("");
          }}
        >
          <label className="bd-label" htmlFor="bd-admin-token">Admin token</label>
          <input id="bd-admin-token" type="password" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} required />
          <button type="submit" className="panel-go bd-tap" id="bd-admin-go">Open the queue</button>
          {msg && <p className="call-note" role="alert">{msg}</p>}
        </form>
      </section>
    );
  }
  return (
    <section className="bd bd-admin">
      <h2 className="bd-title">Board queue</h2>
      <p className="bd-fine">
        Held comments first, then reported ones.{" "}
        <button type="button" className="linkish bd-tap-inline" onClick={load}>Refresh</button>{" "}
        <button type="button" className="linkish bd-tap-inline" onClick={() => { try { sessionStorage.removeItem(KEY); } catch { /* */ } setToken(""); setQueue(null); }}>Forget token</button>{" "}
        <button type="button" className="linkish bd-tap-inline" onClick={back}>Board</button>
      </p>
      {msg && <p className="call-note" role="status" id="bd-admin-msg">{msg}</p>}
      {!queue && <p className="empty">Loading…</p>}
      {queue && queue.length === 0 && <p className="empty" id="bd-admin-empty">Nothing waiting.</p>}
      {queue && queue.length > 0 && (
        <ul className="bd-queue">
          {queue.map((c) => (
            <li key={c.id} className="bd-q-item" id={`bd-q-${c.id}`}>
              <p className="bd-fine">
                <strong>{c.status}</strong>
                {c.reports ? ` · ${c.reports} ${c.reports === 1 ? "report" : "reports"}` : ""} · @{c.username} ({c.user_approved} approved
                {c.shadowbanned ? ", shadowbanned" : ""}{c.banned ? ", banned" : ""}) · {c.slug} · {new Date(c.created_at).toLocaleString()}
              </p>
              <p className="bd-c-body">{c.body}</p>
              <div className="bd-q-actions">
                <button type="button" className="bd-btn" id={`bd-approve-${c.id}`} onClick={() => act(`/api/admin/board/comments/${c.id}/approve`, "Approved.")}>Approve</button>
                <button type="button" className="bd-btn" id={`bd-hide-${c.id}`} onClick={() => act(`/api/admin/board/comments/${c.id}/hide`, "Hidden.")}>Hide</button>
                <button type="button" className="bd-btn" id={`bd-delete-${c.id}`} onClick={() => act(`/api/admin/board/comments/${c.id}/delete`, "Deleted.")}>Delete</button>
                <button type="button" className="bd-btn" id={`bd-shadow-${c.id}`} onClick={() => act(`/api/admin/board/users/${c.user_id}/shadowban`, `Shadowbanned @${c.username}.`)}>Shadowban user</button>
                <button type="button" className="bd-btn warn" id={`bd-ban-${c.id}`} onClick={() => act(`/api/admin/board/users/${c.user_id}/ban`, `Banned @${c.username}.`)}>Ban user</button>
                {(c.banned || c.shadowbanned) && (
                  <button type="button" className="bd-btn" id={`bd-unban-${c.id}`} onClick={() => act(`/api/admin/board/users/${c.user_id}/unban`, `Lifted for @${c.username}.`)}>Unban</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
