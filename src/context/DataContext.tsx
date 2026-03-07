import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DataSourceKind,
  DataSourceStatus,
  FlowDataset,
  WaterQualityDataset,
} from "../types/data";
import { parseFlowArrayBuffer } from "../parsers/flowParser";
import { parseWaterQualityArrayBuffer } from "../parsers/waterQualityParser";
import { createMockFlowDataset } from "../data/mockFlow";
import { createMockWaterQualityDataset } from "../data/mockWaterQuality";
import { mergeFlowDatasets } from "../data/mergeFlow";
import { mergeWaterQualityDatasets } from "../data/mergeWaterQuality";

const FLOW_DEFAULT_URL = "/data/Springfield mean daily flow 20-24.xlsx";
const WQ_DEFAULT_URL = "/data/Springfield raw WQ data 20-25.xlsx";

interface DataContextValue {
  loading: boolean;
  errorMessages: string[];
  flow: FlowDataset | null;
  waterQuality: WaterQualityDataset | null;
  status: DataSourceStatus;
  uploadFlowFile: (file: File, mode: "replace" | "merge") => Promise<void>;
  uploadWaterQualityFile: (file: File, mode: "replace" | "merge") => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

async function safeFetchArrayBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return res.arrayBuffer();
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [flow, setFlow] = useState<FlowDataset | null>(null);
  const [waterQuality, setWaterQuality] = useState<WaterQualityDataset | null>(null);
  const [status, setStatus] = useState<DataSourceStatus>({
    flowSource: "mock",
    waterQualitySource: "mock",
    defaultFlowAvailable: false,
    defaultWaterQualityAvailable: false,
    lastUpdated: null,
  });

  const loadDefaults = useCallback(async () => {
    setLoading(true);
    const errors: string[] = [];

    let flowDataset: FlowDataset | null = null;
    let flowSource: DataSourceKind = "mock";
    let defaultFlowAvailable = false;

    try {
      const buffer = await safeFetchArrayBuffer(FLOW_DEFAULT_URL);
      defaultFlowAvailable = true;
      flowDataset = await parseFlowArrayBuffer(buffer);
      flowSource = "default";
    } catch {
      errors.push(
        "Default flow workbook could not be loaded from public/data; using mock demo flow data instead."
      );
      flowDataset = createMockFlowDataset();
      flowSource = "mock";
    }

    let wqDataset: WaterQualityDataset | null = null;
    let wqSource: DataSourceKind = "mock";
    let defaultWqAvailable = false;

    try {
      const buffer = await safeFetchArrayBuffer(WQ_DEFAULT_URL);
      defaultWqAvailable = true;
      wqDataset = await parseWaterQualityArrayBuffer(buffer);
      wqSource = "default";
    } catch {
      errors.push(
        "Default water quality workbook could not be loaded from public/data; using mock demo water quality data instead."
      );
      wqDataset = createMockWaterQualityDataset();
      wqSource = "mock";
    }

    setFlow(flowDataset);
    setWaterQuality(wqDataset);
    setStatus({
      flowSource: flowSource,
      waterQualitySource: wqSource,
      defaultFlowAvailable,
      defaultWaterQualityAvailable: defaultWqAvailable,
      lastUpdated: new Date(),
    });
    setErrorMessages(errors);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await loadDefaults();
      if (cancelled) return;
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [loadDefaults]);

  const uploadFlowFile = useCallback(
    async (file: File, mode: "replace" | "merge") => {
      setLoading(true);
      try {
        const buffer = await file.arrayBuffer();
        const incoming = await parseFlowArrayBuffer(buffer);
        setFlow((current) => {
          if (!current || mode === "replace") {
            return incoming;
          }
          return mergeFlowDatasets(current, incoming);
        });
        setStatus((prev) => ({
          ...prev,
          flowSource: mode === "replace" ? "uploaded-replace" : "uploaded-merge",
          lastUpdated: new Date(),
        }));
      } catch (err) {
        setErrorMessages((prev) => [
          ...prev,
          `Error parsing uploaded flow file: ${
            err instanceof Error ? err.message : String(err)
          }`,
        ]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const uploadWaterQualityFile = useCallback(
    async (file: File, mode: "replace" | "merge") => {
      setLoading(true);
      try {
        const buffer = await file.arrayBuffer();
        const incoming = await parseWaterQualityArrayBuffer(buffer);
        setWaterQuality((current) => {
          if (!current || mode === "replace") {
            return incoming;
          }
          return mergeWaterQualityDatasets(current, incoming);
        });
        setStatus((prev) => ({
          ...prev,
          waterQualitySource: mode === "replace" ? "uploaded-replace" : "uploaded-merge",
          lastUpdated: new Date(),
        }));
      } catch (err) {
        setErrorMessages((prev) => [
          ...prev,
          `Error parsing uploaded water quality file: ${
            err instanceof Error ? err.message : String(err)
          }`,
        ]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const resetToDefaults = useCallback(async () => {
    await loadDefaults();
  }, [loadDefaults]);

  const value = useMemo(
    () => ({
      loading,
      errorMessages,
      flow,
      waterQuality,
      status,
      uploadFlowFile,
      uploadWaterQualityFile,
      resetToDefaults,
    }),
    [loading, errorMessages, flow, waterQuality, status, uploadFlowFile, uploadWaterQualityFile, resetToDefaults]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useDataContext(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error("useDataContext must be used within a DataProvider");
  }
  return ctx;
}

