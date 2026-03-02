/** Mock spin video: returns placeholder MP4 URL after a delay. */

const MOCK_DELAY_MS = 2000;

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Route handler signature requires request
export async function POST(request: Request) {
  await new Promise((r) => setTimeout(r, MOCK_DELAY_MS));

  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  return Response.json({
    videoUrl: `${base}/placeholder-spin.mp4`,
  });
}
