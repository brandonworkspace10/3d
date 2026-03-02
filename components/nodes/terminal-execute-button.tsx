"use client";

import { useEdges, useNodes } from "@xyflow/react";
import { PlayIcon } from "lucide-react";
import { createContext, useCallback, useContext, useMemo } from "react";
import { NodeAction } from "@/components/ai-elements/node";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PipelineNodeType } from "@/lib/pipeline/types";

const TOPO_ORDER: PipelineNodeType[] = [
  "imageUpload",
  "backgroundRemover",
  "lighting",
  "generate3d",
  "spinVideo",
  "backgroundReplace",
];

const PIPELINE_TYPES = new Set<string>(TOPO_ORDER);

/** Only function nodes (that transform images) get the Execute button—not upload. */
const FUNCTION_NODE_TYPES = new Set<string>([
  "backgroundRemover",
  "lighting",
  "generate3d",
  "spinVideo",
  "backgroundReplace",
]);

type PipelineExecuteContextValue = {
  runPipeline: () => Promise<void>;
  running: boolean;
};

const PipelineExecuteContext = createContext<PipelineExecuteContextValue | null>(
  null
);

export function usePipelineExecute() {
  const ctx = useContext(PipelineExecuteContext);
  if (!ctx) return null;
  return ctx;
}

export function PipelineExecuteProvider({
  runPipeline,
  running,
  children,
}: {
  runPipeline: () => Promise<void>;
  running: boolean;
  children: React.ReactNode;
}) {
  const value: PipelineExecuteContextValue = {
    runPipeline,
    running,
  };
  return (
    <PipelineExecuteContext.Provider value={value}>
      {children}
    </PipelineExecuteContext.Provider>
  );
}

const OUTPUT_NODE_ID = "pipeline-output";

/** Returns the node id of the single "last" node in the workflow (furthest downstream sink). */
function useLastNodeId(): string | null {
  const nodes = useNodes();
  const edges = useEdges();

  return useMemo(() => {
    // A function node is a sink if it has no outgoing edges to other pipeline nodes.
    // Edges to the Output node don't count—Execute stays on the node after execution.
    const functionSinks = nodes.filter(
      (n) =>
        FUNCTION_NODE_TYPES.has(n.type ?? "") &&
        !edges.some(
          (e) => e.source === n.id && e.target !== OUTPUT_NODE_ID
        )
    );
    if (functionSinks.length === 0) return null;

    let last = functionSinks[0]!;
    let lastIdx = TOPO_ORDER.indexOf((last.type ?? "") as PipelineNodeType);
    for (const s of functionSinks) {
      const idx = TOPO_ORDER.indexOf((s.type ?? "") as PipelineNodeType);
      if (idx > lastIdx) {
        last = s;
        lastIdx = idx;
      }
    }
    return last.id;
  }, [nodes, edges]);
}

export function TerminalExecuteButton({ nodeId }: { nodeId: string }) {
  const lastNodeId = useLastNodeId();
  const ctx = usePipelineExecute();
  const allNodes = useNodes();
  const allEdges = useEdges();

  const isLastNode = lastNodeId === nodeId;

  const promptsReady = useMemo(() => {
    let hasPromptNodes = false;
    for (const n of allNodes) {
      if (n.type !== "promptNode") continue;
      const isConnected = allEdges.some((e) => e.source === n.id);
      if (!isConnected) continue;
      hasPromptNodes = true;
      const p = (n.data as Record<string, unknown>).prompt;
      if (!p || !(p as string).trim()) return false;
    }
    return hasPromptNodes;
  }, [allNodes, allEdges]);

  const handleClick = useCallback(() => {
    if (ctx?.runPipeline && !ctx.running) {
      ctx.runPipeline();
    }
  }, [ctx?.runPipeline, ctx?.running]);

  if (!isLastNode || !ctx) return null;

  return (
    <NodeAction>
      <Button
        size="sm"
        variant="outline"
        onClick={handleClick}
        disabled={ctx.running}
        className={cn(
          "h-6 gap-1 px-1.5 text-xs dark:border-white/30 dark:text-white dark:hover:bg-white/10 dark:hover:text-white",
          promptsReady && "border-green-500/50 dark:border-green-400/40"
        )}
        title="Run workflow"
      >
        <PlayIcon className="size-3" />
        Execute
      </Button>
    </NodeAction>
  );
}
