import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar } from "recharts";
import { useMemo } from "react";
import { useDataContext } from "../context/DataContext";
import { FLOW_THRESHOLD_LPS, FlowMonthlySummary } from "../types/data";

function formatMonthLabel(m: FlowMonthlySummary) {
  return `${m.year}-${String(m.month).padStart(2, "0")}`;
}

export function FlowAnalysisPage() {
  const { flow, loading, status } = useDataContext();

  const chartData = useMemo(
    () =>
      (flow?.monthly ?? []).map((m) => ({
        label: formatMonthLabel(m),
        avgFlowLps: m.avgFlowLps ?? 0,
        overflowDays: m.overflowDays,
        overflowVolumeM3: m.overflowVolumeM3 ?? 0,
        year: m.year,
        month: m.month,
      })),
    [flow]
  );

  return (
    <div className="page-container space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-50">Flow analysis</h1>
          <p className="text-sm text-slate-400">
            Explore monthly flows, overflow days, volumes and threshold exceedances
            based on the Springfield mean daily flow workbook or mock demo data.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-xs text-slate-400">
          <div className="flex gap-2">
            <span className="badge bg-slate-900 text-slate-300">
              Threshold: {FLOW_THRESHOLD_LPS} L/s
            </span>
            <span className="badge bg-slate-900 text-slate-300">
              Source: {status.flowSource === "default" ? "Default Excel" : status.flowSource === "mock" ? "Mock demo" : "Uploaded"}
            </span>
          </div>
          {loading && <span className="text-xs text-slate-500">Loading flow data…</span>}
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card min-h-[260px]">
          <div className="card-header">
            <span className="card-title">Monthly average flow</span>
            <span className="text-xs text-slate-400">L/s (illustrative)</span>
          </div>
          <div className="h-64">
            {chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                No flow data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b" }}
                    labelStyle={{ fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgFlowLps"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card min-h-[260px]">
          <div className="card-header">
            <span className="card-title">Monthly overflow days</span>
          </div>
          <div className="h-64">
            {chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                No flow data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b" }}
                    labelStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="overflowDays" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card min-h-[260px]">
          <div className="card-header">
            <span className="card-title">Monthly overflow volume (illustrative)</span>
          </div>
          <div className="h-64">
            {chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                No flow data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b" }}
                    labelFormatter={(label) => `Month: ${label}`}
                    formatter={(value: number) => [`${value.toFixed(0)} m³`, "Overflow volume"]}
                  />
                  <Bar dataKey="overflowVolumeM3" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card min-h-[260px]">
          <div className="card-header">
            <span className="card-title">
              Seasonal and threshold overview (summary)
            </span>
          </div>
          <div className="space-y-2 text-sm text-slate-300">
            <p>
              Detailed seasonal charts and year‑by‑year comparisons can be added here
              using the same underlying monthly dataset that powers the charts above.
            </p>
            <p className="text-xs text-slate-400">
              Overflow volumes are estimated illustratively from flows above {FLOW_THRESHOLD_LPS}{" "}
              L/s. For formal design work, use the original engineering calculations
              and workbook summaries.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}


