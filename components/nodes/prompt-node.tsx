"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { PromptNodeData } from "@/lib/pipeline/types";

const HANDLE_SIZE = 16;

const LABEL_MAP: Record<string, string> = {
  lighting: "Scene Light Prompt",
  spinVideo: "Showcase Prompt",
  backgroundReplace: "Brand Scene Prompt",
};

type PromptNodeType = Node<PromptNodeData, "promptNode">;
export type PromptNodeProps = NodeProps<PromptNodeType>;

const TEXTAREA_MIN_HEIGHT = 32;
/** Align with parent node's target-prompt handle (e.g. TARGET_PROMPT_TOP = 94) so the edge connects to prompt, not image */
const SOURCE_HANDLE_TOP = 94;

export function PromptNode({ id, data }: PromptNodeProps) {
  const { setNodes } = useReactFlow();
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { parentType, prompt, promptMissing } = data;

  const label = LABEL_MAP[parentType] ?? "Prompt";

  const syncHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0";
    el.style.height = `${Math.max(TEXTAREA_MIN_HEIGHT, el.scrollHeight)}px`;
  }, []);

  useEffect(() => {
    syncHeight();
  }, [prompt, syncHeight]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setEnhanceError(null);
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, prompt: val, promptMissing: false } }
            : n
        )
      );
    },
    [id, setNodes]
  );

  const handleEnhance = useCallback(async () => {
    const raw = (prompt ?? "").trim();
    if (!raw) return;
    setEnhancing(true);
    setEnhanceError(null);
    try {
      const res = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: raw }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Enhance failed");
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, prompt: json.enhancedPrompt } }
            : n
        )
      );
    } catch (e) {
      setEnhanceError(e instanceof Error ? e.message : "Enhance failed");
    } finally {
      setEnhancing(false);
    }
  }, [id, prompt, setNodes]);

  return (
    <div
      style={{ width: 220, minHeight: 140 }}
      className="relative overflow-visible rounded-md border border-border bg-card shadow-sm flex flex-col"
    >
      {/* Notch behind handle — aligned with prompt row so edge connects to parent's prompt handle */}
      <div
        style={{
          position: "absolute",
          top: SOURCE_HANDLE_TOP,
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
        id="source-prompt"
        type="source"
        position={Position.Right}
        style={{ top: SOURCE_HANDLE_TOP, width: 12, height: 12 }}
        data-handletype="prompt"
      />

      {/* Header — rounded-t-md needed since parent is overflow-visible */}
      <div className="flex items-center justify-between rounded-t-md border-b border-border bg-secondary px-3 py-2">
        <span className="text-xs font-medium leading-none text-foreground">
          {label}
        </span>
        <button
          type="button"
          onClick={handleEnhance}
          disabled={enhancing || !(prompt ?? "").trim()}
          className="nodrag nowheel font-medium leading-none disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            backgroundColor: "#16a34a",
            color: "#fff",
            borderRadius: "6px",
            fontSize: "11px",
            padding: "4px 10px",
            border: "none",
            cursor: enhancing || !(prompt ?? "").trim() ? "not-allowed" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {enhancing ? "Enhancing..." : "Enhance"}
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-1.5 px-3 py-2">
        <textarea
          ref={textareaRef}
          className={cn(
            "nodrag nowheel w-full resize-none overflow-hidden rounded border border-border bg-transparent px-2 py-1 text-[11px] leading-tight placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring",
            promptMissing && "animate-pulse border-red-500 dark:border-red-400"
          )}
          style={{ minHeight: TEXTAREA_MIN_HEIGHT }}
          placeholder="Describe your scene..."
          value={prompt ?? ""}
          onChange={handleChange}
          onInput={syncHeight}
        />
        {enhanceError && (
          <span className="truncate text-[10px] leading-none text-destructive">
            {enhanceError}
          </span>
        )}
      </div>
    </div>
  );
}
