/**
 * Lightweight check that the current environment has Hugging Face gated access
 * to stabilityai/stable-fast-3d. Runs scripts/check_sf3d_access.py with the
 * same Python (and env) used for SF3D so HF_TOKEN / HUGGINGFACE_HUB_TOKEN are inherited.
 */
import { spawn } from "child_process";
import { access } from "fs/promises";
import { join, resolve } from "path";

export type CheckHfAccessResult =
  | { ok: true; message?: string }
  | { ok: false; message: string; statusCode: number };

const REPO_LABEL = "stabilityai/stable-fast-3d";
const GATED_INSTRUCTIONS =
  "Log in with: huggingface-cli login. Request access at: https://huggingface.co/stabilityai/stable-fast-3d";

function getVenvPython(sf3dPath: string): string {
  return resolve(sf3dPath, "..", "sf3d-venv", "bin", "python");
}

export async function checkHfAccess(): Promise<CheckHfAccessResult> {
  const sf3dPath = process.env.SF3D_PATH;
  let pythonPath = process.env.SF3D_PYTHON;
  if (!pythonPath && sf3dPath) {
    const venvPython = getVenvPython(sf3dPath);
    try {
      await access(venvPython);
      pythonPath = venvPython;
    } catch {
      pythonPath = "python3";
    }
  }
  pythonPath = pythonPath ?? "python3";

  const scriptPath = join(process.cwd(), "scripts", "check_sf3d_access.py");
  try {
    await access(scriptPath);
  } catch {
    return {
      ok: false,
      message: "scripts/check_sf3d_access.py not found",
      statusCode: 500,
    };
  }

  return new Promise((resolveResult) => {
    const env = { ...process.env };
    const proc = spawn(pythonPath, [scriptPath], {
      cwd: process.cwd(),
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (d) => { stdout += d.toString(); });
    proc.stderr?.on("data", (d) => { stderr += d.toString(); });

    const timeout = setTimeout(() => {
      proc.kill("SIGKILL");
      resolveResult({
        ok: false,
        message: "HF access check timed out",
        statusCode: 504,
      });
    }, 30_000);

    proc.on("close", (code) => {
      clearTimeout(timeout);
      const out = stdout + stderr;
      if (code === 0 && (stdout.includes("PASS") || stdout.includes("HF gated access OK"))) {
        console.log("[sf3d] HF gated access OK");
        resolveResult({ ok: true, message: "HF gated access OK" });
        return;
      }
      const isAuth = /401|unauthorized|token|gated|authentication/i.test(stderr || stdout);
      resolveResult({
        ok: false,
        message: (stderr || stdout).trim() || "HF gated access check failed",
        statusCode: isAuth ? 401 : 500,
      });
    });

    proc.on("error", (e) => {
      clearTimeout(timeout);
      resolveResult({
        ok: false,
        message: `Failed to run check: ${e.message}`,
        statusCode: 500,
      });
    });
  });
}

export function getGatedInstructions(): string {
  return GATED_INSTRUCTIONS;
}

export function getGatedRepoLabel(): string {
  return REPO_LABEL;
}
