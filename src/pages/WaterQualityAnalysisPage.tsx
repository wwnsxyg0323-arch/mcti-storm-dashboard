import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import { useDataContext } from "../context/DataContext";
import type { DeterminandCode } from "../types/data";
import { pearsonCorrelation } from "../utils/correlation";

const PARAMETERS: DeterminandCode[] = ["SS", "BOD", "COD", "Ammonia"];

const PERMIT_LIMITS: Record<DeterminandCode, number> = {
  BOD: 100,
  COD: 340,
  SS: 65,
  Ammonia: 20,
};

const PARAM_LABELS: Record<DeterminandCode, string> = {
  SS: "Suspended solids",
  BOD: "BOD",
  COD: "COD",
  Ammonia: "Ammonia",
};

function dateToDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getYears(samples: { date: Date }[]): number[] {
  const set = new Set(samples.map((s) => s.date.getFullYear()));
  return Array.from(set).sort((a, b) => a - b);
}

function computeMedian(values: number[]): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function WaterQualityAnalysisPage() {
  const { waterQuality, loading, status } = useDataContext();
  const [selectedParam, setSelectedParam] = useState<DeterminandCode>("BOD");
  const [selectedYear, setSelectedYear] = useState<number | "all">("all");

  const samples = waterQuality?.samples ?? [];

  const years = useMemo(() => getYears(samples), [samples]);

  const samplesForParam = useMemo(
    () => samples.filter((s) => s.determinand === selectedParam),
    [samples, selectedParam]
  );

  const filteredSamples = useMemo(() => {
    if (selectedYear === "all") return samplesForParam;
    return samplesForParam.filter((s) => s.date.getFullYear() === selectedYear);
  }, [samplesForParam, selectedYear]);

  const timeSeriesData = useMemo(
    () =>
      [...filteredSamples]
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map((s) => ({
          dateStr: dateToDayKey(s.date),
          date: s.date,
          value: s.result,
        })),
    [filteredSamples]
  );

  const histogramBins = useMemo(() => {
    const values = filteredSamples.map((s) => s.result).filter(Number.isFinite);
    if (values.length === 0) return [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binCount = Math.min(12, Math.max(5, Math.ceil(values.length / 10)));
    const step = (max - min) / binCount || 1;
    const bins: { range: string; count: number; min: number; max: number }[] = [];
    for (let i = 0; i < binCount; i++) {
      const lo = min + i * step;
      const hi = i === binCount - 1 ? max + 0.001 : min + (i + 1) * step;
      const count = values.filter((v) => v >= lo && v < hi).length;
      bins.push({
        range: `${lo.toFixed(0)}–${hi.toFixed(0)}`,
        count,
        min: lo,
        max: hi,
      });
    }
    return bins;
  }, [filteredSamples]);

  const yearlySummary = useMemo(() => {
    const byYear = new Map<
      number,
      { year: number; mean: number; median: number; max: number; count: number }
    >();
    for (const s of filteredSamples) {
      const y = s.date.getFullYear();
      if (!byYear.has(y)) byYear.set(y, { year: y, mean: 0, median: 0, max: 0, count: 0 });
      const row = byYear.get(y)!;
      row.count += 1;
      row.max = Math.max(row.max, s.result);
    }
    for (const row of byYear.values()) {
      const vals = filteredSamples
        .filter((s) => s.date.getFullYear() === row.year)
        .map((s) => s.result);
      row.mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      row.median = computeMedian(vals);
    }
    return Array.from(byYear.values()).sort((a, b) => a.year - b.year);
  }, [filteredSamples]);

  const permitStats = useMemo(() => {
    const limit = PERMIT_LIMITS[selectedParam];
    const total = filteredSamples.length;
    const exceedance = filteredSamples.filter((s) => s.result > limit).length;
    const pct = total > 0 ? (exceedance / total) * 100 : 0;
    return { limit, total, exceedance, pct };
  }, [selectedParam, filteredSamples]);

  const correlationMatrix = useMemo(() => {
    const byDate = new Map<
      string,
      { SS?: number; BOD?: number; COD?: number; Ammonia?: number }
    >();
    for (const s of samples) {
      const key = dateToDayKey(s.date);
      if (!byDate.has(key)) byDate.set(key, {});
      const row = byDate.get(key)!;
      row[s.determinand] = s.result;
    }
    const params: DeterminandCode[] = ["SS", "BOD", "COD", "Ammonia"];
    const matrix: Record<string, Record<string, number>> = {};
    for (const p1 of params) {
      matrix[p1] = {};
      for (const p2 of params) {
        const paired = Array.from(byDate.values())
          .filter((row) => row[p1] != null && row[p2] != null)
          .map((row) => [row[p1]!, row[p2]!] as [number, number]);
        const x = paired.map((a) => a[0]);
        const y = paired.map((a) => a[1]);
        const r = pearsonCorrelation(x, y);
        matrix[p1][p2] = p1 === p2 ? 1 : r;
      }
    }
    return matrix;
  }, [samples]);

  const hasData = samples.length > 0;

  return (
    <div className="page-container space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-50">
            Water quality analysis
          </h1>
          <p className="text-sm text-slate-400">
            Explore raw influent / pre‑primary water quality for SS, BOD, COD and
            ammonia, including time‑series, distributions and comparison to
            reference permit values.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-[11px] text-slate-400">
          <span className="badge bg-slate-900 text-slate-300">
            {status.waterQualitySource === "default"
              ? "Default Excel"
              : status.waterQualitySource === "mock"
                ? "Mock demo"
                : "Uploaded"}
          </span>
        </div>
      </header>

      {/* Parameter and year filters */}
      <section className="card">
        <div className="card-header">
          <span className="card-title">Filters</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-400">Parameter</span>
            <div className="flex gap-2">
              {PARAMETERS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelectedParam(p)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                    selectedParam === p
                      ? "border-brand-500 bg-brand-600 text-white"
                      : "border-slate-700 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-400">Year</span>
            <select
              value={selectedYear}
              onChange={(e) =>
                setSelectedYear(
                  e.target.value === "all" ? "all" : parseInt(e.target.value, 10)
                )
              }
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200"
            >
              <option value="all">All years</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          {loading && (
            <span className="text-xs text-slate-500">Loading water quality data…</span>
          )}
        </div>
      </section>

      {!hasData ? (
        <section className="card">
          <p className="text-sm text-slate-400">
            No water quality samples loaded. Use the Data manager to load the default
            workbook or upload a file.
          </p>
        </section>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-[2fr,1fr]">
            <div className="card min-h-[280px]">
              <div className="card-header">
                <span className="card-title">Time‑series — {PARAM_LABELS[selectedParam]}</span>
                <span className="text-xs text-slate-400">
                  {filteredSamples.length} samples
                  {selectedYear !== "all" ? ` in ${selectedYear}` : ""}
                </span>
              </div>
              <div className="h-64">
                {timeSeriesData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    No data for selected parameter/year.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeSeriesData}>
                      <XAxis
                        dataKey="dateStr"
                        tick={{ fontSize: 10 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          borderColor: "#334155",
                        }}
                        labelFormatter={(label) => String(label)}
                        formatter={(value: number) => [
                          `${Number(value).toFixed(2)} mg/L`,
                          selectedParam,
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#22c55e"
                        strokeWidth={2}
                        dot={{ r: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="card min-h-[280px]">
              <div className="card-header">
                <span className="card-title">Distribution — {selectedParam}</span>
              </div>
              <div className="h-64">
                {histogramBins.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    No data for selected parameter/year.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={histogramBins} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                      <XAxis dataKey="range" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          borderColor: "#334155",
                        }}
                        formatter={(value: number) => [value, "Samples"]}
                      />
                      <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="card min-h-[260px]">
              <div className="card-header">
                <span className="card-title">Yearly summaries — {selectedParam}</span>
              </div>
              {yearlySummary.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-sm text-slate-500">
                  No data for selected parameter/year.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 text-left text-slate-400">
                        <th className="py-2 pr-4 font-medium">Year</th>
                        <th className="py-2 pr-4 font-medium">Mean</th>
                        <th className="py-2 pr-4 font-medium">Median</th>
                        <th className="py-2 font-medium">Max</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-200">
                      {yearlySummary.map((row) => (
                        <tr key={row.year} className="border-b border-slate-800">
                          <td className="py-1.5 pr-4">{row.year}</td>
                          <td className="py-1.5 pr-4">
                            {Number.isFinite(row.mean) ? row.mean.toFixed(2) : "—"}
                          </td>
                          <td className="py-1.5 pr-4">
                            {Number.isFinite(row.median) ? row.median.toFixed(2) : "—"}
                          </td>
                          <td className="py-1.5">
                            {Number.isFinite(row.max) ? row.max.toFixed(2) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card min-h-[260px]">
              <div className="card-header">
                <span className="card-title">Correlation (aligned by sample date)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-left text-slate-400">
                      <th className="py-2 pr-2 font-medium"></th>
                      {PARAMETERS.map((p) => (
                        <th key={p} className="py-2 px-2 font-medium">
                          {p}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-slate-200">
                    {PARAMETERS.map((p1) => (
                      <tr key={p1} className="border-b border-slate-800">
                        <td className="py-1.5 pr-2 font-medium text-slate-300">{p1}</td>
                        {PARAMETERS.map((p2) => {
                          const r = correlationMatrix[p1]?.[p2];
                          const isNaNR = r == null || Number.isNaN(r);
                          const n = Math.round((r ?? 0) * 100) / 100;
                          const intensity =
                            !isNaNR && p1 !== p2
                              ? Math.min(1, (Math.abs(r!) + 1) / 2)
                              : 0.5;
                          const bgStyle =
                            p1 !== p2 && !isNaNR
                              ? r! > 0
                                ? `rgba(34, 197, 94, ${intensity})`
                                : `rgba(239, 68, 68, ${intensity})`
                              : undefined;
                          return (
                            <td
                              key={p2}
                              className={`py-1.5 px-2 text-center ${p1 === p2 ? "bg-slate-700" : ""}`}
                              style={bgStyle ? { backgroundColor: bgStyle } : undefined}
                            >
                              {isNaNR ? "—" : n.toFixed(2)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Pearson r between parameters on dates where both were sampled.
              </p>
            </div>
          </section>

          <section className="card">
            <div className="card-header">
              <span className="card-title">Permit reference comparison</span>
            </div>
            <p className="mb-4 text-xs text-slate-400">
              Reference limits (raw influent comparison only; not discharge compliance):
              BOD 100 mg/L, COD 340 mg/L, Suspended solids 65 mg/L, Ammonia 20 mg/L.
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {PARAMETERS.map((p) => {
                const limit = PERMIT_LIMITS[p];
                const forParam = samples.filter((s) => s.determinand === p);
                const total = forParam.length;
                const exceedance = forParam.filter((s) => s.result > limit).length;
                const pct = total > 0 ? (exceedance / total) * 100 : 0;
                const isSelected = p === selectedParam;
                return (
                  <div
                    key={p}
                    className={`rounded-lg border p-3 ${
                      isSelected
                        ? "border-brand-500 bg-slate-800/80"
                        : "border-slate-700 bg-slate-900/60"
                    }`}
                  >
                    <div className="kpi-label">{PARAM_LABELS[p]} (limit {limit} mg/L)</div>
                    <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1 text-sm text-slate-200">
                      <span>Samples:</span>
                      <span className="text-right">{total}</span>
                      <span>Exceedances:</span>
                      <span className="text-right">{exceedance}</span>
                      <span>Exceedance %:</span>
                      <span className="text-right">{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
