"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { SlidersHorizontalIcon } from "lucide-react";
import { useCallback, useState } from "react";
import {
  Node as CanvasNode,
  NodeAction,
  NodeContent,
  NodeHeader,
  NodeTitle,
} from "@/components/ai-elements/node";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

export type ModelNodeData = {
  label: string;
  modelId?: string;
  /** Questions asked to configure the avatar's looks */
  lookQuestions?: string[];
};

const DEFAULT_QUESTIONS = [
  "What is the skin tone?",
  "What hairstyle and color?",
  "What clothing style?",
];

type ModelNode = Node<ModelNodeData, "model">;
export type ModelNodeProps = NodeProps<ModelNode>;

function AvatarAdjustPopover({
  nodeId,
  lookQuestions,
  onSave,
}: {
  nodeId: string;
  lookQuestions: string[];
  onSave: (questions: string[]) => void;
}) {
  const [questions, setQuestions] = useState<string[]>(
    lookQuestions.length > 0 ? lookQuestions : DEFAULT_QUESTIONS
  );
  const [open, setOpen] = useState(false);

  const handleAdd = useCallback(() => {
    setQuestions((q) => [...q, ""]);
  }, []);

  const handleChange = useCallback((index: number, value: string) => {
    setQuestions((q) => {
      const next = [...q];
      next[index] = value;
      return next;
    });
  }, []);

  const handleRemove = useCallback((index: number) => {
    setQuestions((q) => q.filter((_, i) => i !== index));
  }, []);

  const handleSave = useCallback(() => {
    onSave(questions.filter((q) => q.trim()));
    setOpen(false);
  }, [questions, onSave]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={(props) => (
          <Button
            {...props}
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-muted-foreground hover:bg-accent hover:text-foreground dark:hover:bg-white/10 dark:hover:text-white"
            title="Adjust avatar looks"
            aria-label="Adjust avatar looks"
          >
            <SlidersHorizontalIcon className="size-4" />
          </Button>
        )}
      />
      <PopoverContent align="end" side="bottom" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Avatar look questions</PopoverTitle>
          <p className="text-muted-foreground text-xs">
            Questions asked when configuring this avatar&apos;s appearance
          </p>
        </PopoverHeader>
        <div className="space-y-2">
          {questions.map((q, i) => (
            <div key={i} className="flex gap-1">
              <input
                type="text"
                value={q}
                onChange={(e) => handleChange(i, e.target.value)}
                placeholder={`Question ${i + 1}`}
                className="flex-1 rounded border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring dark:border-white/20 dark:bg-neutral-800"
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemove(i)}
                aria-label="Remove question"
              >
                ×
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full" onClick={handleAdd}>
            + Add question
          </Button>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ModelNode({ id, data }: ModelNodeProps) {
  const { label, lookQuestions = [] } = data;
  const { setNodes } = useReactFlow();

  const handleSaveQuestions = useCallback(
    (questions: string[]) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, lookQuestions: questions } }
            : n
        )
      );
    },
    [id, setNodes]
  );

  return (
    <CanvasNode handles={{ target: false, source: true }}>
      <NodeHeader>
        <NodeTitle>{label || "Avatar"}</NodeTitle>
        <NodeAction>
          <AvatarAdjustPopover
            nodeId={id}
            lookQuestions={lookQuestions}
            onSave={handleSaveQuestions}
          />
        </NodeAction>
      </NodeHeader>
      <NodeContent className="text-muted-foreground text-xs">
        Active model context for this project
      </NodeContent>
    </CanvasNode>
  );
}
