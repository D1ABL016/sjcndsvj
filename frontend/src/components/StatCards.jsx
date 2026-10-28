import { useState, useEffect } from "react";
import { fetchJson } from "../api";

function monthLabel(m) {
  const [y, mo] = m.split("-");
  const d = new Date(+y, +mo - 1);
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function generateReport(summary, worst, daily, month, tz) {
  const label = monthLabel(month);
  const accuracy = summary.nmae != null ? ((1 - summary.nmae) * 100).toFixed(1) : "N/A";
  const mae = summary.mae != null ? Math.round(summary.mae).toLocaleString() : "N/A";
  const bias = summary.bias != null ? Math.round(summary.bias) : null;
  const biasStr = bias != null ? (bias >= 0 ? "+" : "") + bias.toLocaleString() + " MW" : "N/A";
  const rmse = summary.rmse != null ? Math.round(summary.rmse).toLocaleString() : "N/A";
  const mape = summary.mape != null ? (summary.mape * 100).toFixed(1) + "%" : "N/A";

  const dailyRows = (daily || []).map((d) => `
    <tr>
      <td>${d.date}</td>
      <td style="text-align:right">${d.mae != null ? Math.round(d.mae).toLocaleString() : "—"}</td>
      <td style="text-align:right">${d.bias != null ? Math.round(d.bias).toLocaleString() : "—"}</td>
      <td style="text-align:right">${d.rmse != null ? Math.round(d.rmse).toLocaleString() : "—"}</td>
      <td style="text-align:right">${d.n || 0}</td>
    </tr>`).join("");

  const worstRows = (worst || []).map((w, i) => {
    const dt = new Date(w.start_time);
    return `
    <tr>
      <td>${i + 1}</td>
      <td>${dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: tz })} ${dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz })} (${tz})</td>
      <td style="text-align:right">${Math.round(w.forecast_mw).toLocaleString()}</td>
      <td style="text-align:right">${Math.round(w.actual_mw).toLocaleString()}</td>
      <td style="text-align:right;color:${w.error > 0 ? "#b45309" : "#2563eb"}">${w.error > 0 ? "+" : ""}${Math.round(w.error).toLocaleString()}</td>
    </tr>`;
  }).join("");

  const now = new Date().toISOString().slice(0, 16).replace("T", " ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Wind Forecast Report — ${label}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #0f172a; line-height: 1.6; padding: 40px; max-width: 900px; margin: 0 auto; -webkit-font-smoothing: antialiased; }
  h1 { font-size: 1.6rem; font-weight: 700; margin-bottom: 4px; }
  .subtitle { color: #64748b; font-size: 0.9rem; margin-bottom: 32px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
  .kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; }
  .kpi-value { font-size: 1.8rem; font-weight: 700; }
  .kpi-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-top: 4px; }
  h2 { font-size: 1.1rem; font-weight: 600; margin: 28px 0 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-bottom: 24px; }
  th { text-align: left; padding: 10px 12px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; border-bottom: 2px solid #e2e8f0; }
  td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
  tr:hover { background: #f8fafc; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 0.75rem; }
  @media print { body { padding: 20px; } .kpi-grid { grid-template-columns: repeat(4, 1fr); } }
  @media (max-width: 600px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
</head>
<body>
  <h1>Wind Forecast Intelligence Report</h1>
  <p class="subtitle">Elexon Day-Ahead Forecast Analysis — ${label} · Generated ${now} UTC</p>

  <div class="kpi-grid">
    <div class="kpi">
      <div class="kpi-value">${accuracy}%</div>
      <div class="kpi-label">Forecast Accuracy</div>
    </div>
    <div class="kpi">
      <div class="kpi-value">±${mae} MW</div>
      <div class="kpi-label">Average Error (MAE)</div>
    </div>
    <div class="kpi">
      <div class="kpi-value">${biasStr}</div>
      <div class="kpi-label">Forecast Bias</div>
    </div>
    <div class="kpi">
      <div class="kpi-value">${summary.n}/${summary.expected}</div>
      <div class="kpi-label">Data Coverage</div>
    </div>
  </div>

  <h2>Additional Metrics</h2>
  <table>
    <tr><td><strong>RMSE</strong></td><td>${rmse} MW</td><td style="color:#64748b">Penalises large errors more heavily</td></tr>
    <tr><td><strong>MAPE</strong></td><td>${mape}</td><td style="color:#64748b">Mean absolute % error (actual ≥ 100 MW)</td></tr>
    <tr><td><strong>Bias direction</strong></td><td>${bias != null && bias >= 0 ? "Over-forecast" : "Under-forecast"}</td><td style="color:#64748b">${biasStr} average deviation</td></tr>
  </table>

  <h2>Largest Forecast Misses</h2>
  <table>
    <thead><tr><th>#</th><th>Date &amp; Time</th><th style="text-align:right">Forecast MW</th><th style="text-align:right">Actual MW</th><th style="text-align:right">Error MW</th></tr></thead>
    <tbody>${worstRows || "<tr><td colspan='5'>No data</td></tr>"}</tbody>
  </table>

  <h2>Daily Performance</h2>
  <table>
    <thead><tr><th>Date</th><th style="text-align:right">MAE (MW)</th><th style="text-align:right">Bias (MW)</th><th style="text-align:right">RMSE (MW)</th><th style="text-align:right">Intervals</th></tr></thead>
    <tbody>${dailyRows || "<tr><td colspan='5'>No data</td></tr>"}</tbody>
  </table>

  <div class="footer">
    <p>Source: Elexon BMRS (WINDFOR day-ahead forecast vs FUELHH wind actuals). Operationally metered wind only — embedded and unmetered wind excluded.</p>
    <p>Cutoff: 09:00 UTC day-ahead. Forecast accuracy = 1 − nMAE (MAE ÷ mean actual).</p>
  </div>
</body>
</html>`;
}

function fmtDate(isoStr, tzName) {
  const dt = new Date(isoStr);
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: tzName });
}

function fmtTime(isoStr, tzName) {
  const dt = new Date(isoStr);
  return dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tzName });
}

export default function StatCards({ tz = "UTC", month = "2026-01" }) {
  const [summary, setSummary] = useState(null);
  const [worst, setWorst] = useState(null);
  const [daily, setDaily] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setSummary(null);
    setWorst(null);
    setDaily(null);
    setError(null);
    Promise.all([
      fetchJson(`/api/summary?tz=${tz}&month=${month}`),
      fetchJson(`/api/worst?n=5&tz=${tz}&month=${month}`),
      fetchJson(`/api/daily?tz=${tz}&month=${month}`),
    ])
      .then(([s, w, d]) => {
        setSummary(s);
        setWorst(w);
        setDaily(d);
      })
      .catch((e) => setError(e.message));
  }, [tz, month]);

  if (error) return <p className="error">{error}</p>;
  if (!summary) return <p className="loading">Loading dashboard...</p>;

  const accuracy = summary.nmae != null ? ((1 - summary.nmae) * 100).toFixed(1) : "—";
  const maeVal = summary.mae != null ? Math.round(summary.mae).toLocaleString() : "—";
  const biasVal = summary.bias != null ? Math.round(summary.bias) : null;
  const biasDisplay = biasVal != null
    ? (biasVal >= 0 ? "+" : "") + biasVal.toLocaleString()
    : "—";
  const biasDir = biasVal != null && biasVal >= 0 ? "over" : "under";

  const bestDay = daily && daily.length > 0
    ? daily.reduce((best, d) => (d.mae != null && (best == null || d.mae < best.mae) ? d : best), null)
    : null;
  const worstDay = daily && daily.length > 0
    ? daily.reduce((w, d) => (d.mae != null && (w == null || d.mae > w.mae) ? d : w), null)
    : null;

  function handleExport() {
    const html = generateReport(summary, worst, daily, month, tz);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wind-forecast-report-${month}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="export-row">
        <button className="export-btn" onClick={handleExport}>
          Export Report
        </button>
      </div>

      <div className="hero-metrics">
        <div className="hero-card accent-blue">
          <div className="hero-label">Forecast Accuracy</div>
          <div className="hero-value">
            {accuracy}<span className="unit">%</span>
          </div>
          <div className="hero-subtitle">
            Based on {summary.n.toLocaleString()} matched intervals
          </div>
          <div className="hero-indicator good">Operationally metered wind</div>
        </div>

        <div className="hero-card accent-amber">
          <div className="hero-label">Average Error</div>
          <div className="hero-value">
            ±{maeVal}<span className="unit"> MW</span>
          </div>
          <div className="hero-subtitle">Mean absolute deviation from actual</div>
          {summary.rmse != null && (
            <div className="hero-subtitle">
              RMSE: {Math.round(summary.rmse).toLocaleString()} MW
            </div>
          )}
        </div>

        <div className="hero-card accent-sky">
          <div className="hero-label">Forecast Bias</div>
          <div className="hero-value">
            {biasDisplay}<span className="unit"> MW</span>
          </div>
          <div className="hero-subtitle">
            {biasDir === "over"
              ? "Forecasts tend to over-predict generation"
              : "Forecasts tend to under-predict generation"}
          </div>
          <div className={`hero-indicator ${biasDir === "over" ? "up" : "down"}`}>
            {biasDir === "over" ? "↑ Over-forecast" : "↓ Under-forecast"}
          </div>
        </div>

        <div className="hero-card accent-green">
          <div className="hero-label">Data Coverage</div>
          <div className="hero-value">
            {summary.n}<span className="unit">/{summary.expected}</span>
          </div>
          <div className="hero-subtitle">
            {((summary.n / summary.expected) * 100).toFixed(1)}% of expected intervals matched
          </div>
          {bestDay && (
            <div className="hero-subtitle">
              Best day: {bestDay.date.slice(5)} ({Math.round(bestDay.mae)} MW)
            </div>
          )}
        </div>
      </div>

      {worst && worst.length > 0 && (
        <div className="two-col">
          <div className="findings-card">
            <div className="findings-header">
              <div className="findings-title">Largest Forecast Misses</div>
            </div>
            <ul className="findings-list">
              {worst.map((w, i) => {
                const dateStr = fmtDate(w.start_time, tz);
                const timeStr = fmtTime(w.start_time, tz);
                const errMW = Math.round(w.error);
                const isOver = w.error > 0;
                return (
                  <li key={w.start_time} className="finding-item">
                    <div className="finding-left">
                      <div className="finding-rank">{i + 1}</div>
                      <div>
                        <div className="finding-time">{dateStr} at {timeStr} ({tz})</div>
                        <div className="finding-date">
                          Forecast: {Math.round(w.forecast_mw).toLocaleString()} MW
                          {" → "}Actual: {Math.round(w.actual_mw).toLocaleString()} MW
                        </div>
                      </div>
                    </div>
                    <div className={`finding-error ${isOver ? "over" : "under"}`}>
                      {isOver ? "+" : ""}{errMW.toLocaleString()} MW
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="findings-card">
            <div className="findings-header">
              <div className="findings-title">Performance Snapshot</div>
            </div>
            <ul className="findings-list">
              {bestDay && (
                <li className="finding-item">
                  <div className="finding-left">
                    <div className="finding-rank" style={{ background: "#d1fae5", color: "#047857" }}>✓</div>
                    <div>
                      <div className="finding-time">Best Day: {bestDay.date}</div>
                      <div className="finding-date">Lowest average error across all intervals</div>
                    </div>
                  </div>
                  <div className="finding-error" style={{ color: "#047857" }}>
                    {Math.round(bestDay.mae).toLocaleString()} MW
                  </div>
                </li>
              )}
              {worstDay && (
                <li className="finding-item">
                  <div className="finding-left">
                    <div className="finding-rank">!</div>
                    <div>
                      <div className="finding-time">Worst Day: {worstDay.date}</div>
                      <div className="finding-date">Highest average error across all intervals</div>
                    </div>
                  </div>
                  <div className="finding-error over">
                    {Math.round(worstDay.mae).toLocaleString()} MW
                  </div>
                </li>
              )}
              <li className="finding-item">
                <div className="finding-left">
                  <div className="finding-rank" style={{ background: "#dbeafe", color: "#2563eb" }}>%</div>
                  <div>
                    <div className="finding-time">
                      MAPE: {summary.mape != null ? (summary.mape * 100).toFixed(1) + "%" : "—"}
                    </div>
                    <div className="finding-date">Mean absolute percentage error (actual ≥ 100 MW)</div>
                  </div>
                </div>
              </li>
              <li className="finding-item">
                <div className="finding-left">
                  <div className="finding-rank" style={{ background: "#fef3c7", color: "#b45309" }}>σ</div>
                  <div>
                    <div className="finding-time">
                      RMSE: {summary.rmse != null ? Math.round(summary.rmse).toLocaleString() + " MW" : "—"}
                    </div>
                    <div className="finding-date">Penalises large errors more heavily than MAE</div>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
