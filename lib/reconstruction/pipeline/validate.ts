import sharp from "sharp";
import { config } from "../config";

export interface ValidationError {
  code: string;
  message: string;
}

export interface ValidatedImage {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
}

export async function validateImages(
  buffers: Buffer[],
  mimeTypes?: string[]
): Promise<{ ok: true; images: ValidatedImage[] } | { ok: false; errors: ValidationError[] }> {
  const errors: ValidationError[] = [];

  if (buffers.length < config.minImages) {
    errors.push({
      code: "TOO_FEW_IMAGES",
      message: `At least ${config.minImages} images are required. Got ${buffers.length}.`,
    });
  }
  if (buffers.length > config.maxImages) {
    errors.push({
      code: "TOO_MANY_IMAGES",
      message: `At most ${config.maxImages} images are allowed. Got ${buffers.length}.`,
    });
  }

  if (errors.length) return { ok: false, errors };

  const images: ValidatedImage[] = [];

  for (let i = 0; i < buffers.length; i++) {
    try {
      const meta = await sharp(buffers[i]).metadata();
      const rawWidth = meta.width ?? 0;
      const rawHeight = meta.height ?? 0;
      const orientation = meta.orientation ?? 0;
      const { width, height } =
        orientation >= 5 ? { width: rawHeight, height: rawWidth } : { width: rawWidth, height: rawHeight };
      const minSide = Math.min(width, height);

      if (minSide < config.minShortestSide) {
        errors.push({
          code: "LOW_RESOLUTION",
          message: `Image ${i + 1}: shortest side must be at least ${config.minShortestSide}px. Got ${minSide}px.`,
        });
        continue;
      }

      images.push({
        buffer: buffers[i],
        width,
        height,
        format: meta.format ?? "unknown",
      });
    } catch (e) {
      errors.push({
        code: "INVALID_IMAGE",
        message: `Image ${i + 1}: ${e instanceof Error ? e.message : "Invalid image"}`,
      });
    }
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, images };
}
