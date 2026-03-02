/**
 * Reconstruction pipeline configuration.
 * All values can be overridden via environment variables.
 */
export const config = {
  /** Minimum images required (3-6) */
  minImages: parseInt(process.env.RECON_MIN_IMAGES ?? "3", 10),

  /** Maximum images allowed */
  maxImages: parseInt(process.env.RECON_MAX_IMAGES ?? "6", 10),

  /** Minimum shortest side in pixels */
  minShortestSide: parseInt(process.env.RECON_MIN_SIDE ?? "1024", 10),

  /** Max dimension for processing (0 = no downscale) */
  maxSide: parseInt(process.env.RECON_MAX_SIDE ?? "2048", 10) || 0,

  /** Queue concurrency (BullMQ) */
  queueConcurrency: parseInt(process.env.RECON_QUEUE_CONCURRENCY ?? "2", 10),

  /** Job timeout in seconds */
  jobTimeoutSeconds: parseInt(process.env.RECON_JOB_TIMEOUT ?? "600", 10),

  /** Redis URL for BullMQ. If unset, in-memory fallback is used. */
  redisUrl: process.env.REDIS_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? null,

  /** Storage base path (relative to cwd). Use public/storage/jobs for static serving. */
  storagePath: process.env.RECON_STORAGE_PATH ?? "public/storage/jobs",

  /** Path to COLMAP binary (optional) */
  colmapPath: process.env.COLMAP_PATH ?? "colmap",

  /** Path to Blender binary (optional) */
  blenderPath: process.env.BLENDER_PATH ?? "blender",
} as const;
