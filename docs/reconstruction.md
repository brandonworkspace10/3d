# 2D → 3D Reconstruction Pipeline

API and async job system for converting 3–6 product photos into a 3D model (GLB) and preview image.

## Overview

- **POST /api/reconstruction/jobs** – Submit images, returns `{ jobId }` immediately
- **GET /api/reconstruction/jobs/:jobId** – Poll status, progress, and output URLs
- **GET /api/reconstruction/jobs/:jobId/logs** – Job logs (optional)
- **GET /api/reconstruction/health** – Health check

## Local Setup

### 1. Install dependencies

```bash
npm install
```

Required system dependencies: **Node 18+** (sharp, @gltf-transform/core are npm packages).

### 2. Run the server

```bash
npm run dev
```

Jobs run **in-memory** by default (no Redis). Suitable for local development.

### 3. Run with Redis (optional, for production)

```bash
# Start Redis (Docker)
docker run -d -p 6379:6379 redis:7-alpine

# Set env
export REDIS_URL=redis://localhost:6379

# Start worker (separate terminal)
npx ts-node scripts/reconstruction-worker.ts

# Start server
npm run dev
```

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `RECON_MIN_IMAGES` | 3 | Minimum input images |
| `RECON_MAX_IMAGES` | 6 | Maximum input images |
| `RECON_MIN_SIDE` | 1024 | Min shortest side in pixels |
| `RECON_MAX_SIDE` | 2048 | Downscale images beyond this (0 = no limit) |
| `RECON_QUEUE_CONCURRENCY` | 2 | Worker concurrency (BullMQ) |
| `RECON_JOB_TIMEOUT` | 600 | Job timeout (seconds) |
| `REDIS_URL` | - | Redis URL for BullMQ |
| `RECON_STORAGE_PATH` | public/storage/jobs | Output directory |

## Example: Submit job (multipart)

```bash
curl -X POST http://localhost:3000/api/reconstruction/jobs \
  -F "images=@photo1.jpg" \
  -F "images=@photo2.jpg" \
  -F "images=@photo3.jpg"
```

Response: `{"jobId":"abc123"}`

## Example: Submit job (JSON with URLs)

```bash
curl -X POST http://localhost:3000/api/reconstruction/jobs \
  -H "Content-Type: application/json" \
  -d '{"imageUrls":["/uploads/img1.png","/uploads/img2.png","/uploads/img3.png"]}'
```

Response: `{"jobId":"abc123"}`

## Example: Poll status

```bash
curl http://localhost:3000/api/reconstruction/jobs/abc123
```

Response (running):

```json
{
  "jobId": "abc123",
  "status": "running",
  "progress": 40,
  "createdAt": 1699900000000,
  "updatedAt": 1699900005000
}
```

Response (succeeded):

```json
{
  "jobId": "abc123",
  "status": "succeeded",
  "progress": 100,
  "outputs": {
    "glbUrl": "http://localhost:3000/storage/jobs/abc123/output/model.glb",
    "previewUrl": "http://localhost:3000/storage/jobs/abc123/output/preview.png"
  }
}
```

## Example: Health check

```bash
curl http://localhost:3000/api/reconstruction/health
```

## Pipeline flow

1. **Validate** – 3–6 images, min 1024px shortest side, EXIF orientation
2. **Preprocess** – Normalize orientation, optional downscale
3. **Reconstruct** – Stub adapter: textured cube from first image (swap for COLMAP/OpenMVS later)
4. **Export** – GLB + preview PNG

## Swapping the reconstruction engine

The stub adapter lives in `lib/reconstruction/pipeline/adapters/stub.ts`. To use COLMAP or another engine:

1. Implement the same interface as `runStubAdapter` (input: jobDir + preprocessedPaths, output: glbPath + previewPath)
2. Replace the adapter import in `lib/reconstruction/pipeline/index.ts`
3. Add config for binary paths (`COLMAP_PATH`, `BLENDER_PATH`)

## USDZ (optional)

USDZ export is not implemented. To add:

- Use `usd-core` or Blender Python for USD export
- Extend `JobOutputs` in `lib/reconstruction/types.ts` and the stub adapter
- Add `usdzUrl` to the API response when available

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "At least 3 images required" | Upload 3–6 images |
| "shortest side must be at least 1024px" | Use higher-resolution photos or set `RECON_MIN_SIDE` lower |
| Job stuck in "queued" | Without Redis, jobs run in-process. Ensure no errors in server logs. With Redis, run the worker. |
| 404 on output URLs | Outputs are written to `public/storage/jobs/:jobId/`. Ensure the path is served (Next.js serves `public/` by default). |
