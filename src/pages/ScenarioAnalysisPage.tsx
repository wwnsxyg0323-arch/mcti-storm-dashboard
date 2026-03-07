export function ScenarioAnalysisPage() {
  return (
    <div className="page-container space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-50">
          Scenario analysis
        </h1>
        <p className="text-sm text-slate-400">
          Simple exploratory tools to test future flow growth and indicative
          treatment performance.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-3">
          <div className="card-header">
            <span className="card-title">Future flow scenario</span>
          </div>
          <p className="text-sm text-slate-300">
            Apply a percentage increase to all flow values (for example +5%, +10%,
            +20%) to explore how often the 25 L/s threshold might be exceeded in
            future scenarios.
          </p>
          <ul className="list-disc pl-4 text-sm text-slate-300">
            <li>Baseline vs scenario comparison of days above 25 L/s.</li>
            <li>Estimated change in total overflow volume.</li>
            <li>Visualisation of monthly / yearly changes.</li>
          </ul>
        </div>

        <div className="card space-y-3">
          <div className="card-header">
            <span className="card-title">Treatment efficiency scenario</span>
          </div>
          <p className="text-sm text-slate-300">
            Enter assumed removal efficiencies for SS, BOD, COD and ammonia. The
            tool will estimate post‑treatment concentrations using:
          </p>
          <p className="rounded-md bg-slate-900 px-3 py-2 text-sm font-mono text-slate-200">
            estimated_output = input_value × (1 − removal_efficiency)
          </p>
          <p className="text-sm text-slate-300">
            Outputs will be compared with the reference permit limits to estimate
            what percentage of samples would theoretically meet the limits under
            the assumed removal rates.
          </p>
        </div>
      </section>
    </div>
  );
}

