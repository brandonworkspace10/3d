import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import type { JobRecord, JobStatus } from "./types";
import { config } from "./config";

const JOBS_DIR = join(process.cwd(), config.storagePath);

function jobPath(jobId: string): string {
  return join(JOBS_DIR, jobId, "metadata.json");
}

export async function ensureJobsDir(): Promise<void> {
  await mkdir(JOBS_DIR, { recursive: true });
}

export async function createJob(jobId: string): Promise<JobRecord> {
  await ensureJobsDir();
  const record: JobRecord = {
    jobId,
    status: "queued",
    progress: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await mkdir(join(JOBS_DIR, jobId), { recursive: true });
  await writeFile(jobPath(jobId), JSON.stringify(record, null, 2), "utf-8");
  return record;
}

export async function getJob(jobId: string): Promise<JobRecord | null> {
  try {
    const raw = await readFile(jobPath(jobId), "utf-8");
    return JSON.parse(raw) as JobRecord;
  } catch {
    return null;
  }
}

export async function updateJob(
  jobId: string,
  updates: Partial<Pick<JobRecord, "status" | "progress" | "outputs" | "error" | "inputImageCount" | "logs">>
): Promise<JobRecord | null> {
  const current = await getJob(jobId);
  if (!current) return null;
  const next: JobRecord = {
    ...current,
    ...updates,
    updatedAt: Date.now(),
  };
  await writeFile(jobPath(jobId), JSON.stringify(next, null, 2), "utf-8");
  return next;
}

export async function appendJobLog(jobId: string, line: string): Promise<void> {
  const job = await getJob(jobId);
  if (!job) return;
  const logs = [...(job.logs ?? []), `[${new Date().toISOString()}] ${line}`];
  await updateJob(jobId, { logs });
}

export function getJobDir(jobId: string): string {
  return join(JOBS_DIR, jobId);
}
