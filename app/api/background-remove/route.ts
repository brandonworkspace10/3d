import { writeFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import sharp from "sharp";
import { nanoid } from "nanoid";

const OUT_DIR = join(process.cwd(), "public", "uploads", "no-bg");

/** Formats supported by @imgly/background-removal-node (avif/heif are not). */
const SUPPORTED_FORMATS = new Set(["jpeg", "jpg", "png", "webp"]);

async function loadAndConvertToSupportedFormat(url: string): Promise<Uint8Array> {
  let buffer: Buffer;
  if (url.startsWith("http")) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    buffer = Buffer.from(await res.arrayBuffer());
  } else {
    const filepath = join(process.cwd(), "public", url.replace(/^\//, ""));
    buffer = await readFile(filepath);
  }
  const meta = await sharp(buffer).metadata();
  const format = (meta.format as string)?.toLowerCase?.();
  if (format && SUPPORTED_FORMATS.has(format)) {
    return new Uint8Array(buffer);
  }
  return new Uint8Array(await sharp(buffer).png().toBuffer());
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageUrls } = body as { imageUrls: string[] };
    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      return Response.json(
        { error: "imageUrls array required" },
        { status: 400 }
      );
    }

    let removeBackground: (src: Blob | string) => Promise<Blob>;
    try {
      const mod = await import("@imgly/background-removal-node").catch(() => null);
      if (!mod?.removeBackground) throw new Error("not installed");
      removeBackground = (src: Blob | string) =>
        mod.removeBackground(src, {
          output: { format: "image/png" },
        });
    } catch {
      return Response.json(
        {
          error:
            "Background removal is not available. Install @imgly/background-removal-node.",
        },
        { status: 503 }
      );
    }

    await mkdir(OUT_DIR, { recursive: true });
    const outputUrls: string[] = [];

    for (const url of imageUrls) {
      const inputBuffer = await loadAndConvertToSupportedFormat(url);
      const blob = await removeBackground(new Blob([inputBuffer], { type: "image/png" }));
      const id = nanoid();
      const filename = `${id}.png`;
      const filepath = join(OUT_DIR, filename);
      const outputBuffer = Buffer.from(await blob.arrayBuffer());
      await writeFile(filepath, outputBuffer);
      outputUrls.push(`/uploads/no-bg/${filename}`);
    }

    return Response.json({ outputUrls });
  } catch (e) {
    console.error("Background remove error:", e);
    return Response.json(
      {
        error: e instanceof Error ? e.message : "Background removal failed",
      },
      { status: 500 }
    );
  }
}
