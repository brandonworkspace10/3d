"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeftIcon,
  BoxIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getModel, updateModel, removeModel } from "@/lib/models/storage";
import type { ModelProfile } from "@/components/canvas/model-setup-card";
import { cn } from "@/lib/utils";

const DEFAULT_QUESTIONS = [
  "What is the skin tone?",
  "What hairstyle and color?",
  "What clothing style?",
];

export default function AvatarEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [profile, setProfile] = useState<ModelProfile | null>(null);
  const [name, setName] = useState("");
  const [lookQuestions, setLookQuestions] = useState<string[]>(DEFAULT_QUESTIONS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const p = getModel(id);
    if (p) {
      setProfile(p);
      setName(p.name);
      setLookQuestions(
        p.lookQuestions?.length ? p.lookQuestions : DEFAULT_QUESTIONS
      );
    } else {
      setProfile(null);
    }
  }, [id]);

  const handleSave = useCallback(() => {
    if (!profile) return;
    updateModel({
      ...profile,
      name,
      lookQuestions: lookQuestions.filter((q) => q.trim()),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [profile, name, lookQuestions]);

  const handleDelete = useCallback(() => {
    if (!confirm(`Delete "${profile?.name ?? "this avatar"}"?`)) return;
    removeModel(id);
    router.push("/dashboard");
  }, [id, profile?.name, router]);

  const handleQuestionChange = useCallback((index: number, value: string) => {
    setLookQuestions((q) => {
      const next = [...q];
      next[index] = value;
      return next;
    });
  }, []);

  const handleAddQuestion = useCallback(() => {
    setLookQuestions((q) => [...q, ""]);
  }, []);

  const handleRemoveQuestion = useCallback((index: number) => {
    setLookQuestions((q) => q.filter((_, i) => i !== index));
  }, []);

  if (!profile && id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Avatar not found</p>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col bg-neutral-50 dark:bg-neutral-950",
        "transition-colors duration-300"
      )}
    >
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border/50 bg-card/80 px-6 py-4 backdrop-blur-sm dark:border-white/10 dark:bg-neutral-900/80">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeftIcon className="size-4" />
            Back to dashboard
          </Button>
          <span className="text-muted-foreground">|</span>
          <div className="flex items-center gap-2">
            <BoxIcon className="text-muted-foreground size-5" />
            <span className="font-medium dark:text-white">Edit avatar</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2Icon className="mr-1.5 size-4" />
            Delete
          </Button>
          <Button size="sm" onClick={handleSave}>
            {saved ? "Saved" : "Save"}
          </Button>
        </div>
      </header>

      {/* Main content - spacious layout */}
      <main className="flex flex-1 gap-6 p-6">
        {/* Left sidebar - config */}
        <aside className="flex w-80 shrink-0 flex-col gap-6">
          <section className="rounded-xl border border-border/60 bg-card p-4 dark:border-white/10 dark:bg-neutral-900/95">
            <label className="mb-2 block text-sm font-medium dark:text-white">
              Avatar name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring dark:border-white/20 dark:bg-neutral-800 dark:text-white"
              placeholder="Untitled Avatar"
            />
          </section>

          <section className="rounded-xl border border-border/60 bg-card p-4 dark:border-white/10 dark:bg-neutral-900/95">
            <div className="mb-3 flex items-center gap-2">
              <SlidersHorizontalIcon className="text-muted-foreground size-4" />
              <h2 className="text-sm font-medium dark:text-white">
                Look configuration
              </h2>
            </div>
            <p className="text-muted-foreground mb-3 text-xs">
              Questions asked when configuring this avatar&apos;s appearance
            </p>
            <div className="space-y-2">
              {lookQuestions.map((q, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={q}
                    onChange={(e) => handleQuestionChange(i, e.target.value)}
                    placeholder={`Question ${i + 1}`}
                    className="flex-1 rounded border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring dark:border-white/20 dark:bg-neutral-800 dark:text-white"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveQuestion(i)}
                    aria-label="Remove question"
                  >
                    ×
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleAddQuestion}
              >
                + Add question
              </Button>
            </div>
          </section>
        </aside>

        {/* Main editing area - digital human */}
        <section className="flex min-h-0 flex-1 flex-col rounded-xl border-2 border-dashed border-border/60 bg-card/50 dark:border-white/10 dark:bg-neutral-900/50">
          <div className="flex flex-1 flex-col items-center justify-center p-12">
            <BoxIcon className="text-muted-foreground mb-4 size-20" />
            <h3 className="mb-2 text-lg font-medium dark:text-white">
              Digital human editor
            </h3>
            <p className="text-muted-foreground max-w-md text-center text-sm">
              This area will provide more space to edit and preview your avatar
              — 3D view, appearance controls, and customization tools coming
              soon.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
