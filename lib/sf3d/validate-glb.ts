/**
 * Validate generated GLB: existence, size, and basic structure (mesh + material).
 */
import { stat } from "fs/promises";
import { NodeIO } from "@gltf-transform/core";

export type ValidateResult =
  | { ok: true }
  | { ok: false; message: string };

export async function validateGlb(filePath: string): Promise<ValidateResult> {
  try {
    const st = await stat(filePath);
    if (!st.isFile() || st.size <= 0) {
      return { ok: false, message: "GLB file missing or empty" };
    }
  } catch (e) {
    return {
      ok: false,
      message: `Cannot read GLB: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  try {
    const io = new NodeIO();
    const document = await io.read(filePath);
    const root = document.getRoot();

    const meshes = root.listMeshes();
    if (meshes.length === 0) {
      return { ok: false, message: "GLB contains no meshes" };
    }

    // At least one mesh has primitives
    const hasPrimitives = meshes.some((m) => m.listPrimitives().length > 0);
    if (!hasPrimitives) {
      return { ok: false, message: "GLB meshes have no geometry" };
    }

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      message: `Invalid GLB: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
