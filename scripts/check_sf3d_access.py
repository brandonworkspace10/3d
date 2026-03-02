#!/usr/bin/env python3
"""
Check Hugging Face gated access for stabilityai/stable-fast-3d.
Exits 0 and prints PASS + cache info on success; exits 1 and prints FAIL on auth/access failure.
Do not print tokens or secrets.
"""
import os
import sys

REPO_ID = "stabilityai/stable-fast-3d"
CHECK_FILE = "config.yaml"


def main() -> None:
    try:
        from huggingface_hub import hf_hub_download
    except ImportError:
        print("FAIL", file=sys.stderr)
        print("huggingface_hub not installed. Install in the SF3D venv: pip install huggingface_hub", file=sys.stderr)
        sys.exit(1)

    try:
        local_path = hf_hub_download(
            repo_id=REPO_ID,
            filename=CHECK_FILE,
        )
    except Exception as e:
        err = str(e).lower()
        print("FAIL", file=sys.stderr)
        if "401" in err or "unauthorized" in err or "authentication" in err or "token" in err or "gated" in err:
            print(
                "Gated access denied or token invalid. Run: huggingface-cli login",
                file=sys.stderr,
            )
            print("Request access at: https://huggingface.co/stabilityai/stable-fast-3d", file=sys.stderr)
        else:
            print(f"Download check failed: {e}", file=sys.stderr)
        sys.exit(1)

    # Success: log and report cache location (no secrets)
    print("HF gated access OK")
    print("PASS")

    # Cache directory and list downloaded filenames for this repo
    cache_dir = os.path.dirname(local_path)
    try:
        filenames = sorted(os.listdir(cache_dir))
    except OSError:
        filenames = [CHECK_FILE]
    hub_cache_root = os.environ.get("HF_HUB_CACHE") or os.path.join(
        os.environ.get("HF_HOME", os.path.expanduser("~/.cache/huggingface")), "hub"
    )
    print(f"Cache directory: {hub_cache_root}")
    print(f"Cached files ({REPO_ID}): {', '.join(filenames)}")
    sys.exit(0)


if __name__ == "__main__":
    main()
