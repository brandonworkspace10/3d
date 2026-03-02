"use client";

import { BoxIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";

export type ModelSetupCardMode = "create" | "generate";

export type ModelProfile = {
  id: string;
  name: string;
  mode: ModelSetupCardMode;
  createdAt: number;
  /** Questions asked to configure the avatar's looks */
  lookQuestions?: string[];
};

type ModelSetupCardProps = {
  mode: ModelSetupCardMode;
  onComplete: (profile: ModelProfile) => void;
  onCancel: () => void;
};

const defaultName = "Untitled Avatar";

export function ModelSetupCard({ mode, onComplete, onCancel }: ModelSetupCardProps) {
  const [name, setName] = useState(defaultName);

  const handleComplete = useCallback(() => {
    const profile: ModelProfile = {
      id: `model-${Date.now()}`,
      name: name.trim() || defaultName,
      mode,
      createdAt: Date.now(),
    };
    onComplete(profile);
  }, [name, mode, onComplete]);

  const title = mode === "create" ? "Create Avatar" : "Generate Avatar";
  const description =
    mode === "create"
      ? "Define your model specs and save as a profile."
      : "Generate a model with AI and save as a profile.";

  return (
    <div
      className="fixed left-1/2 top-1/2 z-[60] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border/60 bg-card shadow-xl backdrop-blur-sm dark:border-white/10 dark:bg-neutral-900/95"
      role="dialog"
      aria-modal="true"
      aria-labelledby="model-setup-title"
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2">
          <BoxIcon className="size-5 text-muted-foreground" />
          <h2 id="model-setup-title" className="text-lg font-semibold dark:text-white">
            {title}
          </h2>
        </div>
        <p className="text-muted-foreground text-sm dark:text-neutral-400">{description}</p>

        <div className="space-y-2">
          <label htmlFor="model-name" className="text-sm font-medium dark:text-white">
            Avatar name
          </label>
          <input
            id="model-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={defaultName}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring dark:border-white/20 dark:bg-neutral-800 dark:text-white"
          />
        </div>

        {mode === "create" && (
          <div className="text-muted-foreground rounded-md border border-dashed border-border/60 p-4 text-sm dark:border-white/10 dark:text-neutral-400">
            <p className="font-medium dark:text-neutral-300">Avatar specs</p>
            <p className="mt-1 text-xs">Additional configuration options will appear here.</p>
          </div>
        )}

        {mode === "generate" && (
          <div className="text-muted-foreground rounded-md border border-dashed border-border/60 p-4 text-sm dark:border-white/10 dark:text-neutral-400">
            <p className="font-medium dark:text-neutral-300">Generate with AI</p>
            <p className="mt-1 text-xs">AI-powered model generation options coming soon.</p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleComplete}>
            Complete
          </Button>
        </div>
      </div>
    </div>
  );
}
