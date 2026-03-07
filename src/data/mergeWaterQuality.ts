import { WaterQualityDataset, WaterQualitySample } from "../types/data";

export function mergeWaterQualityDatasets(
  existing: WaterQualityDataset,
  incoming: WaterQualityDataset
): WaterQualityDataset {
  const byKey = new Map<string, WaterQualitySample>();

  const makeKey = (s: WaterQualitySample) => {
    const dateKey = s.date.toISOString();
    return `${dateKey}::${s.determinand}::${s.result}`;
  };

  for (const sample of existing.samples) {
    byKey.set(makeKey(sample), sample);
  }

  for (const sample of incoming.samples) {
    const key = makeKey(sample);
    if (!byKey.has(key)) {
      byKey.set(key, sample);
    }
  }

  const samples = Array.from(byKey.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  return { samples };
}

