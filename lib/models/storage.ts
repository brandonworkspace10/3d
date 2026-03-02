import type { ModelProfile } from "@/components/canvas/model-setup-card";

const STORAGE_KEY = "23d-saved-models";

export function getSavedModels(): ModelProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ModelProfile[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getModel(id: string): ModelProfile | null {
  return getSavedModels().find((m) => m.id === id) ?? null;
}

export function saveModel(profile: ModelProfile): void {
  const models = getSavedModels();
  if (models.some((m) => m.id === profile.id)) return;
  models.push(profile);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(models));
}

export function updateModel(profile: ModelProfile): void {
  const models = getSavedModels();
  const idx = models.findIndex((m) => m.id === profile.id);
  if (idx < 0) return;
  models[idx] = profile;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(models));
}

export function removeModel(profileId: string): void {
  const models = getSavedModels().filter((m) => m.id !== profileId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(models));
}
