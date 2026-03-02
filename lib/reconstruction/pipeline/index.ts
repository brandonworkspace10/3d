import { readFile } from "fs/promises";
import { join } from "path";
import { validateImages } from "./validate";
import { preprocessImages } from "./preprocess";
import { runStubAdapter } from "./adapters/stub";
import {
  createJob,
  getJobDir,
  updateJob,
  appendJobLog,
} from "../job-store";
import { config } from "../config";

export type PipelineInput =
  | { type: "buffers"; buffers: Buffer[] }
  | { type: "paths"; paths: string[] }; // absolute paths to images

export async function runPipeline(jobId: string, input: PipelineInput): Promise<void> {
  const jobDir = getJobDir(jobId);

  try {
    await updateJob(jobId, { status: "running", progress: 5 });
    await appendJobLog(jobId, "Starting pipeline");

    let buffers: Buffer[];
    if (input.type === "buffers") {
      buffers = input.buffers;
    } else {
      buffers = await Promise.all(
        input.paths.map((p) => readFile(p))
      );
    }

    await appendJobLog(jobId, `Validating ${buffers.length} images`);
    const validation = await validateImages(buffers);
    if (!validation.ok) {
      const msg = validation.errors.map((e) => e.message).join("; ");
      await updateJob(jobId, {
        status: "failed",
        progress: 0,
        error: msg,
      });
      await appendJobLog(jobId, `Validation failed: ${msg}`);
      return;
    }

    await updateJob(jobId, { progress: 15, inputImageCount: validation.images.length });
    await appendJobLog(jobId, "Preprocessing (orientation, resize)");
    const preprocessedPaths = await preprocessImages(jobDir, validation.images);

    await updateJob(jobId, { progress: 40 });
    await appendJobLog(jobId, "Running reconstruction adapter (stub)");
    const adapterOut = await runStubAdapter({
      jobDir,
      preprocessedPaths,
    });

    await updateJob(jobId, { progress: 85 });

    const base = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const baseStorage = `${base}/storage/jobs/${jobId}`;

    const outputs = {
      glbUrl: `${baseStorage}/${adapterOut.glbPath}`,
      previewUrl: `${baseStorage}/${adapterOut.previewPath}`,
    };

    await updateJob(jobId, {
      status: "succeeded",
      progress: 100,
      outputs,
    });
    await appendJobLog(jobId, "Pipeline completed successfully");
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    await updateJob(jobId, {
      status: "failed",
      progress: 0,
      error: err,
    });
    await appendJobLog(jobId, `Pipeline failed: ${err}`);
    throw e;
  }
}
