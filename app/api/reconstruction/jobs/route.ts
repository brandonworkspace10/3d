import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { readFile } from "fs/promises";
import { join } from "path";
import { createJob } from "@/lib/reconstruction/job-store";
import { enqueueReconstructionJob } from "@/lib/reconstruction/queue";
import { config } from "@/lib/reconstruction/config";
import type { PipelineInput } from "@/lib/reconstruction/pipeline";

/** POST /api/reconstruction/jobs - Create a new reconstruction job */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const field = formData.get("formField") as string | null;
      const files = formData.getAll(field ?? "images") as File[];

      if (!files?.length) {
        return NextResponse.json(
          { error: "No images provided. Use multipart form with 'images' field." },
          { status: 400 }
        );
      }

      const buffers = await Promise.all(
        files.map((f) => f.arrayBuffer().then((b) => Buffer.from(b)))
      );

      const jobId = nanoid();
      await createJob(jobId);

      const input: PipelineInput = { type: "buffers", buffers };
      await enqueueReconstructionJob(jobId, input);

      return NextResponse.json({ jobId });
    }

    if (contentType.includes("application/json")) {
      const body = await request.json();
      const urls = body.imageUrls as string[] | undefined;

      if (!urls?.length) {
        return NextResponse.json(
          { error: "Provide imageUrls array with 3–6 image URLs (e.g. /uploads/xxx.jpg)" },
          { status: 400 }
        );
      }

      const publicDir = join(process.cwd(), "public");
      const paths = urls.map((u: string) => {
        const pathname = typeof u === "string" && u.startsWith("/") ? u : `/${String(u)}`;
        return join(publicDir, pathname.replace(/^\//, ""));
      });

      const jobId = nanoid();
      await createJob(jobId);

      const input: PipelineInput = { type: "paths", paths };
      await enqueueReconstructionJob(jobId, input);

      return NextResponse.json({ jobId });
    }

    return NextResponse.json(
      { error: "Content-Type must be multipart/form-data or application/json" },
      { status: 400 }
    );
  } catch (e) {
    console.error("[reconstruction] POST jobs error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}
