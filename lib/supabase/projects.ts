/**
 * Supabase-backed project CRUD helpers (browser-side, uses the browser client).
 * These mirror lib/projects/storage.ts but persist to Supabase.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = ReturnType<typeof import("./client").createClient>;

import { createClient } from "./client";
import type { Json } from "./schema";

export type SupabaseProject = {
  id: string;
  name: string;
  canvas_state: Json | null;
  created_at: string;
  updated_at: string;
};

function client(): AnyClient {
  return createClient();
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Returns true only for proper UUID project IDs (Supabase rows). */
function isUuid(id: string): boolean {
  return UUID_RE.test(id);
}

export async function listProjects(): Promise<SupabaseProject[]> {
  const supabase = client();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("projects")
    .select("id, name, canvas_state, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SupabaseProject[];
}

export async function getProject(id: string): Promise<SupabaseProject | null> {
  if (!isUuid(id)) return null;
  const supabase = client();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("projects")
    .select("id, name, canvas_state, created_at, updated_at")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as SupabaseProject;
}

export async function createProject(name: string): Promise<SupabaseProject> {
  const supabase = client();
  const {
    data: { user },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = await (supabase as any).auth.getUser();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("projects")
    .insert({ name, user_id: user?.id ?? null })
    .select("id, name, canvas_state, created_at, updated_at")
    .single();
  if (error) throw error;
  return data as SupabaseProject;
}

export async function saveCanvasState(
  projectId: string,
  canvasState: { nodes: unknown[]; edges: unknown[]; productType?: string | null }
): Promise<void> {
  if (!isUuid(projectId)) return;
  const supabase = client();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("projects")
    .update({ canvas_state: canvasState as Json, updated_at: new Date().toISOString() })
    .eq("id", projectId);
  if (error) console.error("[supabase] saveCanvasState error:", error.message);
}

export async function renameProject(projectId: string, name: string): Promise<void> {
  if (!isUuid(projectId)) return;
  const supabase = client();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("projects")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", projectId);
  if (error) throw error;
}

export async function saveAsset(
  projectId: string,
  type: "product_photo" | "glb" | "video" | "render",
  storageUrl: string
): Promise<void> {
  if (!isUuid(projectId)) return;
  const supabase = client();
  const {
    data: { user },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = await (supabase as any).auth.getUser();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("assets").insert({
    project_id: projectId,
    user_id: user?.id ?? null,
    type,
    storage_url: storageUrl,
  });
  if (error) console.error("[supabase] saveAsset error:", error.message);
}
