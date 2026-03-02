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
  // helpers.toValue returns a protobuf "Value"-like object, but the SDK typings vary by version.
  // Keep this intentionally loose to avoid TS build failures on Node/Vercel.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const instance = helpers.toValue({ prompt }) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parameters = helpers.toValue({ sampleCount: 1 }) as any;

  // The generated client has both Promise- and callback-style overloads; in strict TS
  // this becomes a union including `void`. Force the Promise overload for Next build.
  const predictResult = (await (client.predict({
    endpoint: getModelEndpoint(),
    instances: [instance],
    parameters,
  }) as unknown)) as unknown as [{ predictions?: unknown[] }];
  const response = predictResult[0];

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const instance = helpers.toValue({
    prompt,
    image: { bytesBase64Encoded: imageBase64 },
  }) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parameters = helpers.toValue({
    sampleCount: 1,
    guidanceScale: 21,
  }) as any;

  const predictResult = (await (client.predict({
    endpoint: getModelEndpoint(),
    instances: [instance],
    parameters,
  }) as unknown)) as unknown as [{ predictions?: unknown[] }];
  const response = predictResult[0];

  return extractFirstImage(response);
}

function extractFirstImage(
  response: { predictions?: unknown[] }
): ImagenResult {
  const predictions = response.predictions ?? [];
  if (predictions.length === 0) {
    throw new Error("Imagen 3 returned no predictions");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const first = predictions[0] as any;
  const fields = first?.structValue?.fields;
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
