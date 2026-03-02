/**
 * Structured logging for SF3D pipeline.
 */
import { appendFile } from "fs/promises";
import { join } from "path";

export type LogStep =
  | "fetch_images"
  | "preprocess"
  | "sf3d_run"
  | "validate"
  | "copy_output";

export interface LogEntry {
  request_id: string;
  step: LogStep;
  duration_ms: number;
  backend?: "MPS" | "CPU";
  image_count?: number;
  timeout_sec?: number;
  error?: string;
  [key: string]: unknown;
}

export function createSf3dLogger(
  requestId: string,
  logDir: string
): {
  log: (entry: Omit<LogEntry, "request_id">) => Promise<void>;
  logStep: (step: LogStep, durationMs: number, extra?: Record<string, unknown>) => Promise<void>;
} {
  const logPath = join(logDir, "inference.log");

  const log = async (entry: Omit<LogEntry, "request_id">) => {
    const full = { ...entry, request_id: requestId } as LogEntry;
    const line = JSON.stringify({ ...full, timestamp: Date.now() }) + "\n";
    console.log("[sf3d]", line.trim());
    try {
      await appendFile(logPath, line);
    } catch {
      // ignore fs errors
    }
  };

  const logStep = async (
    step: LogStep,
    durationMs: number,
    extra?: Record<string, unknown>
  ) => {
    await log({
      step,
      duration_ms: durationMs,
      backend: process.env.SF3D_USE_CPU === "1" ? "CPU" : "MPS",
      ...extra,
    });
  };

  return { log, logStep };
}
