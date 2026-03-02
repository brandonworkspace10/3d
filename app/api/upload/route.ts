import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import sharp from "sharp";
import { nanoid } from "nanoid";
import { put } from "@vercel/blob";

const MIN_SIDE = 1024;
const LAPLACIAN_THRESHOLD = 100; // below this = blurry
const UPLOADS_DIR = join(process.cwd(), "public", "uploads");

export interface UploadImageResult {
  id: string;
  url: string;
  name: string;
  size: number;
  width: number;
  height: number;
  blurPass: boolean;
  resolutionPass: boolean;
  errors: { type: "blur" | "resolution" | "angles"; message: string }[];
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    if (!files?.length) {
      return Response.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }
    if (files.length < 1 || files.length > 6) {
      return Response.json(
        { error: "Provide 1 to 6 images" },
        { status: 400 }
      );
    }

    const results: UploadImageResult[] = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const id = nanoid();
      const ext = file.name.split(".").pop() || "jpg";
      const filename = `${id}.${ext}`;
      const filepath = join(UPLOADS_DIR, filename);

      const meta = await sharp(buffer).metadata();
      const rawWidth = meta.width ?? 0;
      const rawHeight = meta.height ?? 0;
      const orientation = meta.orientation ?? 0;
      const { width, height } =
        orientation >= 5
          ? { width: rawHeight, height: rawWidth }
          : { width: rawWidth, height: rawHeight };
      const laplacian = await sharp(buffer)
        .grayscale()
        .raw()
        .toBuffer()
        .then((buf) => laplacianVariance(buf, width, height));

      const blurPass = laplacian >= LAPLACIAN_THRESHOLD;
      const resolutionPass = width >= MIN_SIDE && height >= MIN_SIDE;
      const errors: UploadImageResult["errors"] = [];
      if (!blurPass) errors.push({ type: "blur", message: "Image is too blurry" });
      // Resolution validation temporarily disabled for testing
      // if (!resolutionPass)
      //   errors.push({
      //     type: "resolution",
      //     message: `Resolution must be at least ${MIN_SIDE}px on the shortest side`,
      //   });

      const shouldUseBlob =
        process.env.VERCEL === "1" || !!process.env.BLOB_READ_WRITE_TOKEN;

      let url: string;
      if (shouldUseBlob) {
        const blob = await put(`uploads/${filename}`, buffer, {
          access: "public",
          contentType: file.type || "application/octet-stream",
        });
        url = blob.url;
      } else {
        await mkdir(UPLOADS_DIR, { recursive: true });
        await writeFile(filepath, buffer);
        url = `/uploads/${filename}`;
      }
      results.push({
        id,
        url,
        name: file.name,
        size: file.size,
        width,
        height,
        blurPass,
        resolutionPass,
        errors,
      });
    }

    const validation = {
      status: results.every((r) => r.errors.length === 0)
        ? ("passed" as const)
        : ("failed" as const),
      results,
    };

    return Response.json(validation);
  } catch (e) {
    console.error("Upload error:", e);
    return Response.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    );
  }
}

function laplacianVariance(
  data: Buffer,
  width: number,
  height: number
): number {
  let sum = 0;
  let count = 0;
  const step = Math.max(1, Math.floor(Math.min(width, height) / 64));
  for (let y = step; y < height - step; y += step) {
    for (let x = step; x < width - step; x += step) {
      const i = y * width + x;
      const v =
        -data[i - 1]! -
        data[i - width]! -
        data[i + width]! -
        data[i + 1]! +
        4 * data[i]!;
      sum += v * v;
      count += 1;
    }
  }
  return count > 0 ? sum / count : 0;
}
