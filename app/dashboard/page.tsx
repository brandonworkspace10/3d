"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  BoxIcon,
  FilePlusIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getProjects,
  getProject,
  deleteProject,
  saveProject,
  type ProjectMeta,
  type ProjectData,
} from "@/lib/projects/storage";
import { getSavedModels, removeModel, saveModel } from "@/lib/models/storage";
import type { ModelProfile } from "@/components/canvas/model-setup-card";
import { cn } from "@/lib/utils";

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return d.toLocaleDateString();
}

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [avatars, setAvatars] = useState<ModelProfile[]>([]);

  const loadProjects = useCallback(() => {
    setProjects(getProjects());
  }, []);

  const loadAvatars = useCallback(() => {
    setAvatars(getSavedModels());
  }, []);

  useEffect(() => {
    loadProjects();
    loadAvatars();
  }, [loadProjects, loadAvatars]);

  const handleNewProject = useCallback(() => {
    const id = `project-${Date.now()}`;
    const data: ProjectData = {
      id,
      name: "Untitled workflow",
      updatedAt: Date.now(),
      nodes: [],
      edges: [],
    };
    saveProject(data);
    loadProjects();
    router.push(`/canvas/${id}`);
  }, [router, loadProjects]);

  const handleOpenProject = useCallback(
    (id: string) => {
      router.push(`/canvas/${id}`);
    },
    [router]
  );

  const handleRenameProject = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const p = getProject(id);
      if (!p) return;
      const next = window.prompt("Rename project", p.name ?? "Untitled workflow");
      if (next != null && next.trim()) {
        saveProject({
          ...p,
          id,
          name: next.trim(),
          updatedAt: Date.now(),
        });
        loadProjects();
      }
    },
    [loadProjects]
  );

  const handleDeleteProject = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (confirm("Delete this workflow?")) {
        deleteProject(id);
        loadProjects();
      }
    },
    [loadProjects]
  );

  const handleNewAvatar = useCallback(() => {
    const id = `model-${Date.now()}`;
    const profile: ModelProfile = {
      id,
      name: "Untitled Avatar",
      mode: "create",
      createdAt: Date.now(),
    };
    saveModel(profile);
    loadAvatars();
    router.push(`/avatar/${id}`);
  }, [router, loadAvatars]);

  const handleOpenAvatar = useCallback(
    (id: string) => {
      router.push(`/avatar/${id}`);
    },
    [router]
  );

  const handleDeleteAvatar = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (confirm("Delete this avatar?")) {
        removeModel(id);
        loadAvatars();
      }
    },
    [loadAvatars]
  );

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col bg-neutral-50 dark:bg-neutral-950",
        "transition-colors duration-300"
      )}
    >
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border/50 bg-card/80 px-6 py-4 backdrop-blur-sm dark:border-white/10 dark:bg-neutral-900/80">
        <div className="flex items-center gap-3">
          <span className="text-xl font-semibold tracking-tight dark:text-white">
            23D
          </span>
          <span className="text-muted-foreground text-sm">Dashboard</span>
        </div>
        <Button onClick={handleNewProject} size="sm" className="gap-2">
          <FilePlusIcon className="size-4" />
          New workflow
        </Button>
      </header>

      {/* Main content - two columns */}
      <main className="flex-1 p-6">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
          {/* Workflows section */}
          <section className="flex flex-col">
            <h2 className="text-muted-foreground mb-4 text-sm font-medium">
              Your workflows
            </h2>
            {projects.length === 0 ? (
            <div
              className={cn(
                "flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/60 py-24 dark:border-white/10"
              )}
            >
              <BoxIcon className="text-muted-foreground mb-4 size-12" />
              <p className="text-muted-foreground mb-2 text-sm">
                No workflows yet
              </p>
              <p className="text-muted-foreground mb-6 max-w-sm text-center text-xs">
                Create a workflow to build 3D assets from images
              </p>
              <Button onClick={handleNewProject} size="sm" className="gap-2">
                <FilePlusIcon className="size-4" />
                Create your first workflow
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-1">
              {projects.map((project) => (
                <div
                  key={project.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOpenProject(project.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleOpenProject(project.id);
                    }
                  }}
                  className={cn(
                    "group flex cursor-pointer flex-col rounded-lg border border-border/60 bg-card p-4 text-left shadow-sm transition-all",
                    "hover:border-border hover:shadow-md dark:border-white/10 dark:hover:border-white/20"
                  )}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 dark:bg-white/5">
                      <BoxIcon className="text-muted-foreground size-5" />
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      >
                        <MoreHorizontalIcon className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => handleRenameProject(e, project.id)}
                        >
                          <PencilIcon className="mr-2 size-4" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={(e) => handleDeleteProject(e, project.id)}
                        >
                          <Trash2Icon className="mr-2 size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <span className="mb-1 block truncate font-medium dark:text-white">
                    {project.name}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    Updated {formatDate(project.updatedAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
          </section>

          {/* Avatars section */}
          <section className="flex flex-col">
            <div className="text-muted-foreground mb-4 flex items-center justify-between">
              <h2 className="text-sm font-medium">Avatars</h2>
              <Button onClick={handleNewAvatar} size="sm" variant="outline" className="gap-1.5">
                <PlusIcon className="size-3.5" />
                Create avatar
              </Button>
            </div>
          {avatars.length === 0 ? (
            <div
              className={cn(
                "flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/60 py-16 dark:border-white/10"
              )}
            >
              <UserIcon className="text-muted-foreground mb-3 size-10" />
              <p className="text-muted-foreground text-sm">
                No saved avatars yet
              </p>
              <p className="text-muted-foreground mt-1 max-w-sm text-center text-xs">
                Create avatars from the workflow canvas or start a new one below.
              </p>
              <Button onClick={handleNewAvatar} size="sm" className="mt-4 gap-2">
                <PlusIcon className="size-4" />
                Create your first avatar
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-1">
              {avatars.map((avatar) => (
                <div
                  key={avatar.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOpenAvatar(avatar.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleOpenAvatar(avatar.id);
                    }
                  }}
                  className={cn(
                    "group flex cursor-pointer flex-col rounded-lg border border-border/60 bg-card p-4 text-left shadow-sm transition-all",
                    "hover:border-border hover:shadow-md dark:border-white/10 dark:hover:border-white/20"
                  )}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 dark:bg-white/5">
                      <UserIcon className="text-muted-foreground size-5" />
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      >
                        <MoreHorizontalIcon className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={(e) => handleDeleteAvatar(e, avatar.id)}
                        >
                          <Trash2Icon className="mr-2 size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <span className="mb-1 block truncate font-medium dark:text-white">
                    {avatar.name}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    Edit digital human
                  </span>
                </div>
              ))}
            </div>
          )}
          </section>
        </div>
      </main>
    </div>
  );
}
