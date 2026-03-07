import * as XLSX from "xlsx";
import {
  DeterminandCode,
  WaterQualityDataset,
  WaterQualitySample,
} from "../types/data";

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const millis = value * 24 * 60 * 60 * 1000;
    return new Date(excelEpoch.getTime() + millis);
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

function normalise(text: string): string {
  return text.toLowerCase().trim();
}

function mapDeterminant(raw: string): DeterminandCode | null {
  const n = normalise(raw);
  if (n.includes("suspended") || n.startsWith("ss")) return "SS";
  if (n.includes("bod")) return "BOD";
  if (n.includes("ammon")) return "Ammonia";
  if (n.includes("cod")) return "COD";
  return null;
}

function findColumnIndex(headers: string[], candidates: string[]): number | null {
  const lower = headers.map((h) => h.toLowerCase());
  for (const cand of candidates) {
    const idx = lower.findIndex((h) => h.includes(cand));
    if (idx !== -1) return idx;
  }
  return null;
}

function sheetToSamples(sheet: XLSX.WorkSheet): WaterQualitySample[] {
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:A1");
  const headerRow = range.s.r;

  const headers: string[] = [];
  for (let c = range.s.c; c <= range.e.c; c += 1) {
    const addr = XLSX.utils.encode_cell({ r: headerRow, c });
    const cell = sheet[addr];
    headers.push(cell ? String(cell.v).trim() : "");
  }

  const dateCol = findColumnIndex(headers, ["date", "sample"]);
  const nameCol = findColumnIndex(headers, ["determin", "det", "parameter", "name"]);
  const resultCol = findColumnIndex(headers, ["result", "value", "conc"]);
  const unitsCol = findColumnIndex(headers, ["unit"]);

  if (dateCol == null || nameCol == null || resultCol == null) {
    return [];
  }

  const samples: WaterQualitySample[] = [];

  for (let r = headerRow + 1; r <= range.e.r; r += 1) {
    const dateCell = sheet[XLSX.utils.encode_cell({ r, c: dateCol })];
    const nameCell = sheet[XLSX.utils.encode_cell({ r, c: nameCol })];
    const resultCell = sheet[XLSX.utils.encode_cell({ r, c: resultCol })];
    const unitsCell =
      unitsCol != null ? sheet[XLSX.utils.encode_cell({ r, c: unitsCol })] : undefined;

    const rawName = nameCell?.v != null ? String(nameCell.v) : "";
    const determinand = mapDeterminant(rawName);
    if (!determinand) continue;

    const date = toDate(dateCell?.v);
    const result = toNumber(resultCell?.v);
    if (!date || result == null) continue;

    samples.push({
      date,
      determinand,
      rawDeterminantName: rawName,
      result,
      units: unitsCell?.v != null ? String(unitsCell.v) : "",
    });
  }

  return samples.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function parseWaterQualityWorkbook(workbook: XLSX.WorkBook): WaterQualityDataset {
  const candidates = workbook.SheetNames.filter((name) =>
    name.toLowerCase().includes("raw")
  );
  const sheetName = candidates[0] ?? workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const samples = sheetToSamples(sheet);
  return { samples };
}

export async function parseWaterQualityArrayBuffer(
  buffer: ArrayBuffer
): Promise<WaterQualityDataset> {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  return parseWaterQualityWorkbook(workbook);
}

