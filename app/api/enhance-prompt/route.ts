import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

const SYSTEM_PROMPT =
  "You are a professional product photography prompt engineer. Take the user's simple scene description and expand it into a detailed, photorealistic Imagen 3 prompt. Include: realistic shadows, proper lighting that matches the scene, professional product photography composition, photorealistic style, 4K quality. Keep it under 100 words. Return only the enhanced prompt, nothing else.";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt } = body as { prompt?: string };

    if (!prompt || typeof prompt !== "string") {
      return Response.json(
        { error: "prompt is required and must be a string" },
        { status: 400 }
      );
    }

    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5"),
      system: SYSTEM_PROMPT,
      prompt: prompt.trim(),
    });

    const enhancedPrompt = text.trim();
    return Response.json({ enhancedPrompt });
  } catch (e) {
    console.error("Enhance prompt error:", e);
    const message =
      e instanceof Error ? e.message : "Failed to enhance prompt";
    const status =
      message.includes("API key") || message.includes("authentication")
        ? 401
        : 500;
    return Response.json({ error: message }, { status });
  }
}
