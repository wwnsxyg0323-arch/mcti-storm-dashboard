import { useDataContext } from "../context/DataContext";

export function HomeOverviewPage() {
  const { flow, waterQuality, status } = useDataContext();

  const totalFlowRecords = flow?.daily.length ?? 0;
  const daysAboveThreshold = flow?.threshold.daysAboveThreshold ?? 0;
  const totalOverflowVolume =
    flow?.monthly.reduce((sum, m) => sum + (m.overflowVolumeM3 ?? 0), 0) ?? 0;
  const totalSamples = waterQuality?.samples.length ?? 0;
  const yearsCovered = (() => {
    const dates = flow?.daily.map((d) => d.date) ?? [];
    if (dates.length === 0) return 0;
    const years = dates.map((d) => d.getFullYear());
    return Math.max(...years) - Math.min(...years) + 1;
  })();

  return (
    <div className="page-container space-y-6">
      <section className="grid gap-4 lg:grid-cols-[2fr,3fr]">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Project overview</span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            This interactive dashboard supports a student engineering project on storm
            overflow treatment at Springfield sewage treatment works. It is designed
            to help explain flow conditions, overflow patterns, raw influent water
            quality and simple future/scenario analysis.
          </p>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Data source status</span>
          </div>
          <div className="grid gap-3 text-sm text-slate-300">
            <div className="flex items-center justify-between">
              <span>Default local Excel files</span>
              <span className="badge bg-slate-900 text-slate-300">
                Flow: {status.defaultFlowAvailable ? "found" : "not found"} · WQ:{" "}
                {status.defaultWaterQualityAvailable ? "found" : "not found"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Uploaded files</span>
              <span className="badge bg-slate-900 text-slate-300">
                Source: flow {status.flowSource}, water quality {status.waterQualitySource}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Current active dataset</span>
              <span className="badge bg-slate-900 text-slate-300">
                Summary and history shown on Data manager page
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <div className="card">
          <div className="kpi-label">Total flow records</div>
          <div className="kpi-value">
            {totalFlowRecords > 0 ? totalFlowRecords.toLocaleString() : "—"}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Count of daily flow values used for overflow analysis.
          </div>
        </div>
        <div className="card">
          <div className="kpi-label">Days above 25 L/s</div>
          <div className="kpi-value">
            {daysAboveThreshold > 0 ? daysAboveThreshold.toLocaleString() : "—"}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Number of days where the assumed overflow threshold is exceeded.
          </div>
        </div>
        <div className="card">
          <div className="kpi-label">Total overflow volume</div>
          <div className="kpi-value">
            {totalOverflowVolume > 0 ? totalOverflowVolume.toFixed(0) : "—"}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Sum of estimated overflow volume over the analysis period.
          </div>
        </div>
        <div className="card">
          <div className="kpi-label">WQ samples</div>
          <div className="kpi-value">
            {totalSamples > 0 ? totalSamples.toLocaleString() : "—"}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Number of raw influent water quality samples imported.
          </div>
        </div>
        <div className="card">
          <div className="kpi-label">Years covered</div>
          <div className="kpi-value">
            {yearsCovered > 0 ? yearsCovered : "—"}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Span of years present in the combined dataset.
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <span className="card-title">How to read this dashboard</span>
        </div>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-300">
          <li>
            Start on the <span className="font-semibold">Flow analysis</span> page
            to see how flows and overflow days vary by month, year and season.
          </li>
          <li>
            Use the <span className="font-semibold">Water quality</span> page to
            explore raw influent SS, BOD, COD and ammonia against reference permit
            values.
          </li>
          <li>
            Try simple{" "}
            <span className="font-semibold">scenario analysis</span> for future
            flow growth and indicative treatment removal efficiencies.
          </li>
          <li>
            Manage data sources on the{" "}
            <span className="font-semibold">Data manager</span> page – load the
            default Excel workbooks, add extra files in replace or merge mode, and
            reset back to the original dataset.
          </li>
        </ol>
      </section>
    </div>
  );
}

