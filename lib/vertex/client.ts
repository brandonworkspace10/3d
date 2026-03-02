import { v1, helpers } from "@google-cloud/aiplatform";

const { PredictionServiceClient } = v1;

const IMAGEN_MODEL = "imagen-3.0-generate-002";

function getConfig() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const location = process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1";
  if (!projectId) {
    throw new Error(
      "GOOGLE_CLOUD_PROJECT_ID environment variable is required"
    );
  }
  return { projectId, location };
}

let _client: InstanceType<typeof PredictionServiceClient> | null = null;

function getClient() {
  if (_client) return _client;
  const { location } = getConfig();
  _client = new PredictionServiceClient({
    apiEndpoint: `${location}-aiplatform.googleapis.com`,
  });
  return _client;
}

function getModelEndpoint() {
  const { projectId, location } = getConfig();
  return `projects/${projectId}/locations/${location}/publishers/google/models/${IMAGEN_MODEL}`;
}

export interface ImagenResult {
  imageBytes: Buffer;
  mimeType: string;
}

/**
 * Generate an image from a text prompt using Imagen 3.
 */
export async function generateImage(prompt: string): Promise<ImagenResult> {
  const client = getClient();
  const instance = helpers.toValue({ prompt });
  const parameters = helpers.toValue({ sampleCount: 1 });

  const [response] = await client.predict({
    endpoint: getModelEndpoint(),
    instances: [instance],
    parameters,
  });

  return extractFirstImage(response);
}

/**
 * Edit an existing image using Imagen 3 with a text prompt (mask-free editing).
 * Sends the source image alongside the prompt so the model can relight / restyle it.
 */
export async function editImage(
  imageBase64: string,
  prompt: string
): Promise<ImagenResult> {
  const client = getClient();
  const instance = helpers.toValue({
    prompt,
    image: { bytesBase64Encoded: imageBase64 },
  });
  const parameters = helpers.toValue({
    sampleCount: 1,
    guidanceScale: 21,
  });

  const [response] = await client.predict({
    endpoint: getModelEndpoint(),
    instances: [instance],
    parameters,
  });

  return extractFirstImage(response);
}

function extractFirstImage(
  response: Awaited<ReturnType<InstanceType<typeof PredictionServiceClient>["predict"]>>[0]
): ImagenResult {
  const predictions = response.predictions ?? [];
  if (predictions.length === 0) {
    throw new Error("Imagen 3 returned no predictions");
  }

  const fields = predictions[0].structValue?.fields;
  if (!fields) {
    throw new Error("Unexpected response structure from Imagen 3");
  }

  const base64 = fields.bytesBase64Encoded?.stringValue;
  const mimeType = fields.mimeType?.stringValue ?? "image/png";

  if (!base64) {
    throw new Error("No image data in Imagen 3 response");
  }

  return {
    imageBytes: Buffer.from(base64, "base64"),
    mimeType,
  };
}
