#!/usr/bin/env npx ts-node
/**
 * Reconstruction queue worker. Run alongside the Next.js server when using BullMQ.
 * Usage: npx ts-node scripts/reconstruction-worker.ts
 * Requires: REDIS_URL
 */
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { config } from "../lib/reconstruction/config";
import { runPipeline } from "../lib/reconstruction/pipeline";
import type { PipelineInput } from "../lib/reconstruction/pipeline";

if (!config.redisUrl) {
  console.error("REDIS_URL is required for the worker. Set it in .env");
  process.exit(1);
}

const connection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null });

const worker = new Worker(
  "reconstruction",
  async (job) => {
    const { jobId, input } = job.data as { jobId: string; input: PipelineInput };
    await runPipeline(jobId, input);
  },
  {
    connection,
    concurrency: config.queueConcurrency,
  }
);

worker.on("completed", (job) => {
  console.log(`[reconstruction] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[reconstruction] Job ${job?.id} failed:`, err);
});

console.log("[reconstruction] Worker started. Waiting for jobs...");
