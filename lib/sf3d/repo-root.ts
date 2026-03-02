/**
 * Deterministic repo root for resolving relative paths (e.g. SF3D_PYTHON, SF3D_PATH)
 * so spawn() receives absolute paths and works regardless of process.cwd().
 */
import { existsSync } from "fs";
import path from "path";

let cached: string | null = null;

/**
 * Prefer PROJECT_ROOT env; else walk up from process.cwd() until package.json or .git.
 * Result is cached.
 */
export function getRepoRoot(): string {
  if (cached) return cached;
  const explicit = process.env.PROJECT_ROOT;
  if (explicit) {
    const normalized = path.resolve(explicit);
    if (existsSync(normalized)) {
      cached = normalized;
      return cached;
    }
  }
  let dir = process.cwd();
  const root = path.parse(dir).root;
  while (dir !== root) {
    if (existsSync(path.join(dir, "package.json")) || existsSync(path.join(dir, ".git"))) {
      cached = dir;
      return cached;
    }
    dir = path.dirname(dir);
  }
  cached = process.cwd();
  return cached;
}

export function resolveFromRepoRoot(relativeOrAbsolute: string): string {
  const root = getRepoRoot();
  if (path.isAbsolute(relativeOrAbsolute)) return path.resolve(relativeOrAbsolute);
  return path.resolve(root, relativeOrAbsolute);
}
