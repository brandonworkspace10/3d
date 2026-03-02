/**
 * Preprocess images for SF3D: background removal, crop to object, resize to 512x512.
 */
import sharp from "sharp";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

const SF3D_INPUT_SIZE = 512;
const MAX_INPUT_DIM = 1536;
const ALPHA_THRESHOLD = 128;

async function removeBackground(buffer: Buffer): Promise<Buffer> {
  const mod = await import("@imgly/background-removal-node").catch(() => null);
  if (!mod?.removeBackground) {
    throw new Error("Background removal not available. Install @imgly/background-removal-node.");
  }
  const blob = await mod.removeBackground(new Blob([new Uint8Array(buffer)], { type: "image/png" }), {
    output: { format: "image/png" },
  });
  return Buffer.from(await blob.arrayBuffer());
}

async function cropToObjectBounds(
  buffer: Buffer
): Promise<{ left: number; top: number; width: number; height: number }> {
  const meta = await sharp(buffer).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (w === 0 || h === 0) return { left: 0, top: 0, width: w, height: h };

  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  const alphaIdx = channels === 4 ? 3 : -1;
  if (alphaIdx < 0) return { left: 0, top: 0, width: w, height: h };

  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * channels + alphaIdx;
      if (data[idx] >= ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (minX > maxX || minY > maxY) return { left: 0, top: 0, width: w, height: h };

  const pad = 8;
  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  const width = Math.min(w - left, maxX - minX + 1 + pad * 2);
  const height = Math.min(h - top, maxY - minY + 1 + pad * 2);
  return { left, top, width, height };
}

export interface PreprocessInput {
  buffers: Buffer[];
  jobDir: string;
}

export interface PreprocessOutput {
  paths: string[]; // relative to jobDir
}

export async function preprocessImages(input: PreprocessInput): Promise<PreprocessOutput> {
  const { buffers, jobDir } = input;
  const preprocessedDir = join(jobDir, "preprocessed");
  await mkdir(preprocessedDir, { recursive: true });
  const paths: string[] = [];

  for (let i = 0; i < buffers.length; i++) {
    let buf = buffers[i];

    // Downscale if too large
    const meta = await sharp(buf).metadata();
    const maxSide = Math.max(meta.width ?? 0, meta.height ?? 0);
    if (maxSide > MAX_INPUT_DIM) {
      buf = await sharp(buf)
        .resize(MAX_INPUT_DIM, MAX_INPUT_DIM, { fit: "inside" })
        .png()
        .toBuffer();
    }

    // Background removal
    buf = await removeBackground(buf);

    // Crop to object bounds
    const { left, top, width, height } = await cropToObjectBounds(buf);
    if (width > 0 && height > 0) {
      buf = await sharp(buf).extract({ left, top, width, height }).png().toBuffer();
    }

    // Resize to SF3D input size
    buf = await sharp(buf)
      .resize(SF3D_INPUT_SIZE, SF3D_INPUT_SIZE, { fit: "cover" })
      .png()
      .toBuffer();

    const filename = `input_${String(i).padStart(2, "0")}.png`;
    const outPath = join(preprocessedDir, filename);
    await writeFile(outPath, buf);
    paths.push(`preprocessed/${filename}`);
  }

  return { paths };
}
