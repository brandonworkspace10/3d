/**
 * 3D model generation API (placeholder).
 * Route preserved for pipeline; will be connected to Meshy.ai or another provider later.
 */

const PLACEHOLDER = {
  status: "3D generation not yet connected",
  glb: null as string | null,
  usdz: null as string | null,
  viewerUrl: null as string | null,
};

export async function POST() {
  return Response.json({
    ...PLACEHOLDER,
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const assetId = searchParams.get("assetId");
  if (!assetId) {
    return Response.json(
      { error: "assetId query parameter is required" },
      { status: 400 }
    );
  }
  return Response.json({
    status: PLACEHOLDER.status,
  });
}
