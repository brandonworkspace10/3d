"use client";

import type { Node, NodeProps } from "@xyflow/react";
import {
  Handle,
  Position,
  addEdge,
  useEdges,
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
import type { SpinVideoData } from "@/lib/pipeline/types";

const TARGET_IMAGE_TOP = 66;
const TARGET_PROMPT_TOP = 94;
const SOURCE_TOP = 66;
const HANDLE_SM = 12;
const NOTCH_SIZE = 18;
const NOTCH_OFFSET = NOTCH_SIZE / 2;
const PROMPT_OFFSET_X = 280;
const PROMPT_LABEL = "Showcase Prompt";
const NODE_TYPE = "spinVideo" as const;

type SpinVideoNode = Node<SpinVideoData, "spinVideo">;
export type SpinVideoNodeProps = NodeProps<SpinVideoNode>;

export function SpinVideoNode({ id, data }: SpinVideoNodeProps) {
  const { setNodes, setEdges, getNode } = useReactFlow();
  const edges = useEdges();
  const { label, status, videoUrl, error, validationMessage } = data;

  const promptConnected = useMemo(
    () => edges.some((e) => e.target === id && e.targetHandle === "target-prompt"),
    [edges, id]
  );

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

  return (
    <CanvasNode handles={{ target: false, source: false }}>
      {/* Notches and handles */}
      <div style={{ position: "absolute", top: TARGET_IMAGE_TOP, left: -NOTCH_OFFSET, transform: "translateY(-50%)", width: NOTCH_SIZE, height: NOTCH_SIZE, borderRadius: "50%", backgroundColor: "var(--card)", pointerEvents: "none" }} />
      <Handle id="target-image" type="target" position={Position.Left} style={{ top: TARGET_IMAGE_TOP, width: HANDLE_SM, height: HANDLE_SM }} data-handletype="image" />

      <div style={{ position: "absolute", top: TARGET_PROMPT_TOP, left: -NOTCH_OFFSET, transform: "translateY(-50%)", width: NOTCH_SIZE, height: NOTCH_SIZE, borderRadius: "50%", backgroundColor: "var(--card)", pointerEvents: "none" }} />
      <Handle id="target-prompt" type="target" position={Position.Left} style={{ top: TARGET_PROMPT_TOP, width: HANDLE_SM, height: HANDLE_SM }} data-handletype="prompt" data-required="true" />

      <div style={{ position: "absolute", top: SOURCE_TOP, right: -NOTCH_OFFSET, transform: "translateY(-50%)", width: NOTCH_SIZE, height: NOTCH_SIZE, borderRadius: "50%", backgroundColor: "var(--card)", pointerEvents: "none" }} />
      <Handle id="source-video" type="source" position={Position.Right} style={{ top: SOURCE_TOP, width: HANDLE_SM, height: HANDLE_SM }} data-handletype="video" />

      <NodeHeader>
        <NodeTitle>{label || "Dynamic Showcase"}</NodeTitle>
        <TerminalExecuteButton nodeId={id} />
      </NodeHeader>

      <NodeContent className="space-y-2">
        {/* Handle label rows — dots removed; labels appear on hover via node-handle-label */}
        <div className="space-y-1">
          {/* Row 1: image (left) → video (right) */}
          <div className="flex h-6 items-center justify-between">
            <span className="node-handle-label text-[11px] leading-none" style={{ color: "#4ade80" }}>image</span>
            <span className="node-handle-label text-[11px] leading-none" style={{ color: "#fb923c" }}>video</span>
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

        {videoUrl ? (
          <div className="space-y-1">
            <video
              src={videoUrl}
              controls
              className="w-full rounded border bg-muted"
              playsInline
            />
            <a
              href={videoUrl}
              download="spin.mp4"
              className="text-primary text-xs underline"
            >
              Download MP4
            </a>
          </div>
        ) : (
          <div className="text-muted-foreground flex h-20 items-center justify-center rounded border border-dashed text-xs">
            {status === "processing"
              ? "Rendering…"
              : "Connect 3D Modeling and run pipeline"}
          </div>
        )}
      </NodeContent>

      <NodeFooter className="flex items-center gap-2">
        <span
          className={cn(
            "text-xs",
            status === "complete" && "text-green-600",
            status === "error" && "text-destructive"
          )}
        >
          {status === "idle" && "Idle"}
          {status === "processing" && "Rendering…"}
          {status === "complete" && "Complete"}
          {status === "error" && (error || "Error")}
        </span>
      </NodeFooter>
    </CanvasNode>
  );
}
