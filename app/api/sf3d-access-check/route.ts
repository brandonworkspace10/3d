/**
 * Dev/test route: verify Hugging Face gated access for SF3D.
 * GET /api/sf3d-access-check → 200 { status: "PASS" } or 401/500 { status: "FAIL", error, instructions }.
 */
import { checkHfAccess, getGatedInstructions } from "@/lib/sf3d/check-hf-access";

export async function GET() {
  const result = await checkHfAccess();
  if (result.ok) {
    return Response.json({ status: "PASS", message: result.message });
  }
  return Response.json(
    {
      status: "FAIL",
      error: result.message,
      instructions: getGatedInstructions(),
    },
    { status: result.statusCode }
  );
}
