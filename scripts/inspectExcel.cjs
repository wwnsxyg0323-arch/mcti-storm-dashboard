const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const DATA_DIR = path.resolve(__dirname, "..", "public", "data");
const FLOW_FILE = "Springfield mean daily flow 20-24.xlsx";
const WQ_FILE = "Springfield raw WQ data 20-25.xlsx";

function fileInfo(filePath) {
  if (!fs.existsSync(filePath)) {
    return { exists: false };
  }
  const stats = fs.statSync(filePath);
  return {
    exists: true,
    sizeBytes: stats.size,
    modified: stats.mtime,
  };
}

function inspectWorkbook(fullPath, label) {
  const info = fileInfo(fullPath);
  if (!info.exists) {
    console.log(`\n[${label}]`);
    console.log(`  Status: MISSING at ${fullPath}`);
    return;
  }

  console.log(`\n[${label}]`);
  console.log(`  Path: ${fullPath}`);
  console.log(`  Size: ${info.sizeBytes} bytes`);
  console.log(`  Last modified: ${info.modified.toISOString()}`);

  const workbook = XLSX.readFile(fullPath, { cellDates: true });
  const sheetNames = workbook.SheetNames;

  console.log(`  Sheets (${sheetNames.length}): ${sheetNames.join(", ")}`);

  sheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:A1");
    const headerRow = range.s.r;

    const headers = [];
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c });
      const cell = sheet[cellAddress];
      headers.push(cell ? String(cell.v).trim() : "");
    }

    console.log(`  - Sheet "${sheetName}" header row:`);
    console.log(`      ${headers.join(" | ")}`);

    const firstDataRow = headerRow + 1;
    const sampleRows = [];
    const maxSamples = 3;

    for (let r = firstDataRow; r <= Math.min(firstDataRow + maxSamples - 1, range.e.r); r += 1) {
      const rowValues = [];
      for (let c = range.s.c; c <= range.e.c; c += 1) {
        const cellAddress = XLSX.utils.encode_cell({ r, c });
        const cell = sheet[cellAddress];
        rowValues.push(cell ? cell.v : "");
      }
      sampleRows.push(rowValues);
    }

    if (sampleRows.length > 0) {
      console.log(`      Sample rows (up to ${maxSamples}):`);
      sampleRows.forEach((row, idx) => {
        console.log(`        [${idx + 1}] ${row.join(" | ")}`);
      });
    } else {
      console.log("      (No data rows detected under header)");
    }
  });
}

console.log("=== Springfield Excel Workbook Structure Report ===");
console.log(`Base data directory: ${DATA_DIR}`);

const flowPath = path.join(DATA_DIR, FLOW_FILE);
const wqPath = path.join(DATA_DIR, WQ_FILE);

inspectWorkbook(flowPath, "Flow workbook");
inspectWorkbook(wqPath, "Water quality workbook");

console.log("\nNote:");
console.log(
  "  - If any workbook is reported as MISSING, please place the original files in public/data with the exact filenames above and re-run `npm run inspect:excel`."
);

