#!/usr/bin/env bash
# One-time setup for Stable Fast 3D (SF3D) - local 3D generation
# Run from project root: ./scripts/setup_sf3d.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TOOLS_DIR="$PROJECT_ROOT/tools"
SF3D_DIR="$TOOLS_DIR/stable-fast-3d"
VENV_DIR="$TOOLS_DIR/sf3d-venv"

cd "$PROJECT_ROOT"
mkdir -p "$TOOLS_DIR"

echo "[sf3d] Cloning Stability-AI/stable-fast-3d..."
if [ -d "$SF3D_DIR" ]; then
  echo "[sf3d] Directory exists, pulling latest..."
  (cd "$SF3D_DIR" && git pull --rebase 2>/dev/null || true)
else
  git clone https://github.com/Stability-AI/stable-fast-3d.git "$SF3D_DIR"
fi

echo "[sf3d] Creating Python venv..."
python3 -m venv "$VENV_DIR"
source "$VENV_DIR/bin/activate"

echo "[sf3d] Installing dependencies..."
pip install -U pip setuptools==69.5.1 wheel
# PyTorch must be installed before local packages (texture_baker needs it at build time)
pip install torch
cd "$SF3D_DIR"
# --no-build-isolation so texture_baker/ and uv_unwrapper/ see torch in the venv
pip install -r requirements.txt --no-build-isolation
cd "$PROJECT_ROOT"

echo "[sf3d] Checking Hugging Face access..."
if ! huggingface-cli whoami &>/dev/null; then
  echo ""
  echo "SF3D uses gated weights. Run: huggingface-cli login"
  echo "Request access at: https://huggingface.co/stabilityai/stable-fast-3d"
  echo ""
else
  echo "[sf3d] Hugging Face logged in."
fi

echo ""
echo "Setup complete. Add to .env:"
echo "  SF3D_PATH=$SF3D_DIR"
echo "  # SF3D_PYTHON is optional: if unset, the app uses $VENV_DIR/bin/python when present"
echo "  SF3D_PYTHON=$VENV_DIR/bin/python"
echo "  SF3D_USE_CPU=1   # optional, for Mac if MPS is unstable"
echo ""
