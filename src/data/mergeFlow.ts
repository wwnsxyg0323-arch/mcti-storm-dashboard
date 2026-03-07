import {
  FLOW_THRESHOLD_LPS,
  FlowDailyRecord,
  FlowDataset,
  FlowMonthlySummary,
  FlowThresholdSummary,
} from "../types/data";

function buildMonthlySummary(daily: FlowDailyRecord[]): FlowMonthlySummary[] {
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

export function mergeFlowDatasets(existing: FlowDataset, incoming: FlowDataset): FlowDataset {
  const byDate = new Map<string, FlowDailyRecord>();

  for (const rec of existing.daily) {
    const key = rec.date.toISOString().slice(0, 10);
    byDate.set(key, rec);
  }

  for (const rec of incoming.daily) {
    const key = rec.date.toISOString().slice(0, 10);
    if (!byDate.has(key)) {
      byDate.set(key, rec);
    }
  }

  const daily = Array.from(byDate.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );
  const monthly = buildMonthlySummary(daily);
  const threshold = buildThresholdSummary(daily);

  return { daily, monthly, threshold };
}

