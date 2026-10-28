import { useState, useEffect, useMemo } from "react";
import { fetchJson } from "../api";

const ERROR_FILTERS = [
  { value: "all", label: "All intervals" },
  { value: "over", label: "Over-forecast only" },
  { value: "under", label: "Under-forecast only" },
  { value: "large", label: "Large errors (>1000 MW)" },
  { value: "small", label: "Small errors (<500 MW)" },
];

export default function DataTable({ date, tz = "UTC" }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [sortKey, setSortKey] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setData(null);
    setError(null);
    fetchJson(`/api/series?date=${date}&tz=${tz}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [date, tz]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let rows = data;

    if (filter === "over") rows = rows.filter((r) => r.error != null && r.error > 0);
    else if (filter === "under") rows = rows.filter((r) => r.error != null && r.error < 0);
    else if (filter === "large") rows = rows.filter((r) => r.error != null && Math.abs(r.error) > 1000);
    else if (filter === "small") rows = rows.filter((r) => r.error != null && Math.abs(r.error) < 500);

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => {
        const time = new Date(r.start_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz });
        return time.includes(q) || String(Math.round(r.forecast_mw)).includes(q) || String(Math.round(r.actual_mw)).includes(q);
      });
    }

    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        let va, vb;
        if (sortKey === "time") { va = a.start_time; vb = b.start_time; }
        else if (sortKey === "forecast") { va = a.forecast_mw ?? 0; vb = b.forecast_mw ?? 0; }
        else if (sortKey === "actual") { va = a.actual_mw ?? 0; vb = b.actual_mw ?? 0; }
        else if (sortKey === "error") { va = a.error ?? 0; vb = b.error ?? 0; }
        else if (sortKey === "absError") { va = Math.abs(a.error ?? 0); vb = Math.abs(b.error ?? 0); }
        else return 0;
        return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
      });
    }

    return rows;
  }, [data, filter, sortKey, sortAsc, search, tz]);

  function handleSort(key) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  }

  function sortIcon(key) {
    if (sortKey !== key) return " ↕";
    return sortAsc ? " ↑" : " ↓";
  }

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="loading">Loading data...</p>;
  if (data.length === 0) return <p className="loading">No data for {date}</p>;

  return (
    <div className="table-card">
      <div className="table-header">
        <div className="table-title">Interval Data — {date}</div>
      </div>
      <div className="table-filters">
        <select
          className="table-filter-select"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {ERROR_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <input
          className="table-search"
          type="text"
          placeholder="Search time or MW value..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="table-count">{filtered.length} of {data.length} intervals</span>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th className="sortable" onClick={() => handleSort("time")}>Time ({tz}){sortIcon("time")}</th>
              <th>Forecast Published</th>
              <th className="sortable" style={{ textAlign: "right" }} onClick={() => handleSort("forecast")}>Forecast{sortIcon("forecast")}</th>
              <th className="sortable" style={{ textAlign: "right" }} onClick={() => handleSort("actual")}>Actual{sortIcon("actual")}</th>
              <th className="sortable" style={{ textAlign: "right" }} onClick={() => handleSort("error")}>Error{sortIcon("error")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const err = r.error;
              const isLarge = err != null && Math.abs(err) > 2000;
              return (
                <tr key={r.start_time} className={isLarge ? "large-error" : ""}>
                  <td>{new Date(r.start_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz })}</td>
                  <td>{new Date(r.publish_time).toLocaleString("en-GB", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz })}</td>
                  <td className="num">{fmt(r.forecast_mw)} MW</td>
                  <td className="num">{fmt(r.actual_mw)} MW</td>
                  <td className={`num ${err > 0 ? "over-forecast" : err < 0 ? "under-forecast" : ""}`}>
                    {err != null ? (err > 0 ? "+" : "") + fmt(err) : "—"} MW
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: "center", color: "#94a3b8", padding: 20 }}>No intervals match filters</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function fmt(v) {
  if (v == null) return "—";
  return Math.round(v).toLocaleString();
}
