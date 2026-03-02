import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import sharp from "sharp";
import { nanoid } from "nanoid";
import { generateImage } from "@/lib/vertex/client";

const OUT_DIR = join(process.cwd(), "public", "uploads", "background-replace");

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { subjectImageUrl, prompt } = body as {
      subjectImageUrl?: string;
      prompt?: string;
    };

    if (!subjectImageUrl) {
      return Response.json(
        { error: "subjectImageUrl is required" },
        { status: 400 }
      );
    }

    const bgPrompt = prompt
      ? `High-quality product background scene: ${prompt}. No product in the scene, only the environment.`
      : "Clean, modern professional studio background with soft lighting, suitable for product photography.";

    const absoluteUrl = subjectImageUrl.startsWith("http")
      ? subjectImageUrl
      : new URL(subjectImageUrl, request.url).href;

    const [subjectRes, bgResult] = await Promise.all([
      fetch(absoluteUrl).then(async (r) => {
        if (!r.ok)
          throw new Error(`Failed to fetch subject image: ${absoluteUrl}`);
        return Buffer.from(await r.arrayBuffer());
      }),
      generateImage(bgPrompt),
    ]);

    const subjectMeta = await sharp(subjectRes).metadata();
    const width = subjectMeta.width ?? 1024;
    const height = subjectMeta.height ?? 1024;

    const background = await sharp(bgResult.imageBytes)
      .resize(width, height, { fit: "cover" })
      .toBuffer();

    const subjectPng = await sharp(subjectRes)
      .resize(width, height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .ensureAlpha()
      .toBuffer();

    const composited = await sharp(background)
      .composite([{ input: subjectPng, gravity: "center" }])
      .png()
      .toBuffer();

    await mkdir(OUT_DIR, { recursive: true });
    const id = nanoid();
    const filename = `${id}.png`;
    await writeFile(join(OUT_DIR, filename), composited);
    const renderUrl = `/uploads/background-replace/${filename}`;

    return Response.json({ renderUrl });
  } catch (e) {
    console.error("Brand Scene Builder (Imagen 3) error:", e);
    return Response.json(
      {
        error: e instanceof Error
          ? e.message
          : "Brand scene builder failed — Imagen 3 returned an unexpected error",
      },
      { status: 500 }
    );
  }
}
