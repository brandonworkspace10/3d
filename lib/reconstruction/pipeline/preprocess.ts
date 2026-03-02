import sharp from "sharp";
import { mkdir } from "fs/promises";
import { join } from "path";
import type { ValidatedImage } from "./validate";
import { config } from "../config";

/** Normalize orientation (EXIF) and optionally downscale. Returns paths relative to jobDir. */
export async function preprocessImages(
  jobDir: string,
  images: ValidatedImage[]
): Promise<string[]> {
  const preprocessedDir = join(jobDir, "preprocessed");
  await mkdir(preprocessedDir, { recursive: true });
  const outPaths: string[] = [];
  const maxSide = config.maxSide || 0;

  for (let i = 0; i < images.length; i++) {
    let pipeline = sharp(images[i].buffer)
      .rotate() // Apply EXIF orientation
      .png();   // Output as PNG for consistency

    if (maxSide > 0) {
      const w = images[i].width;
      const h = images[i].height;
      const longest = Math.max(w, h);
      if (longest > maxSide) {
        const scale = maxSide / longest;
        pipeline = pipeline.resize(
          Math.round(w * scale),
          Math.round(h * scale),
          { fit: "inside" }
        );
      }
    }

    const filename = `input_${String(i).padStart(2, "0")}.png`;
    const outPath = join(jobDir, "preprocessed", filename);
    await sharp(await pipeline.toBuffer())
      .png()
      .toFile(outPath);
    outPaths.push(`preprocessed/${filename}`);
  }

  return outPaths;
}
