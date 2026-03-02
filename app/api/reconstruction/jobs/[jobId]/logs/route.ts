import { NextResponse } from "next/server";
import { getJob } from "@/lib/reconstruction/job-store";

type RouteParams = { params: Promise<{ jobId: string }> };

/** GET /api/reconstruction/jobs/:jobId/logs - Get job logs */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { jobId } = await params;
    const job = await getJob(jobId);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({
      jobId,
      logs: job.logs ?? [],
    });
  } catch (e) {
    console.error("[reconstruction] GET logs error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}
