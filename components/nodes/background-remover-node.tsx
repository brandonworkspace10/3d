"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import { useMemo } from "react";
import {
  Node as CanvasNode,
  NodeContent,
  NodeFooter,
  NodeHeader,
  NodeTitle,
} from "@/components/ai-elements/node";
import { TerminalExecuteButton } from "@/components/nodes/terminal-execute-button";
import { cn } from "@/lib/utils";
import type { BackgroundRemoverData, ImageUploadData } from "@/lib/pipeline/types";

function getSourceOutputUrls(
  sourceNode: { type?: string; data: Record<string, unknown> } | undefined
): string[] {
  if (!sourceNode) return [];
  const d = sourceNode.data;
  if (sourceNode.type === "imageUpload") {
    const images = (d as ImageUploadData).images ?? [];
    return images
      .filter((i) => i?.url != null)
      .map((i) => (i.url.startsWith("/") ? window.location.origin + i.url : i.url));
  }
  if (sourceNode.type === "backgroundRemover" || sourceNode.type === "lighting") {
    const urls = ((d as { outputUrls?: string[] }).outputUrls ?? []) as string[];
    return urls
      .filter((u) => u != null)
      .map((u) => (u.startsWith("/") ? window.location.origin + u : u));
  }
  return [];
}

type BackgroundRemoverNode = Node<BackgroundRemoverData, "backgroundRemover">;
export type BackgroundRemoverNodeProps = NodeProps<BackgroundRemoverNode>;

export function BackgroundRemoverNode({ id, data }: BackgroundRemoverNodeProps) {
  const { getEdges, getNodes } = useReactFlow();
  const { label, status, inputUrls, outputUrls, error } = data;

  const connectedPreviewUrls = useMemo(() => {
    const edges = getEdges();
    const nodes = getNodes();
    const inEdge = edges.find(
      (e) => e.target === id && e.targetHandle === "target-image"
    );
    if (!inEdge) return [];
    const source = nodes.find((n) => n.id === inEdge.source);
    return getSourceOutputUrls(source);
  }, [id, getEdges, getNodes]);

  const outputDisplayUrls =
    typeof window !== "undefined"
      ? outputUrls.map((u) =>
          u.startsWith("http") ? u : window.location.origin + u
        )
      : outputUrls;
  const hasOutput = outputDisplayUrls.length > 0;
  const hasInput =
    inputUrls.length > 0 || connectedPreviewUrls.length > 0;

  return (
    <CanvasNode handles={{ target: false, source: false }}>
      {/* Left notch + handle */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: -9,
          transform: "translateY(-50%)",
          width: 18,
          height: 18,
          borderRadius: "50%",
          backgroundColor: "var(--card)",
          pointerEvents: "none",
        }}
      />
      <Handle
        id="target-image"
        type="target"
        position={Position.Left}
        style={{ width: 12, height: 12 }}
        data-handletype="image"
      />
      {/* Right notch + handle */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          right: -9,
          transform: "translateY(-50%)",
          width: 18,
          height: 18,
          borderRadius: "50%",
          backgroundColor: "var(--card)",
          pointerEvents: "none",
        }}
      />
      <Handle
        id="source-image"
        type="source"
        position={Position.Right}
        style={{ width: 12, height: 12 }}
        data-handletype="image"
      />
      <NodeHeader>
        <NodeTitle>{label || "Subject Isolation"}</NodeTitle>
        <TerminalExecuteButton nodeId={id} />
      </NodeHeader>
      <NodeContent className="space-y-2">
        <div className="relative aspect-square overflow-hidden rounded bg-muted">
          {hasOutput ? (
            <div className="grid size-full grid-cols-2 gap-1.5 p-1">
              {outputDisplayUrls.slice(0, 4).map((url) => (
                <div
                  key={url}
                  className="bg-muted border-border relative aspect-square overflow-hidden rounded border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt="Isolated view"
                    className="size-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground flex size-full flex-col items-center justify-center gap-1 text-xs">
              {status === "processing" && "…"}
              {status !== "processing" &&
                (hasInput ? "Run to isolate" : "Connect image source")}
            </div>
          )}
        </div>
      </NodeContent>
      <NodeFooter className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "text-xs",
            status === "complete" && "text-green-600",
            status === "error" && "text-destructive",
            status === "processing" && "text-muted-foreground"
          )}
        >
          {status === "idle" && "Idle"}
          {status === "processing" && "Processing…"}
          {status === "complete" && "Complete"}
          {status === "error" && (error || "Error")}
        </span>
        <span className="node-handle-label text-[11px] leading-none" style={{ color: "#4ade80" }}>image</span>
      </NodeFooter>
    </CanvasNode>
  );
}
