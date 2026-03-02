#!/usr/bin/env bash
# Smoke test for SF3D: run inference on an image and validate the output GLB.
# Usage: ./scripts/smoke_sf3d.sh --input <image_or_folder> --out <dir>
# Example: ./scripts/smoke_sf3d.sh --input demo.png --out ./smoke-out

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

INPUT=""
OUT=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --input) INPUT="$2"; shift 2 ;;
    --out)   OUT="$2";   shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ -z "$INPUT" ]] || [[ -z "$OUT" ]]; then
  echo "Usage: $0 --input <image_or_folder> --out <dir>"
  exit 1
fi

SF3D_PATH="${SF3D_PATH:-$PROJECT_ROOT/tools/stable-fast-3d}"
PYTHON="${SF3D_PYTHON:-$PROJECT_ROOT/tools/sf3d-venv/bin/python}"

if [[ ! -d "$SF3D_PATH" ]]; then
  echo "SF3D not found at $SF3D_PATH. Run ./scripts/setup_sf3d.sh first."
  exit 1
fi

if [[ ! -x "$PYTHON" ]]; then
  PYTHON="python3"
fi

mkdir -p "$OUT"
echo "[smoke] Running SF3D on $INPUT -> $OUT"
cd "$SF3D_PATH"
"$PYTHON" run.py "$INPUT" --output-dir "$OUT"

# Find the first mesh.glb
GLB=""
for d in "$OUT"/*/; do
  if [[ -f "${d}mesh.glb" ]]; then
    GLB="${d}mesh.glb"
    break
  fi
done

if [[ -z "$GLB" ]] || [[ ! -f "$GLB" ]]; then
  echo "[smoke] FAIL: No mesh.glb found in $OUT"
  exit 1
fi

if [[ ! -s "$GLB" ]]; then
  echo "[smoke] FAIL: GLB file is empty"
  exit 1
fi

SIZE=$(wc -c < "$GLB" 2>/dev/null || echo 0)
echo "[smoke] OK: GLB at $GLB (size: $SIZE bytes)"
echo "[smoke] Run 'npx ts-node -e \"require('./lib/sf3d/validate-glb').validateGlb('$GLB').then(r=>console.log(r))\"' to validate with gltf-transform"
