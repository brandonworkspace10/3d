import { NextResponse } from "next/server";
import { config } from "@/lib/reconstruction/config";

/** GET /api/reconstruction/health - Health check */
export async function GET() {
  const queueMode = config.redisUrl ? "bullmq (REDIS_URL set)" : "memory (no Redis)";
  return NextResponse.json({
    status: "ok",
    queue: queueMode,
    timestamp: new Date().toISOString(),
  });
}
