import { NextResponse } from "next/server";
import { getJob } from "@/lib/reconstruction/job-store";

type RouteParams = { params: Promise<{ jobId: string }> };

/** GET /api/reconstruction/jobs/:jobId - Get job status and outputs */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { jobId } = await params;
    const job = await getJob(jobId);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const body: Record<string, unknown> = {
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };

    if (job.outputs) {
      body.outputs = job.outputs;
    }
    if (job.error) {
      body.error = job.error;
    }
    if (job.inputImageCount != null) {
      body.inputImageCount = job.inputImageCount;
    }

    return NextResponse.json(body);
  } catch (e) {
    console.error("[reconstruction] GET job error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}
