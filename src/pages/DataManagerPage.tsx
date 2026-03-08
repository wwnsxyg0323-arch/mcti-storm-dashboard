import { FormEvent, useState } from "react";
import { useDataContext } from "../context/DataContext";

type FileKind = "flow" | "water-quality";
type UploadMode = "replace" | "merge";

export function DataManagerPage() {
  const { flow, waterQuality, status, uploadFlowFile, uploadWaterQualityFile, resetToDefaults, loading, errorMessages } =
    useDataContext();

  const [file, setFile] = useState<File | null>(null);
  const [fileKind, setFileKind] = useState<FileKind>("flow");
  const [mode, setMode] = useState<UploadMode>("merge");
  const [uploading, setUploading] = useState(false);
  const [lastUploadInfo, setLastUploadInfo] = useState<string | null>(null);

  const onSubmit = async (evt: FormEvent) => {
    evt.preventDefault();
    if (!file) {
      setLastUploadInfo("Please choose an Excel file first.");
      return;
    }
    setUploading(true);
    setLastUploadInfo(null);
    try {
      if (fileKind === "flow") {
        await uploadFlowFile(file, mode);
      } else {
        await uploadWaterQualityFile(file, mode);
      }
      setLastUploadInfo(
        `${file.name} loaded as ${fileKind === "flow" ? "flow" : "water quality"} data (${mode}).`
      );
    } finally {
      setUploading(false);
    }
  };

  const handleReset = async () => {
    setUploading(true);
    setLastUploadInfo("Resetting to default local Excel files…");
    try {
      await resetToDefaults();
      setLastUploadInfo("Reset complete. Using default local Excel files or mock demo data.");
    } finally {
      setUploading(false);
    }
  };

  const totalFlowDays = flow?.daily.length ?? 0;
  const totalSamples = waterQuality?.samples.length ?? 0;

  return (
    <div className="page-container space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-50">
          Data upload &amp; manager
        </h1>
        <p className="text-sm text-slate-400">
          Manage the default Springfield Excel workbooks and any additional files you
          upload in this session. Choose whether to replace or merge into the current
          dataset.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[3fr,2fr]">
        <form className="card space-y-4" onSubmit={onSubmit}>
          <div className="card-header">
            <span className="card-title">Upload area</span>
          </div>
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-10 text-center text-sm text-slate-300"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                setFile(e.dataTransfer.files[0]);
              }
            }}
          >
            <p className="font-medium text-slate-200">
              Drag and drop Excel files here
            </p>
            <p className="text-xs text-slate-400">
              Or use the file picker below to select a workbook.
            </p>
            <div className="mt-2 flex flex-col items-center gap-1">
              <label className="cursor-pointer rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700">
                Choose file
                <input
                  type="file"
                  accept=".xlsx"
                  className="sr-only"
                  aria-label="Choose file"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setFile(f);
                  }}
                />
              </label>
              <span className="text-xs text-slate-400">
                {file ? file.name : "No file chosen"}
              </span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 text-sm text-slate-300">
              <p className="font-medium text-slate-200">File type</p>
              <div className="flex gap-3 text-xs">
                <label className="inline-flex items-center gap-1">
                  <input
                    type="radio"
                    className="h-3 w-3"
                    checked={fileKind === "flow"}
                    onChange={() => setFileKind("flow")}
                  />
                  <span>Flow data</span>
                </label>
                <label className="inline-flex items-center gap-1">
                  <input
                    type="radio"
                    className="h-3 w-3"
                    checked={fileKind === "water-quality"}
                    onChange={() => setFileKind("water-quality")}
                  />
                  <span>Water quality data</span>
                </label>
              </div>
            </div>

            <div className="space-y-2 text-sm text-slate-300">
              <p className="font-medium text-slate-200">Upload action</p>
              <div className="flex gap-3 text-xs">
                <label className="inline-flex items-center gap-1">
                  <input
                    type="radio"
                    className="h-3 w-3"
                    checked={mode === "replace"}
                    onChange={() => setMode("replace")}
                  />
                  <span>Replace current dataset</span>
                </label>
                <label className="inline-flex items-center gap-1">
                  <input
                    type="radio"
                    className="h-3 w-3"
                    checked={mode === "merge"}
                    onChange={() => setMode("merge")}
                  />
                  <span>Merge into current dataset</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="submit"
              disabled={uploading || loading}
              className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? "Processing…" : "Upload and apply"}
            </button>
            {lastUploadInfo && (
              <span className="text-xs text-slate-400">{lastUploadInfo}</span>
            )}
          </div>
        </form>

        <div className="card space-y-4">
          <div className="card-header">
            <span className="card-title">Session summary</span>
          </div>
          <div className="space-y-2 text-sm text-slate-300">
            <div className="flex items-center justify-between">
              <span>Default Excel files</span>
              <span className="badge bg-slate-900 text-slate-300">
                Flow: {status.defaultFlowAvailable ? "found" : "not found"} · WQ:{" "}
                {status.defaultWaterQualityAvailable ? "found" : "not found"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Current flow dataset</span>
              <span className="badge bg-slate-900 text-slate-300">
                {totalFlowDays} daily records · source {status.flowSource}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Current WQ dataset</span>
              <span className="badge bg-slate-900 text-slate-300">
                {totalSamples} samples · source {status.waterQualitySource}
              </span>
            </div>
            {status.lastUpdated && (
              <div className="text-xs text-slate-500">
                Last updated: {status.lastUpdated.toLocaleString()}
              </div>
            )}
          </div>

          {errorMessages.length > 0 && (
            <div className="rounded-md border border-slate-600/80 bg-slate-800/50 px-3 py-2 text-xs text-slate-300">
              <p className="font-medium text-slate-200">Data source status</p>
              <ul className="mt-1 list-disc pl-4">
                {errorMessages.slice(-3).map((msg, idx) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <li key={idx}>{msg}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <span className="card-title">Reset to default dataset</span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-300">
            Restore the dashboard so that it only uses the two original Springfield
            Excel workbooks from the local{" "}
            <span className="font-mono text-xs text-slate-200">public/data</span>{" "}
            folder. If those files are not available, the app will fall back to mock
            demo data.
          </p>
          <button
            type="button"
            disabled={uploading || loading}
            onClick={handleReset}
            className="inline-flex items-center rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reset dataset
          </button>
        </div>
      </section>
    </div>
  );
}


