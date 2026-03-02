# Portfolio Starter

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app). This starter template includes a complete setup with shadcn/ui components and is designed to be used as a base for portfolio projects.

## Using the Starter CLI

This repository includes a CLI tool that allows you to initialize new projects from this starter template with a fresh git history.

### Installation

Install the CLI tool globally from this repository:

```bash
npm install -g .
```

Or use it directly with npx (if published to npm):

```bash
npx github:your-username/Portfolio-Starter sriket <project-name>
```

### Usage

Create a new project from this starter:

```bash
sriket my-new-portfolio
```

This will:

- Copy all files from the starter (excluding `.git` directory)
- Initialize a fresh git repository
- Create an initial commit
- Update the project name in `package.json`

### Options

```bash
# Specify a custom destination directory
sriket my-new-portfolio --dir /path/to/destination

# Or use the short form
sriket my-new-portfolio -d /path/to/destination
```

### After Initialization

Once your project is created:

```bash
cd my-new-portfolio
npm install
npm run dev
```

To connect to GitHub:

```bash
git remote add origin <your-repo-url>
git push -u origin main
```

## Getting Started (Development)

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 2D → 3D Model Generation

The 3D Modeling node calls `POST /api/generate-3d` and polls `GET /api/generate-3d?assetId=...`. The API is currently a **placeholder** (returns `{ status: "3D generation not yet connected" }`) and will be connected to a provider such as Meshy.ai later.

**Run locally:** `npm run dev`, then open the canvas, add Upload + 3D Modeling nodes, connect, and run. When the API is connected, the GLB will appear inside the 3D node.

### Hugging Face gated access

SF3D uses the gated repo [stabilityai/stable-fast-3d](https://huggingface.co/stabilityai/stable-fast-3d). The backend reads `HF_TOKEN` or `HUGGINGFACE_HUB_TOKEN` from the environment (only presence and length are logged; the token is never printed). The same env is passed to the spawned Python process so the SF3D subprocess inherits the token.

- **Env forwarding:** `lib/sf3d/run.ts` builds `env` from `process.env` (lines 51–56) and passes it to `spawn(..., { env })` (lines 61–64). The spawned process therefore receives `HF_TOKEN` / `HUGGINGFACE_HUB_TOKEN` if set.
- **Access check:** Before running SF3D, the app runs a lightweight check that downloads a small file from the gated repo. If it fails, the API returns 401 with gated instructions.
- **Script:** Run `./tools/sf3d-venv/bin/python scripts/check_sf3d_access.py` (or use the venv’s Python). Pass = exit 0 and cache info; Fail = exit 1 and instructions.
- **Route:** `GET /api/sf3d-access-check` returns `{ "status": "PASS" }` or 401/500 with `{ "status": "FAIL", "error", "instructions" }`.

Example PASS output from the script (no secrets printed):

```
HF gated access OK
PASS
Cache directory: /Users/you/.cache/huggingface/hub
Cached files (stabilityai/stable-fast-3d): config.yaml, model.safetensors
```

## 2D → 3D Reconstruction API

Async pipeline to convert 3–6 product photos into GLB + preview. See **[docs/reconstruction.md](docs/reconstruction.md)** for:

- API endpoints (POST jobs, GET status, health)
- Local setup (no Redis required for dev)
- Example curl commands
