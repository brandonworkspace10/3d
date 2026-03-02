/**
 * Run SF3D inference via subprocess. Returns path to generated GLB.
 * All paths passed to spawn() are absolute (resolved from repo root) to avoid ENOENT when cwd !== repo root.
 */
import { spawn } from "child_process";
import { existsSync } from "fs";
import { mkdir, readdir, access, stat, appendFile } from "fs/promises";
import { join } from "path";
import { getRepoRoot, resolveFromRepoRoot } from "./repo-root";

const VERIFICATION_LOG = join(process.cwd(), ".cursor", "sf3d-verification.log");
async function verificationLog(line: string): Promise<void> {
  await mkdir(join(process.cwd(), ".cursor"), { recursive: true }).catch(() => {});
  await appendFile(VERIFICATION_LOG, line + "\n").catch(() => {});
}

export interface RunSf3dInput {
  inputPaths: string[]; // absolute paths to preprocessed images
  outputDir: string;
  timeoutSec?: number;
}

export interface RunSf3dOutput {
  glbPath: string;
}

export async function runSf3d(input: RunSf3dInput): Promise<RunSf3dOutput> {
  const sf3dPathRaw = process.env.SF3D_PATH;
  if (!sf3dPathRaw) {
    throw new Error(
      "SF3D_PATH is not set. Run ./scripts/setup_sf3d.sh and add SF3D_PATH to .env"
    );
  }
  const repoRoot = getRepoRoot();
  const sf3dPath = resolveFromRepoRoot(sf3dPathRaw);
  const runPy = join(sf3dPath, "run.py");

  let pythonPath: string;
  const explicitPython = process.env.SF3D_PYTHON;
  if (explicitPython) {
    pythonPath = resolveFromRepoRoot(explicitPython);
  } else {
    pythonPath = join(repoRoot, "tools", "sf3d-venv", "bin", "python");
  }

  const pythonExists = existsSync(pythonPath);
  await verificationLog(`[sf3d] process.cwd(): ${process.cwd()}`);
  await verificationLog(`[sf3d] repoRoot: ${repoRoot}`);
  await verificationLog(`[sf3d] resolved pythonPath: ${pythonPath}`);
  await verificationLog(`[sf3d] existsSync(pythonPath): ${pythonExists}`);
  await verificationLog(`[sf3d] resolved run.py path: ${runPy}`);
  // #region agent log
  fetch("http://127.0.0.1:7242/ingest/a0be18bb-645e-4699-9bed-011f61395fd1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: "lib/sf3d/run.ts:preflight",
      message: "SF3D preflight",
      data: { repoRoot, cwd: process.cwd(), pythonPath, exists: pythonExists },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  console.log("[sf3d] repoRoot:", repoRoot);
  console.log("[sf3d] cwd:", process.cwd());
  console.log("[sf3d] pythonPath:", pythonPath);
  console.log("[sf3d] pythonPath exists:", pythonExists);
  if (!pythonExists) {
    throw new Error("SF3D venv missing. Run scripts/setup_sf3d.sh");
  }

  const timeoutSec = input.timeoutSec ?? parseInt(process.env.SF3D_REQUEST_TIMEOUT_SEC ?? "180", 10);
  const { inputPaths, outputDir } = input;
  if (inputPaths.length === 0) {
    throw new Error("No input images provided");
  }

  await mkdir(outputDir, { recursive: true });

  const env = { ...process.env };
  if (process.env.SF3D_USE_CPU === "1") {
    env.SF3D_USE_CPU = "1";
  }
  if (process.env.PYTORCH_ENABLE_MPS_FALLBACK) {
    env.PYTORCH_ENABLE_MPS_FALLBACK = process.env.PYTORCH_ENABLE_MPS_FALLBACK;
  }

  const hfToken = process.env.HF_TOKEN ?? process.env.HUGGINGFACE_HUB_TOKEN;
  const hfPresent = Boolean(hfToken);
  const hfLen = hfPresent ? hfToken!.length : 0;
  console.log("[sf3d] HF_TOKEN in backend:", hfPresent ? `present (length=${hfLen})` : "absent");
  console.log("[sf3d] HF token forwarded to subprocess:", hfPresent ? "yes" : "no");
  console.log("[sf3d] resolved run.py path:", runPy);
  console.log("[sf3d] spawn start:", { pythonPath, runPy, cwd: sf3dPath });
  await verificationLog(`[sf3d] spawn start: pythonPath=${pythonPath} runPy=${runPy} cwd=${sf3dPath}`);

  // #region agent log
  fetch("http://127.0.0.1:7242/ingest/a0be18bb-645e-4699-9bed-011f61395fd1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: "lib/sf3d/run.ts:spawn",
      message: "SF3D spawn",
      data: { pythonPath, runPy, cwd: sf3dPath },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  return new Promise((resolve, reject) => {
    const args = [...inputPaths, "--output-dir", outputDir];
    const proc = spawn(pythonPath, [runPy, ...args], {
      cwd: sf3dPath,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (d) => { stdout += d.toString(); });
    proc.stderr?.on("data", (d) => { stderr += d.toString(); });

    const timeout = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error(`SF3D timed out after ${timeoutSec}s. ${stderr.slice(-500)}`));
    }, timeoutSec * 1000);

    proc.on("close", async (code) => {
      clearTimeout(timeout);
      console.log("[sf3d] subprocess exit code:", code);
      if (stderr.length > 0) console.log("[sf3d] stderr:", stderr.slice(-2000));
      await verificationLog(`[sf3d] subprocess exit code: ${code}`);
      if (stderr.length > 0) await verificationLog(`[sf3d] stderr: ${stderr.slice(-2000)}`);
      if (code !== 0) {
        reject(new Error(`SF3D exited ${code}: ${stderr.slice(-1000)}`));
        return;
      }
      try {
        const glbPath = await findGlbInDir(outputDir);
        const glbFound = Boolean(glbPath);
        console.log("[sf3d] GLB found:", glbFound);
        await verificationLog(`[sf3d] GLB found: ${glbFound}`);
        if (glbPath) {
          const st = await stat(glbPath);
          console.log("[sf3d] output GLB path:", glbPath);
          console.log("[sf3d] GLB file size (bytes):", st.size);
          await verificationLog(`[sf3d] output GLB path: ${glbPath}`);
          await verificationLog(`[sf3d] GLB file size (bytes): ${st.size}`);
        }
        if (!glbPath) {
          reject(new Error(`SF3D produced no GLB in ${outputDir}. stdout: ${stdout.slice(-500)}`));
          return;
        }
        resolve({ glbPath });
      } catch (e) {
        reject(e);
      }
    });

    proc.on("error", (e) => {
      clearTimeout(timeout);
      verificationLog(`[sf3d] spawn error: ${e.message}`).catch(() => {});
      reject(new Error(`Failed to start SF3D: ${e.message}`));
    });
  });
}

async function findGlbInDir(dir: string): Promise<string | null> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory()) {
      const subPath = join(dir, e.name, "mesh.glb");
      try {
        const { stat } = await import("fs/promises");
        await stat(subPath);
        return subPath;
      } catch {
        // try next
      }
    }
  }
  return null;
}
