/**
 * Job queue. Uses BullMQ + Redis when REDIS_URL is set;
 * otherwise falls back to in-memory processing for local dev.
 */
import { config } from "./config";
import { runPipeline } from "./pipeline";
import type { PipelineInput } from "./pipeline";

let useBullMQ = false;
let addJobFn: ((jobId: string, input: PipelineInput) => Promise<void>) | null = null;

async function initQueue(): Promise<void> {
  if (addJobFn) return;

  if (config.redisUrl) {
    try {
      const { Queue } = await import("bullmq");
      const { default: IORedis } = await import("ioredis");

      const connection = new IORedis(config.redisUrl, {
        maxRetriesPerRequest: null,
      });

      const queue = new Queue("reconstruction", {
        connection,
        defaultJobOptions: {
          attempts: 2,
          backoff: { type: "exponential", delay: 5000 },
          removeOnComplete: { count: 100 },
        },
      });

      addJobFn = async (jobId: string, input: PipelineInput) => {
        await queue.add("run", { jobId, input }, { jobId });
      };
      useBullMQ = true;
    } catch (e) {
      console.warn("[reconstruction] BullMQ init failed, using in-memory fallback:", e);
    }
  }

  if (!addJobFn) {
    addJobFn = async (jobId: string, input: PipelineInput) => {
      runPipeline(jobId, input).catch((err) => {
        console.error(`[reconstruction] Job ${jobId} failed:`, err);
      });
    };
  }
}

export async function enqueueReconstructionJob(
  jobId: string,
  input: PipelineInput
): Promise<void> {
  await initQueue();
  if (addJobFn) await addJobFn(jobId, input);
}

export function isUsingBullMQ(): boolean {
  return useBullMQ;
}
