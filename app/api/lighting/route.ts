import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { nanoid } from "nanoid";
import { editImage } from "@/lib/vertex/client";

const OUT_DIR = join(process.cwd(), "public", "uploads", "lighting");

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageUrl, imageUrls, sceneDescription } = body as {
      imageUrl?: string;
      imageUrls?: string[];
      sceneDescription?: string;
    };

    const urls = imageUrls ?? (imageUrl ? [imageUrl] : []);
    if (urls.length === 0) {
      return Response.json(
        { error: "imageUrl or imageUrls is required" },
        { status: 400 }
      );
    }

    await mkdir(OUT_DIR, { recursive: true });
    const outputUrls: string[] = [];

    const prompt = sceneDescription
      ? `Relight this product photo to match the following scene lighting: ${sceneDescription}. Preserve the product details exactly.`
      : "Relight this product photo with neutral, balanced studio lighting for a consistent professional appearance. Preserve the product details exactly.";

    for (const url of urls) {
      const absoluteUrl =
        url.startsWith("http") ? url : new URL(url, request.url).href;
      const res = await fetch(absoluteUrl);
      if (!res.ok) throw new Error(`Failed to fetch image: ${absoluteUrl}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      const imageBase64 = buffer.toString("base64");

      const result = await editImage(imageBase64, prompt);

      const id = nanoid();
      const ext = result.mimeType === "image/jpeg" ? "jpg" : "png";
      const filename = `${id}.${ext}`;
      await writeFile(join(OUT_DIR, filename), result.imageBytes);
      outputUrls.push(`/uploads/lighting/${filename}`);
    }

    return Response.json({ outputUrls });
  } catch (e) {
    console.error("Scene Light Sync (Imagen 3) error:", e);
    return Response.json(
      {
        error: e instanceof Error
          ? e.message
          : "Scene light sync failed — Imagen 3 returned an unexpected error",
      },
      { status: 500 }
    );
  }
}
