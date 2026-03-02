"use client";

import type { Node, NodeProps } from "@xyflow/react";
import dynamic from "next/dynamic";
import {
  DownloadIcon,
  ExternalLinkIcon,
  CopyIcon,
  CheckIcon,
} from "lucide-react";
import { useCallback, useState } from "react";
import {
  Node as CanvasNode,
  NodeContent,
  NodeFooter,
  NodeHeader,
  NodeTitle,
} from "@/components/ai-elements/node";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PipelineOutputData } from "@/lib/pipeline/types";

const ModelViewerPreview = dynamic(
  () =>
    import("@google/model-viewer").then(() => {
      function Preview({ src, alt }: { src: string; alt?: string }) {
        return (
          // @ts-expect-error - model-viewer is a custom element
          <model-viewer
            src={src}
            alt={alt ?? "3D model"}
            camera-controls
            auto-rotate
            shadow-intensity="1"
            style={{ width: "100%", height: 180 }}
          />
        );
      }
      return Preview;
    }),
  { ssr: false }
);

type PipelineOutputNode = Node<PipelineOutputData, "pipelineOutput">;
export type PipelineOutputNodeProps = NodeProps<PipelineOutputNode>;

function getAbsoluteUrl(path: string): string {
  if (typeof window !== "undefined") {
    return path.startsWith("http") ? path : `${window.location.origin}${path}`;
  }
  return path.startsWith("http") ? path : `http://localhost:3000${path}`;
}

export function PipelineOutputNode({ data }: PipelineOutputNodeProps) {
  const { label, status, kind, error, outputs3d, videoUrl, renderUrl } = data;
  const [copied, setCopied] = useState(false);

  const shareUrl =
    status === "complete" && (videoUrl || renderUrl || outputs3d?.viewerUrl || outputs3d?.glb)
      ? getAbsoluteUrl(
          videoUrl ?? renderUrl ?? outputs3d?.viewerUrl ?? outputs3d?.glb ?? ""
        )
      : null;

  const copyLink = useCallback(() => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [shareUrl]);

  return (
    <CanvasNode
      handles={{ target: true, source: false }}
      className="w-80 min-w-80"
    >
      <NodeHeader>
        <NodeTitle>{label || "Output"}</NodeTitle>
      </NodeHeader>
      <NodeContent className="space-y-3">
        {status === "complete" && (
          <>
            {/* Primary: In-canvas preview */}
            <div className="space-y-2">
              {kind === "3d" && outputs3d?.glb && (
                <div className="relative overflow-hidden rounded-md border bg-neutral-900">
                  <ModelViewerPreview
                    src={getAbsoluteUrl(outputs3d.glb)}
                    alt="3D model preview"
                  />
                </div>
              )}
              {kind === "video" && videoUrl && (
                <div className="overflow-hidden rounded-md border bg-muted">
                  <video
                    src={videoUrl}
                    controls
                    playsInline
                    className="w-full"
                  />
                </div>
              )}
              {kind === "image" && renderUrl && (
                <div className="relative aspect-square overflow-hidden rounded-md border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={renderUrl}
                    alt="Output"
                    className="size-full object-cover"
                  />
                </div>
              )}
            </div>

            {/* Export actions */}
            <div className="flex flex-wrap gap-1.5">
              {kind === "3d" && outputs3d && (
                <>
                  {outputs3d.glb && (
                    <a
                      href={getAbsoluteUrl(outputs3d.glb)}
                      download="model.glb"
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs font-medium shadow-xs transition-colors hover:bg-muted hover:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50"
                    >
                      <DownloadIcon className="size-3" />
                      GLB
                    </a>
                  )}
                  {outputs3d.usdz && (
                    <a
                      href={getAbsoluteUrl(outputs3d.usdz)}
                      download="model.usdz"
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs font-medium shadow-xs transition-colors hover:bg-muted hover:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50"
                    >
                      <DownloadIcon className="size-3" />
                      USDZ
                    </a>
                  )}
                </>
              )}
              {kind === "video" && videoUrl && (
                <a
                  href={videoUrl}
                  download="spin.mp4"
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs font-medium shadow-xs transition-colors hover:bg-muted hover:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50"
                >
                  <DownloadIcon className="size-3" />
                  MP4
                </a>
              )}
              {kind === "image" && renderUrl && (
                <a
                  href={renderUrl}
                  download="output.png"
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs font-medium shadow-xs transition-colors hover:bg-muted hover:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50"
                >
                  <DownloadIcon className="size-3" />
                  PNG
                </a>
              )}
            </div>

            {/* Shareable link (secondary) */}
            {shareUrl && (
              <div className="flex items-center gap-1.5 rounded border bg-muted/50 px-2 py-1.5">
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground flex flex-1 items-center gap-1 truncate text-xs underline"
                  title={shareUrl}
                >
                  <ExternalLinkIcon className="size-3 shrink-0" />
                  <span className="truncate">{shareUrl}</span>
                </a>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 shrink-0 p-0"
                  onClick={copyLink}
                  title="Copy link"
                  aria-label="Copy shareable link"
                >
                  {copied ? (
                    <CheckIcon className="size-3 text-green-600" />
                  ) : (
                    <CopyIcon className="size-3" />
                  )}
                </Button>
              </div>
            )}
          </>
        )}
        {status === "idle" && (
          <div className="text-muted-foreground flex h-24 items-center justify-center rounded-md border border-dashed text-xs">
            Run pipeline to see output
          </div>
        )}
        {status === "error" && (
          <div className="text-destructive text-xs">{error || "Pipeline failed"}</div>
        )}
      </NodeContent>
      <NodeFooter className="flex items-center gap-2">
        <span
          className={cn(
            "text-xs",
            status === "complete" && "text-green-600",
            status === "error" && "text-destructive",
            status === "idle" && "text-muted-foreground"
          )}
        >
          {status === "idle" && "Idle"}
          {status === "complete" && "Complete"}
          {status === "error" && (error || "Error")}
        </span>
      </NodeFooter>
    </CanvasNode>
  );
}
