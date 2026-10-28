import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { fetchJson } from "../api";

export default function DailyChart({ tz = "UTC", month = "2026-01" }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setData(null);
    fetchJson(`/api/daily?tz=${tz}&month=${month}`).then(setData).catch((e) => setError(e.message));
  }, [tz, month]);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="loading">Loading charts...</p>;

  const avgMae = data.reduce((s, d) => s + (d.mae || 0), 0) / data.length;

  const chartData = data.map((d) => ({
    date: d.date.slice(5),
    fullDate: d.date,
    mae: Math.round(d.mae),
    bias: Math.round(d.bias),
  }));

  return (
    <>
      <div className="section-title">Daily Performance</div>

      <div className="chart-card">
        <div className="chart-header">
          <div>
            <div className="chart-title">Daily Forecast Error (MAE)</div>
            <div className="chart-subtitle">
              Average: {Math.round(avgMae).toLocaleString()} MW — lower is better
            </div>
          </div>
        </div>
        <div className="chart-body">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
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
                formatter={(v) => [v.toLocaleString() + " MW", "MAE"]}
                labelFormatter={(l) => "2026-" + l}
                contentStyle={{
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.04)",
                  fontSize: 13,
                }}
              />
              <ReferenceLine
                y={avgMae}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                label={{
                  value: "avg",
                  position: "right",
                  style: { fontSize: 11, fill: "#94a3b8" },
                }}
              />
              <Bar dataKey="mae" radius={[4, 4, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.mae > avgMae * 1.3 ? "#ef4444" : "#10b981"}
                    fillOpacity={0.55}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-header">
          <div>
            <div className="chart-title">Daily Forecast Bias</div>
            <div className="chart-subtitle">
              Positive = over-forecast, Negative = under-forecast
            </div>
          </div>
        </div>
        <div className="chart-body">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
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
                formatter={(v) => [v.toLocaleString() + " MW", "Bias"]}
                labelFormatter={(l) => "2026-" + l}
                contentStyle={{
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.04)",
                  fontSize: 13,
                }}
              />
              <ReferenceLine y={0} stroke="#64748b" strokeWidth={1} />
              <Bar dataKey="bias" radius={[4, 4, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.bias >= 0 ? "#10b981" : "#ef4444"}
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
