"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import { CheckCircleIcon, ImageIcon, XIcon, XCircleIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import {
  Node as CanvasNode,
  NodeContent,
  NodeFooter,
  NodeHeader,
  NodeTitle,
} from "@/components/ai-elements/node";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ImageUploadData } from "@/lib/pipeline/types";

const VIEW_SLOTS = ["front", "right", "left", "back"] as const;
type ViewSlot = (typeof VIEW_SLOTS)[number];

const VIEW_LABELS: Record<ViewSlot, string> = {
  front: "Front view (required)",
  right: "Right side (optional)",
  left: "Left side (optional)",
  back: "Back view (optional)",
};

type ImageUploadNode = Node<ImageUploadData, "imageUpload">;
export type ImageUploadNodeProps = NodeProps<ImageUploadNode>;

export function ImageUploadNode({ id, data }: ImageUploadNodeProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { setNodes } = useReactFlow();
  const [activeSlot, setActiveSlot] = useState<ViewSlot>("front");

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.currentTarget.files;
      if (!files?.length) return;
      const [file] = Array.from(files);
      if (!file) return;

      // Determine which view slot we are uploading for
      const slot = activeSlot;
      const slotIndex = VIEW_SLOTS.indexOf(slot);
      if (slotIndex === -1) return;

      const filesToUpload = [file];

      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  validation: { status: "validating" as const, errors: [] },
                },
              }
            : n
        )
      );

      const formData = new FormData();
      filesToUpload.forEach((f) => formData.append("files", f));
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        setNodes((nodes) =>
          nodes.map((n) =>
            n.id === id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    validation: {
                      status: "failed" as const,
                      errors: [{ imageId: "", type: "blur" as const, message: "Upload failed" }],
                    },
                  },
                }
              : n
          )
        );
        return;
      }
      const json = await res.json();
      const results = Array.isArray(json.results) ? json.results : [];
      const newImages = results.map(
        (r: { id: string; url: string; name: string; size: number }) => ({
          id: r.id,
          url: r.url,
          name: r.name,
          size: r.size,
        })
      );
      const newErrors = results.flatMap(
        (r: { id: string; errors: { type: string; message: string }[] }) =>
          (r.errors || []).map((err: { type: string; message: string }) => ({
            imageId: r.id,
            type: err.type as "blur" | "resolution" | "angles",
            message: err.message,
          }))
      );

      setNodes((nodes) =>
        nodes.map((n) => {
          if (n.id !== id) return n;
          const prevData = n.data as unknown as ImageUploadData;
          const prevImages = prevData.images ?? [];
          const prevErrors = prevData.validation?.errors ?? [];
          const images = [...prevImages];
          const uploaded = newImages[0];
          if (uploaded) {
            // Place or replace the image in the slot index
            images[slotIndex] = uploaded;
          }
          const errors = [...prevErrors, ...newErrors];
          const frontImageId = images[0]?.id;
          const hasErrorOnRequiredFront = frontImageId
            ? errors.some((e) => e.imageId === frontImageId)
            : false;
          const status = hasErrorOnRequiredFront ? ("failed" as const) : ("passed" as const);

          return {
            ...n,
            data: {
              ...prevData,
              images,
              validation: { status, errors },
            },
          };
        })
      );
      if (inputRef.current) inputRef.current.value = "";
    },
    [id, setNodes, activeSlot]
  );

  const handleRemoveImage = useCallback(
    (imageId: string) => {
      setNodes((nodes) =>
        nodes.map((n) => {
          if (n.id !== id) return n;
          const prevData = n.data as unknown as ImageUploadData;
          const prevImages = prevData.images ?? [];
          const prevErrors = prevData.validation?.errors ?? [];
          const images = prevImages.filter((img) => img.id !== imageId);
          const errors = prevErrors.filter((err) => err.imageId !== imageId);
          const status =
            errors.length > 0 ? ("failed" as const) : ("passed" as const);
          return {
            ...n,
            data: {
              ...prevData,
              images,
              validation: { status, errors },
            },
          };
        })
      );
    },
    [id, setNodes]
  );

  const { label, validation } = data;
  const images = (data.images ?? []) as ImageUploadData["images"];
  const hasImages = images.length > 0;
  const passed = validation.status === "passed";
  const failed = validation.status === "failed";

  return (
    <CanvasNode handles={{ target: false, source: false }}>
      {/* Notch behind handle */}
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
        <NodeTitle>{label || "Upload Asset Views"}</NodeTitle>
      </NodeHeader>
      <NodeContent className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="grid grid-cols-2 gap-2">
          {VIEW_SLOTS.map((slot, index) => {
            const img = images[index];
            const labelText = VIEW_LABELS[slot];
            return (
              <div
                key={slot}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setActiveSlot(slot);
                  inputRef.current?.click();
                }}
                className={cn(
                  "border-border bg-muted/50 hover:bg-muted flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground transition-colors relative overflow-hidden"
                )}
              >
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img.url}
                    alt={img.name}
                    className="size-full object-cover"
                  />
                ) : (
                  <>
                    <ImageIcon className="size-6" />
                    <span className="text-xs text-center">{labelText}</span>
                  </>
                )}
                {img && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 pb-1.5 pt-3 text-left text-[10px] text-white">
                    {labelText}
                  </div>
                )}
                {img && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage(img.id);
                    }}
                    className="bg-background/90 text-foreground hover:bg-destructive hover:text-destructive-foreground absolute right-0.5 top-0.5 flex size-5 shrink-0 items-center justify-center rounded-full shadow-sm transition-colors"
                    aria-label={`Remove ${img.name}`}
                  >
                    <XIcon className="size-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </NodeContent>
      <NodeFooter className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
        {validation.status === "validating" && (
          <span className="text-muted-foreground text-xs">Validating…</span>
        )}
        {passed && (
          <span className="text-green-600 flex items-center gap-1 text-xs">
            <CheckCircleIcon className="size-3.5" /> Passed
            {validation.errors.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <span
                    role="button"
                    tabIndex={0}
                    className="text-muted-foreground hover:text-foreground ml-0.5 cursor-pointer underline decoration-dotted"
                    aria-label="Optional view issues"
                  >
                    ({validation.errors.length} optional view
                    {validation.errors.length !== 1 ? "s" : ""} with issue
                    {validation.errors.length !== 1 ? "s" : ""})
                  </span>
                </PopoverTrigger>
                <PopoverContent
                  side="top"
                  align="start"
                  className="max-h-48 w-64 overflow-y-auto"
                >
                  <div className="space-y-2">
                    <p className="font-medium text-sm">Optional view issues</p>
                    <ul className="space-y-1.5 text-xs">
                      {validation.errors.map((err, i) => {
                        const idx = images.findIndex((img) => img.id === err.imageId);
                        const viewLabel =
                          idx >= 0 && idx < VIEW_SLOTS.length
                            ? VIEW_LABELS[VIEW_SLOTS[idx]]
                            : images.find((img) => img.id === err.imageId)?.name ?? "Image";
                        return (
                          <li key={`${err.imageId}-${err.type}-${i}`}>
                            <span className="font-medium text-foreground">
                              {viewLabel}:
                            </span>{" "}
                            {err.message}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </span>
        )}
        {failed && (
          <Popover>
            <PopoverTrigger asChild>
              <span
                role="button"
                tabIndex={0}
                className="text-destructive hover:underline flex cursor-pointer items-center gap-1 text-left text-xs"
              >
                <XCircleIcon className="size-3.5 shrink-0" />{" "}
                {validation.errors.length} issue(s)
              </span>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="start"
              className="max-h-48 w-64 overflow-y-auto"
            >
              <div className="space-y-2">
                <p className="font-medium text-sm">Validation issues</p>
                <ul className="space-y-1.5 text-xs">
                  {validation.errors.map((err, i) => {
                    const idx = images.findIndex((img) => img.id === err.imageId);
                    const viewLabel =
                      idx >= 0 && idx < VIEW_SLOTS.length
                        ? VIEW_LABELS[VIEW_SLOTS[idx]]
                        : images.find((img) => img.id === err.imageId)?.name ?? "Image";
                    return (
                      <li key={`${err.imageId}-${err.type}-${i}`}>
                        <span className="font-medium text-foreground">
                          {viewLabel}:
                        </span>{" "}
                        {err.message}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </PopoverContent>
          </Popover>
        )}
        </div>
        <span className="node-handle-label text-[11px] leading-none" style={{ color: "#4ade80" }}>image</span>
      </NodeFooter>
    </CanvasNode>
  );
}
