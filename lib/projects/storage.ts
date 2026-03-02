const STORAGE_KEY = "23d-projects";

export type ProjectMeta = {
  id: string;
  name: string;
  updatedAt: number;
  productType?: "rigid" | "fabric" | "footwear" | null;
};

export type ProjectData = ProjectMeta & {
  nodes: unknown[];
  edges: unknown[];
};

export function getProjects(): ProjectMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, ProjectData>;
    return Object.values(parsed)
      .map((p) => ({
        id: p.id,
        name: p.name,
        updatedAt: p.updatedAt,
        productType: p.productType,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function getProject(id: string): ProjectData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, ProjectData>;
    return parsed[id] ?? null;
  } catch {
    return null;
  }
}

export function saveProject(data: ProjectData): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: Record<string, ProjectData> = raw ? JSON.parse(raw) : {};
    parsed[data.id] = {
      ...data,
      updatedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore
  }
}

export function deleteProject(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, ProjectData>;
    delete parsed[id];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore
  }
}
