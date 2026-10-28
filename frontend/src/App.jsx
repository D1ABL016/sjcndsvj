import { useState } from "react";
import StatCards from "./components/StatCards";
import DailyChart from "./components/DailyChart";
import SeriesChart from "./components/SeriesChart";
import DataTable from "./components/DataTable";

const TABS = ["Overview", "Day Analysis", "Data Explorer"];

const TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "US/Eastern", label: "US Eastern" },
  { value: "US/Central", label: "US Central" },
  { value: "US/Pacific", label: "US Pacific" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

export default function App() {
  const [tab, setTab] = useState("Overview");
  const [date, setDate] = useState("2026-01-15");
  const [tz, setTz] = useState("UTC");
  const [month, setMonth] = useState("2026-01");
  const [monthError, setMonthError] = useState(null);

  function handleMonthChange(e) {
    const val = e.target.value;
    if (val !== "2026-01") {
      setMonthError("Data not populated yet — only January 2026 is available.");
      return;
    }
    setMonthError(null);
    setMonth(val);
  }

  return (
    <div className="app">
      <header className="dashboard-header">
        <div className="header-top">
          <div className="header-icon">⚡</div>
          <h1>Wind Forecast Intelligence</h1>
        </div>
        <div className="header-meta">
          <span className="header-badge">
            <span className="dot"></span>
            Elexon BMRS
          </span>
          <span className="header-badge">Day-Ahead Analysis</span>
          <select
            className="tz-select"
            value={tz}
            onChange={(e) => setTz(e.target.value)}
          >
            {TIMEZONES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t}
            className={t === tab ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>

      <main>
        {tab === "Overview" && (
          <>
            <div className="overview-controls">
              <div className="month-picker-row">
                <label>Analysis month</label>
                <input
                  type="month"
                  value={month}
                  onChange={handleMonthChange}
                />
                {monthError && <span className="month-error">{monthError}</span>}
              </div>
            </div>
            <StatCards tz={tz} month={month} />
            <DailyChart tz={tz} month={month} />
          </>
        )}
        {tab === "Day Analysis" && (
          <>
            <div className="date-picker-row">
              <label>Delivery date</label>
              <input
                type="date"
                value={date}
                min="2026-01-02"
                max="2026-01-31"
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <SeriesChart date={date} tz={tz} />
          </>
        )}
        {tab === "Data Explorer" && (
          <>
            <div className="date-picker-row">
              <label>Delivery date</label>
              <input
                type="date"
                value={date}
                min="2026-01-02"
                max="2026-01-31"
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <DataTable date={date} tz={tz} />
          </>
        )}
      </main>
    </div>
  );
}
