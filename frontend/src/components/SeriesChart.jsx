import { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { fetchJson } from "../api";

export default function SeriesChart({ date, tz = "UTC" }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setData(null);
    setError(null);
    fetchJson(`/api/series?date=${date}&tz=${tz}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [date, tz]);

  const stats = useMemo(() => {
    if (!data || data.length === 0) return null;
    const paired = data.filter((d) => d.actual_mw != null && d.error != null);
    if (paired.length === 0) return null;
    const absErrors = paired.map((d) => Math.abs(d.error));
    const mae = absErrors.reduce((s, e) => s + e, 0) / paired.length;
    const bias = paired.reduce((s, d) => s + d.error, 0) / paired.length;
    const maxErr = paired.reduce((worst, d) =>
      Math.abs(d.error) > Math.abs(worst.error) ? d : worst
    );
    return { mae: Math.round(mae), bias: Math.round(bias), maxErr, n: paired.length };
  }, [data]);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="loading">Loading day analysis...</p>;
  if (data.length === 0) return <p className="loading">No data for {date}</p>;

  const chartData = data.map((d) => ({
    hour: new Date(d.start_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz }),
    forecast: d.forecast_mw,
    actual: d.actual_mw,
    error: d.error != null ? Math.round(d.error) : null,
  }));

  return (
    <>
      {stats && (
        <div className="day-stats">
          <div className="day-stat">
            <div className="day-stat-value">±{stats.mae.toLocaleString()} MW</div>
            <div className="day-stat-label">Day MAE</div>
          </div>
          <div className="day-stat">
            <div className="day-stat-value" style={{ color: stats.bias >= 0 ? "#b45309" : "#2563eb" }}>
              {stats.bias >= 0 ? "+" : ""}{stats.bias.toLocaleString()} MW
            </div>
            <div className="day-stat-label">Day Bias</div>
          </div>
          <div className="day-stat">
            <div className="day-stat-value" style={{ color: "#ef4444" }}>
              {Math.round(Math.abs(stats.maxErr.error)).toLocaleString()} MW
            </div>
            <div className="day-stat-label">Peak Error</div>
          </div>
        </div>
      )}

      <div className="chart-card">
        <div className="chart-header">
          <div>
            <div className="chart-title">Forecast vs Actual Generation</div>
            <div className="chart-subtitle">{date} — hourly intervals (UTC)</div>
          </div>
        </div>
        <div className="chart-body">
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
                label={{
                  value: "MW",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 11, fill: "#94a3b8" },
                }}
              />
              <Tooltip
                formatter={(v) => (v != null ? v.toLocaleString() + " MW" : "—")}
                contentStyle={{
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.04)",
                  fontSize: 13,
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 13 }}
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={false}
                name="Actual"
                strokeOpacity={0.7}
              />
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="#ef4444"
                strokeWidth={2}
                strokeOpacity={0.7}
                strokeDasharray="6 3"
                dot={false}
                name="Forecast"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-header">
          <div>
            <div className="chart-title">Forecast Error by Hour</div>
            <div className="chart-subtitle">
              Positive = over-forecast, Negative = under-forecast
            </div>
          </div>
        </div>
        <div className="chart-body">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} barCategoryGap="15%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
                label={{
                  value: "MW",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 11, fill: "#94a3b8" },
                }}
              />
              <Tooltip
                formatter={(v) => (v != null ? v.toLocaleString() + " MW" : "—")}
                contentStyle={{
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.04)",
                  fontSize: 13,
                }}
              />
              <ReferenceLine y={0} stroke="#64748b" strokeWidth={1} />
              <Bar dataKey="error" name="Error" radius={[3, 3, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.error != null && d.error >= 0 ? "#ef4444" : "#10b981"}
                    fillOpacity={0.55}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
