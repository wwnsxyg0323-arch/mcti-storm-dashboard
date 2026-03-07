export const FLOW_THRESHOLD_LPS = 25;

export interface FlowDailyRecord {
  date: Date;
  flowLps: number;
}

export interface FlowMonthlySummary {
  year: number;
  month: number; // 1-12
  avgFlowLps: number | null;
  overflowDays: number;
  overflowVolumeM3: number | null;
}

export interface FlowThresholdSummary {
  totalDays: number;
  daysAboveThreshold: number;
  percentAboveThreshold: number;
}

export interface FlowDataset {
  daily: FlowDailyRecord[];
  monthly: FlowMonthlySummary[];
  threshold: FlowThresholdSummary;
}

export type DeterminandCode = "SS" | "BOD" | "COD" | "Ammonia";

export interface WaterQualitySample {
  date: Date;
  determinand: DeterminandCode;
  rawDeterminantName: string;
  result: number;
  units: string;
}

export interface WaterQualityDataset {
  samples: WaterQualitySample[];
}

export type DataSourceKind = "default" | "uploaded-replace" | "uploaded-merge" | "mock";

export interface DataSourceStatus {
  flowSource: DataSourceKind;
  waterQualitySource: DataSourceKind;
  defaultFlowAvailable: boolean;
  defaultWaterQualityAvailable: boolean;
  lastUpdated: Date | null;
}

