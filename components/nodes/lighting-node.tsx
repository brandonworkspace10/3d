"use client";

import type { Node, NodeProps } from "@xyflow/react";
import {
  Handle,
  Position,
  addEdge,
  useEdges,
  useNodes,
  useReactFlow,
} from "@xyflow/react";
import { useCallback, useMemo } from "react";
import {
  Node as CanvasNode,
  NodeContent,
  NodeFooter,
  NodeHeader,
  NodeTitle,
} from "@/components/ai-elements/node";
import { TerminalExecuteButton } from "@/components/nodes/terminal-execute-button";
import { cn } from "@/lib/utils";
import type { ImageUploadData, LightingData } from "@/lib/pipeline/types";

// Handle pixel positions
// Header: 12pt + 24 (text-base leading-normal) + 12pb = 48px
// Content padding-top: 12px (p-3)
// Row 1 (h-6=24px): center = 48+12+12 = 72 → handle top = 72-6 = 66
// Row 2 (h-6=24px, space-y-1 gap=4px): center = 48+12+24+4+12 = 100 → handle top = 100-6 = 94
const TARGET_IMAGE_TOP = 66;
const TARGET_PROMPT_TOP = 94;
const SOURCE_TOP = 66;
const HANDLE_SM = 12;
const NOTCH_SIZE = 18;
const NOTCH_OFFSET = NOTCH_SIZE / 2;
const PROMPT_OFFSET_X = 280;
const PROMPT_LABEL = "Scene Light Prompt";
const NODE_TYPE = "lighting" as const;

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

type LightingNode = Node<LightingData, "lighting">;
export type LightingNodeProps = NodeProps<LightingNode>;

export function LightingNode({ id, data }: LightingNodeProps) {
  const { setNodes, setEdges, getNode } = useReactFlow();
  const edges = useEdges();
  const allNodes = useNodes();
  const { label, status, inputUrls, outputUrls, error, validationMessage } = data;

  const promptConnected = useMemo(
    () => edges.some((e) => e.target === id && e.targetHandle === "target-prompt"),
    [edges, id]
  );

  const connectedPreviewUrls = useMemo(() => {
    const inEdge = edges.find(
      (e) => e.target === id && e.targetHandle === "target-image"
    );
    if (!inEdge) return [];
    const source = allNodes.find((n) => n.id === inEdge.source);
    return getSourceOutputUrls(source);
  }, [id, edges, allNodes]);

  const handleAddPrompt = useCallback(() => {
    const self = getNode(id);
    if (!self) return;
    const promptId = `prompt-auto-${id}-${Date.now()}`;
    setNodes((nds) => [
      ...nds,
      {
        id: promptId,
        type: "promptNode",
        position: { x: self.position.x - PROMPT_OFFSET_X, y: self.position.y },
        data: {
          label: PROMPT_LABEL,
          parentType: NODE_TYPE,
          prompt: "",
          promptMissing: false,
        },
      } as Node,
    ]);
    setEdges((eds) =>
      addEdge(
        {
          id: `edge-${promptId}-${id}`,
          source: promptId,
          sourceHandle: "source-prompt",
          target: id,
          targetHandle: "target-prompt",
          type: "animated",
        },
        eds
      )
    );
  }, [id, getNode, setNodes, setEdges]);

  const hasOutput = outputUrls.length > 0;
  const toFullUrl = (u: string) =>
    u.startsWith("http")
      ? u
      : typeof window !== "undefined"
        ? window.location.origin + u
        : u;
  const outputDisplayUrl = outputUrls[0] ? toFullUrl(outputUrls[0]) : undefined;
  const hasInput = inputUrls.length > 0 || connectedPreviewUrls.length > 0;

  return (
    <CanvasNode handles={{ target: false, source: false }}>
      {/* Notches and handles */}
      <div style={{ position: "absolute", top: TARGET_IMAGE_TOP, left: -NOTCH_OFFSET, transform: "translateY(-50%)", width: NOTCH_SIZE, height: NOTCH_SIZE, borderRadius: "50%", backgroundColor: "var(--card)", pointerEvents: "none" }} />
      <Handle id="target-image" type="target" position={Position.Left} style={{ top: TARGET_IMAGE_TOP, width: HANDLE_SM, height: HANDLE_SM }} data-handletype="image" />

      <div style={{ position: "absolute", top: TARGET_PROMPT_TOP, left: -NOTCH_OFFSET, transform: "translateY(-50%)", width: NOTCH_SIZE, height: NOTCH_SIZE, borderRadius: "50%", backgroundColor: "var(--card)", pointerEvents: "none" }} />
      <Handle id="target-prompt" type="target" position={Position.Left} style={{ top: TARGET_PROMPT_TOP, width: HANDLE_SM, height: HANDLE_SM }} data-handletype="prompt" data-required="true" />

      <div style={{ position: "absolute", top: SOURCE_TOP, right: -NOTCH_OFFSET, transform: "translateY(-50%)", width: NOTCH_SIZE, height: NOTCH_SIZE, borderRadius: "50%", backgroundColor: "var(--card)", pointerEvents: "none" }} />
      <Handle id="source-output" type="source" position={Position.Right} style={{ top: SOURCE_TOP, width: HANDLE_SM, height: HANDLE_SM }} data-handletype="output" />

      <NodeHeader>
        <NodeTitle>{label || "Scene Light Sync"}</NodeTitle>
        <TerminalExecuteButton nodeId={id} />
      </NodeHeader>

      <NodeContent className="space-y-2">
        {/* Handle label rows — dots removed; labels appear on hover via node-handle-label */}
        <div className="space-y-1">
          {/* Row 1: image (left) → output (right) */}
          <div className="flex h-6 items-center justify-between">
            <span className="node-handle-label text-[11px] leading-none" style={{ color: "#4ade80" }}>image</span>
            <span className="node-handle-label text-[11px] leading-none" style={{ color: "#22d3ee" }}>output</span>
          </div>
          {/* Row 2: prompt (left) */}
          <div className="flex h-6 items-center">
            {promptConnected ? (
              <span className="node-handle-label text-[11px] leading-none" style={{ color: "#a78bfa" }}>prompt</span>
            ) : (
              <button
                type="button"
                onClick={handleAddPrompt}
                className="nodrag nowheel node-handle-label text-[11px] leading-none transition-opacity hover:opacity-80"
                style={{ color: "#a78bfa", background: "none", border: "none", padding: 0, cursor: "pointer" }}
              >
                + Add Prompt
              </button>
            )}
          </div>
        </div>

        {/* Inline validation message */}
        {validationMessage && (
          <p className="text-[11px] leading-tight text-destructive">{validationMessage}</p>
        )}

        {/* Preview */}
        <div className="relative aspect-square overflow-hidden rounded bg-muted">
          {hasOutput && outputDisplayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={outputDisplayUrl}
              alt="Output"
              className="size-full object-cover"
            />
          ) : (
            <div className="text-muted-foreground flex size-full flex-col items-center justify-center gap-1 text-xs">
              {status === "processing" && "…"}
              {status !== "processing" &&
                (hasInput ? "Run to sync lighting" : "Connect image source")}
            </div>
          )}
        </div>
      </NodeContent>

      <NodeFooter className="flex items-center gap-2">
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
      </NodeFooter>
    </CanvasNode>
  );
}
