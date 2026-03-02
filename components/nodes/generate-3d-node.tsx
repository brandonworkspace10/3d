"use client";

import type { Node, NodeProps } from "@xyflow/react";
import {
  Node as CanvasNode,
  NodeContent,
  NodeFooter,
  NodeHeader,
  NodeTitle,
} from "@/components/ai-elements/node";
import { TerminalExecuteButton } from "@/components/nodes/terminal-execute-button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Generate3DData } from "@/lib/pipeline/types";

type Generate3DNode = Node<Generate3DData, "generate3d">;
export type Generate3DNodeProps = NodeProps<Generate3DNode>;

export function Generate3DNode({ id, data }: Generate3DNodeProps) {
  const { label, status, progress, outputs, error } = data;
  const hasOutputs =
    outputs.glb || outputs.usdz || outputs.viewerUrl;

  return (
    <CanvasNode handles={{ target: true, source: true }}>
      <NodeHeader>
        <NodeTitle>{label || "3D Modeling"}</NodeTitle>
        <TerminalExecuteButton nodeId={id} />
      </NodeHeader>
      <NodeContent className="space-y-2">
        {status === "processing" && (
          <div className="space-y-1">
            <Progress value={progress} className="h-2" />
            <span className="text-muted-foreground text-xs">{progress}%</span>
          </div>
        )}
        {hasOutputs && (
          <div className="flex flex-wrap gap-1">
            {outputs.glb && (
              <span className="bg-muted rounded px-1.5 py-0.5 text-xs">GLB</span>
            )}
            {outputs.usdz && (
              <span className="bg-muted rounded px-1.5 py-0.5 text-xs">USDZ</span>
            )}
            {outputs.viewerUrl && (
              <span className="bg-muted rounded px-1.5 py-0.5 text-xs">
                Viewer
              </span>
            )}
          </div>
        )}
        {status === "idle" && !hasOutputs && (
          <div className="text-muted-foreground text-center text-xs">
            Connect inputs and run pipeline
          </div>
        )}
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
          {status === "processing" && "Generating…"}
          {status === "complete" && "Complete"}
          {status === "error" && (error || "Error")}
        </span>
      </NodeFooter>
    </CanvasNode>
  );
}
