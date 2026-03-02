"use client";

import { useParams } from "next/navigation";
import { ReactFlowProvider } from "@xyflow/react";
import { CanvasInner } from "../page";

export default function CanvasProjectPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  if (!projectId) return null;

  return (
    <ReactFlowProvider>
      <CanvasInner projectId={projectId} />
    </ReactFlowProvider>
  );
}
