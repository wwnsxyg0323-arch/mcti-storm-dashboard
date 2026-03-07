import * as XLSX from "xlsx";
import {
  FLOW_THRESHOLD_LPS,
  FlowDailyRecord,
  FlowDataset,
  FlowMonthlySummary,
  FlowThresholdSummary,
} from "../types/data";

/** Convert Excel serial date (1 = 1900-01-01, 25569 = 1970-01-01) to JS Date. */
function excelSerialToDate(value: number): Date {
  const utcMs = (value - 25569) * 24 * 60 * 60 * 1000;
  return new Date(utcMs);
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return excelSerialToDate(value);
  }
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const n = Number(value.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function getSheetHeaders(sheet: XLSX.WorkSheet): string[] {
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:A1");
  const headerRow = range.s.r;
  const headers: string[] = [];
  for (let c = range.s.c; c <= range.e.c; c += 1) {
    const addr = XLSX.utils.encode_cell({ r: headerRow, c });
    const cell = sheet[addr];
    headers.push(cell ? String(cell.v).trim() : "");
  }
  return headers;
}

function findColumnIndex(headers: string[], candidates: string[]): number | null {
  const lower = headers.map((h) => h.toLowerCase());
  for (const cand of candidates) {
    const idx = lower.findIndex((h) => h.includes(cand) || h === cand);
    if (idx !== -1) return idx;
  }
  return null;
}

/** Score how many daily-data headers this sheet has (Date, Mean, Month, Overflow, Overflow Amount). */
function scoreDailyHeaders(headers: string[]): number {
  const lower = headers.map((h) => h.toLowerCase());
  let score = 0;
  if (lower.some((h) => h.includes("date"))) score += 2;
  if (lower.some((h) => h.includes("mean"))) score += 2;
  if (lower.some((h) => h.includes("month"))) score += 1;
  if (lower.some((h) => h.includes("overflow") && !h.includes("amount"))) score += 1;
  if (lower.some((h) => h.includes("overflow") && h.includes("amount"))) score += 1;
  return score;
}

/** Detect the sheet that contains daily flow data by checking for Date, Mean, Month, Overflow, Overflow Amount. Prefer Sheet1 when scores tie. */
function findDailySheet(workbook: XLSX.WorkBook): string | null {
  let bestName: string | null = null;
  let bestScore = 0;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const headers = getSheetHeaders(sheet);
    const score = scoreDailyHeaders(headers);
    if (score > bestScore) {
      bestScore = score;
      bestName = sheetName;
    } else if (score === bestScore && sheetName === "Sheet1") {
      bestName = sheetName;
    }
  }

  if (bestScore < 2) return null;
  return bestName;
}

function sheetToDailyRecords(sheet: XLSX.WorkSheet): FlowDailyRecord[] {
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:A1");
  const headerRow = range.s.r;

  const headers = getSheetHeaders(sheet);

  const dateCol = findColumnIndex(headers, ["date"]);
  const flowCol = findColumnIndex(headers, ["mean", "flow", "l/s", "lps", "discharge"]);
  const metricCol = findColumnIndex(headers, ["metric"]);

  if (dateCol == null || flowCol == null) {
    return [];
  }

  const records: FlowDailyRecord[] = [];
  for (let r = headerRow + 1; r <= range.e.r; r += 1) {
    const metricCell = metricCol != null ? sheet[XLSX.utils.encode_cell({ r, c: metricCol })] : null;
    if (metricCell?.v != null && String(metricCell.v).trim() !== "") {
      continue;
    }

    const dateCell = sheet[XLSX.utils.encode_cell({ r, c: dateCol })];
    const flowCell = sheet[XLSX.utils.encode_cell({ r, c: flowCol })];

    const date = toDate(dateCell?.v);
    const flowLps = toNumber(flowCell?.v);

    if (!date || flowLps == null) continue;

    records.push({ date, flowLps });
  }

  return records.sort((a, b) => a.date.getTime() - b.date.getTime());
}

function buildMonthlySummaryFromDaily(daily: FlowDailyRecord[]): FlowMonthlySummary[] {
  const byKey = new Map<string, { year: number; month: number; flows: number[] }>();

  for (const rec of daily) {
    const year = rec.date.getFullYear();
    const month = rec.date.getMonth() + 1;
    const key = `${year}-${month}`;
    let bucket = byKey.get(key);
    if (!bucket) {
      bucket = { year, month, flows: [] };
      byKey.set(key, bucket);
    }
    bucket.flows.push(rec.flowLps);
  }

  const monthly: FlowMonthlySummary[] = [];
  for (const bucket of byKey.values()) {
    const { year, month, flows } = bucket;
    const overflowDays = flows.filter((f) => f > FLOW_THRESHOLD_LPS).length;
    const avgFlowLps =
      flows.length > 0 ? flows.reduce((sum, f) => sum + f, 0) / flows.length : null;

    const overflowVolumeM3 =
      flows.length > 0
        ? flows
            .filter((f) => f > FLOW_THRESHOLD_LPS)
            .reduce((sum, f) => {
              const excess = f - FLOW_THRESHOLD_LPS;
              const m3PerDay = (excess * 86400) / 1000;
              return sum + m3PerDay;
            }, 0)
        : null;

    monthly.push({
      year,
      month,
      avgFlowLps,
      overflowDays,
      overflowVolumeM3,
    });
  }

  return monthly.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
}

function buildThresholdSummary(daily: FlowDailyRecord[]): FlowThresholdSummary {
  const totalDays = daily.length;
  const daysAboveThreshold = daily.filter((d) => d.flowLps > FLOW_THRESHOLD_LPS).length;
  const percentAboveThreshold =
    totalDays > 0 ? (daysAboveThreshold / totalDays) * 100 : 0;

  return {
    totalDays,
    daysAboveThreshold,
    percentAboveThreshold,
  };
}

/** Parse "2020-01" style row label into year and month (1-12). */
function parseRowLabelYearMonth(label: unknown): { year: number; month: number } | null {
  const s = typeof label === "string" ? label.trim() : String(label ?? "");
  const match = /^(\d{4})-(\d{1,2})$/.exec(s);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

/** Build monthly chart data from summary sheets when daily parsing returns no records. */
function buildMonthlyFromSummarySheets(workbook: XLSX.WorkBook): FlowMonthlySummary[] | null {
  const avgSheet = workbook.Sheets["Average Monthly Flow"];
  const overflowDaysSheet = workbook.Sheets["Overflow Days per Month"];
  const overflowVolumeSheet = workbook.Sheets["Monthly Overflow Volume"];

  if (!avgSheet || !overflowDaysSheet || !overflowVolumeSheet) {
    return null;
  }

  const getColumnIndex = (sheet: XLSX.WorkSheet, ...candidates: string[]) => {
    const headers = getSheetHeaders(sheet);
    return findColumnIndex(headers, candidates);
  };

  const range = XLSX.utils.decode_range(avgSheet["!ref"] || "A1:A1");
  const headerRow = range.s.r;

  const labelColAvg = getColumnIndex(avgSheet, "row labels");
  const valueColAvg = getColumnIndex(avgSheet, "average of mean", "average", "mean");
  const labelColDays = getColumnIndex(overflowDaysSheet, "row labels");
  const valueColDays = getColumnIndex(overflowDaysSheet, "sum of overflow", "overflow", "sum");
  const labelColVol = getColumnIndex(overflowVolumeSheet, "row labels");
  const valueColVol = getColumnIndex(overflowVolumeSheet, "sum of overflow amount", "overflow amount", "amount", "sum");

  if (
    labelColAvg == null || valueColAvg == null ||
    labelColDays == null || valueColDays == null ||
    labelColVol == null || valueColVol == null
  ) {
    return null;
  }

  const byKey = new Map<
    string,
    { year: number; month: number; avgFlowLps: number | null; overflowDays: number; overflowVolumeM3: number | null }
  >();

  const rangeDays = XLSX.utils.decode_range(overflowDaysSheet["!ref"] || "A1:A1");
  const rangeVol = XLSX.utils.decode_range(overflowVolumeSheet["!ref"] || "A1:A1");

  for (let r = headerRow + 1; r <= range.e.r; r += 1) {
    const labelCell = avgSheet[XLSX.utils.encode_cell({ r, c: labelColAvg })];
    const ym = parseRowLabelYearMonth(labelCell?.v);
    if (!ym) continue;

    const key = `${ym.year}-${ym.month}`;
    const valAvg = toNumber(avgSheet[XLSX.utils.encode_cell({ r, c: valueColAvg })]?.v);

    let overflowDays = 0;
    if (r <= rangeDays.e.r) {
      const daysCell = overflowDaysSheet[XLSX.utils.encode_cell({ r, c: valueColDays })];
      overflowDays = toNumber(daysCell?.v) ?? 0;
    }

    let overflowVolumeM3: number | null = null;
    if (r <= rangeVol.e.r) {
      const volCell = overflowVolumeSheet[XLSX.utils.encode_cell({ r, c: valueColVol })];
      overflowVolumeM3 = toNumber(volCell?.v);
    }

    byKey.set(key, {
      year: ym.year,
      month: ym.month,
      avgFlowLps: valAvg,
      overflowDays,
      overflowVolumeM3,
    });
  }

  return Array.from(byKey.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
}

export function parseFlowWorkbook(workbook: XLSX.WorkBook): FlowDataset {
  const dailySheetName = findDailySheet(workbook);
  let daily: FlowDailyRecord[] = [];
  let monthly: FlowMonthlySummary[];
  let threshold: FlowThresholdSummary;

  if (dailySheetName) {
    const sheet = workbook.Sheets[dailySheetName];
    daily = sheetToDailyRecords(sheet);
  }

  if (daily.length > 0) {
    monthly = buildMonthlySummaryFromDaily(daily);
    threshold = buildThresholdSummary(daily);
  } else {
    const fallbackMonthly = buildMonthlyFromSummarySheets(workbook);
    if (fallbackMonthly && fallbackMonthly.length > 0) {
      monthly = fallbackMonthly;
      const totalOverflowDays = monthly.reduce((s, m) => s + m.overflowDays, 0);
      threshold = {
        totalDays: 0,
        daysAboveThreshold: totalOverflowDays,
        percentAboveThreshold: 0,
      };
    } else {
      monthly = [];
      threshold = { totalDays: 0, daysAboveThreshold: 0, percentAboveThreshold: 0 };
    }
  }

  return { daily, monthly, threshold };
}

export async function parseFlowArrayBuffer(buffer: ArrayBuffer): Promise<FlowDataset> {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  return parseFlowWorkbook(workbook);
}
