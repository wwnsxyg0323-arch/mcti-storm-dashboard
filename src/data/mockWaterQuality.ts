import {
  DeterminandCode,
  WaterQualityDataset,
  WaterQualitySample,
} from "../types/data";

function makeSeries(
  determinand: DeterminandCode,
  rawName: string,
  base: number,
  variability: number,
  units: string
): WaterQualitySample[] {
  const samples: WaterQualitySample[] = [];
  const start = new Date(Date.UTC(2022, 0, 1));

  for (let i = 0; i < 40; i += 1) {
    const date = new Date(start.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    const noise = (Math.random() - 0.5) * variability;
    const value = Math.max(0, base + noise);
    samples.push({
      date,
      determinand,
      rawDeterminantName: rawName,
      result: value,
      units,
    });
  }

  return samples;
}

export function createMockWaterQualityDataset(): WaterQualityDataset {
  const ss = makeSeries("SS", "Suspended solids", 60, 25, "mg/L");
  const bod = makeSeries("BOD", "BOD (5 days, ATU)", 90, 40, "mg/L");
  const cod = makeSeries("COD", "COD (Cr)", 320, 80, "mg/L");
  const nh3 = makeSeries("Ammonia", "Ammoniacal nitrogen as N", 18, 8, "mg/L");

  return { samples: [...ss, ...bod, ...cod, ...nh3].sort((a, b) => a.date.getTime() - b.date.getTime()) };
}

