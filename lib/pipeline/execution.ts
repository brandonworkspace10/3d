import { nanoid } from "nanoid";
import type { Edge, Node } from "@xyflow/react";
import type {
  Generate3DData,
  ImageUploadData,
  PipelineNodeType,
} from "./types";

const TOPO_ORDER: PipelineNodeType[] = [
  "imageUpload",
  "backgroundRemover",
  "lighting",
  "generate3d",
  "spinVideo",
  "backgroundReplace",
];

function getOutputUrls(node: {
  type?: string;
  data: Record<string, unknown>;
}): string[] {
  const d = node.data;
  if (node.type === "imageUpload") {
    const images = (d as ImageUploadData).images ?? [];
    return images.map((i) => i.url);
  }
  if (node.type === "backgroundRemover" || node.type === "lighting") {
    return ((d as { outputUrls?: string[] }).outputUrls ?? []).slice();
  }
  return [];
}

function getIncomingUrls(
  nodeId: string,
  edges: Edge[],
  nodes: { id: string; type?: string; data: Record<string, unknown> }[],
  outputMap: Map<string, string[]>
): string[] {
  const inEdge = edges.find((e) => {
    if (e.target !== nodeId) return false;
    const src = nodes.find((n) => n.id === e.source);
    if (src?.type === "promptNode") return false;
    return e.targetHandle === "target-image";
  });
  if (!inEdge) return [];
  const sourceNode = nodes.find((n) => n.id === inEdge.source);
  if (!sourceNode) return [];
  return outputMap.get(sourceNode.id) ?? getOutputUrls(sourceNode);
}

function getConnectedPrompt(
  nodeId: string,
  edges: Edge[],
  nodes: { id: string; type?: string; data: Record<string, unknown> }[]
): string {
  const promptEdge = edges.find((e) => {
    if (e.target !== nodeId) return false;
    const src = nodes.find((n) => n.id === e.source);
    if (src?.type !== "promptNode") return false;
    return e.targetHandle === "target-prompt";
  });
  if (!promptEdge) return "";
  const promptNode = nodes.find((n) => n.id === promptEdge.source);
  return ((promptNode?.data as { prompt?: string }).prompt ?? "").trim();
}

const getBaseUrl = () =>
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

export type ExecutionProgress = (
  nodeId: string,
  status: "processing" | "complete" | "error",
  data?: Partial<Record<string, unknown>>
) => void;

type FinalOutput =
  | { kind: "3d"; outputs3d: NonNullable<Generate3DData["outputs"]> }
  | { kind: "video"; videoUrl: string }
  | { kind: "image"; renderUrl: string };

export async function executePipeline<N extends Node<Record<string, unknown>, string>>(
  nodes: N[],
  edges: Edge[],
  setNodes: (updater: (nodes: N[]) => N[]) => void,
  setEdges: (updater: (edges: Edge[]) => Edge[]) => void,
  onProgress?: ExecutionProgress
): Promise<void> {
  const outputMap = new Map<string, string[]>();
  let finalOutput: FinalOutput | null = null;
  let finalError: string | null = null;
  let lastProcessedNodeId: string | null = null;

  for (const nodeType of TOPO_ORDER) {
    const typeNodes = nodes.filter((n) => n.type === nodeType);
    for (const node of typeNodes) {
      if (node.type === "imageUpload") {
        const d = node.data as unknown as ImageUploadData;
        const urls = d.images?.map((i) => getBaseUrl() + i.url) ?? [];
        if (urls.length >= 1) outputMap.set(node.id, urls);
        continue;
      }

      const incomingUrls = getIncomingUrls(node.id, edges, nodes, outputMap);
      const relativeUrls = incomingUrls.map((u) =>
        u.startsWith("http") ? new URL(u).pathname : u
      );

      if (node.type === "backgroundRemover") {
        if (relativeUrls.length === 0) continue;
        lastProcessedNodeId = node.id;
        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id
              ? { ...n, data: { ...n.data, status: "processing" as const } }
              : n
          )
        );
        try {
          const res = await fetch("/api/background-remove", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageUrls: relativeUrls.map((u) => getBaseUrl() + u),
            }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || "Subject isolation failed");
          const out = (json.outputUrls as string[]).map((u) =>
            u.startsWith("http") ? new URL(u).pathname : u
          );
          outputMap.set(node.id, out);
          finalOutput = out[0] ? { kind: "image", renderUrl: out[0] } : null;
          setNodes((nds) =>
            nds.map((n) =>
              n.id === node.id
                ? {
                    ...n,
                    data: {
                      ...n.data,
                      status: "complete" as const,
                      inputUrls: relativeUrls,
                      outputUrls: out,
                    },
                  }
                : n
            )
          );
          lastProcessedNodeId = node.id;
        } catch (e) {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === node.id
                ? {
                    ...n,
                    data: {
                      ...n.data,
                      status: "error" as const,
                      inputUrls: relativeUrls,
                      error: e instanceof Error ? e.message : "Failed",
                    },
                  }
                : n
            )
          );
          finalError =
            (e instanceof Error ? e.message : "Failed") +
            " (Subject Isolation)";
          break;
        }
        continue;
      }

      if (node.type === "lighting") {
        lastProcessedNodeId = node.id;
        if (relativeUrls.length === 0) continue;
        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id
              ? { ...n, data: { ...n.data, status: "processing" as const } }
              : n
          )
        );
        try {
          const sceneDescription = getConnectedPrompt(node.id, edges, nodes);
          const res = await fetch("/api/lighting", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageUrls: relativeUrls.map((u) => getBaseUrl() + u),
              sceneDescription: sceneDescription || undefined,
            }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || "Failed");
          const out = (json.outputUrls as string[]).map((u) =>
            u.startsWith("http") ? new URL(u).pathname : u
          );
          outputMap.set(node.id, out);
          finalOutput = out[0] ? { kind: "image", renderUrl: out[0] } : null;
          setNodes((nds) =>
            nds.map((n) =>
              n.id === node.id
                ? {
                    ...n,
                    data: {
                      ...n.data,
                      status: "complete" as const,
                      inputUrls: relativeUrls,
                      outputUrls: out,
                    },
                  }
                : n
            )
          );
          lastProcessedNodeId = node.id;
        } catch (e) {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === node.id
                ? {
                    ...n,
                    data: {
                      ...n.data,
                      status: "error" as const,
                      inputUrls: relativeUrls,
                      error: e instanceof Error ? e.message : "Failed",
                    },
                  }
                : n
            )
          );
          finalError =
            (e instanceof Error ? e.message : "Failed") + " (Scene Light Sync)";
          break;
        }
        continue;
      }

      if (node.type === "generate3d") {
        if (relativeUrls.length === 0) continue;
        lastProcessedNodeId = node.id;
        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id
              ? { ...n, data: { ...n.data, status: "processing" as const, progress: 0 } }
              : n
          )
        );
        try {
          const fullUrls = relativeUrls.map((u) => getBaseUrl() + (u.startsWith("/") ? u : `/${u}`));
          const assetId = nanoid(12);
          const capped = fullUrls.slice(0, 4);
          const blobs = await Promise.all(
            capped.map(async (url) => {
              const r = await fetch(url);
              if (!r.ok) throw new Error(`Failed to fetch image: ${r.status}`);
              return { blob: await r.blob(), filename: url.split("/").pop() ?? "image.jpg" };
            })
          );
          const formData = new FormData();
          formData.append("assetId", assetId);
          for (const { blob, filename } of blobs) {
            formData.append("images", blob, filename);
          }
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 12 * 60 * 1000); // 12 min to cover poll window
          const res = await fetch("/api/generate-3d", {
            method: "POST",
            body: formData,
            signal: controller.signal,
          });
          clearTimeout(timeout);
          const json = (await res.json()) as { assetId?: string; error?: string; glb?: string; usdz?: string | null; viewerUrl?: string };
          if (!res.ok) throw new Error(json.error ?? "3D generation failed");
          if (res.status === 202 && json.assetId) {
            const pollAssetId = json.assetId;
            const pollInterval = 2500;
            const pollUntil = Date.now() + 10 * 60 * 1000; // 10 min — faster error feedback for iteration
            setNodes((nds) =>
              nds.map((n) =>
                n.id === node.id
                  ? { ...n, data: { ...n.data, status: "processing" as const, progress: 10 } }
                  : n
              )
            );
            for (;;) {
              const statusRes = await fetch(
                `/api/generate-3d?assetId=${encodeURIComponent(pollAssetId)}`,
                { signal: controller.signal }
              );
              const statusJson = (await statusRes.json()) as {
                status?: string;
                progress?: number;
                glbUrl?: string;
                error?: string;
              };
              if (statusRes.status === 404) {
                throw new Error(
                  statusJson.error ?? "Task not found. The server may have restarted—try running the pipeline again."
                );
              }
              if (!statusRes.ok) {
                throw new Error(statusJson.error ?? `Status check failed: ${statusRes.status}`);
              }
              const progress = statusJson.progress ?? 0;
              setNodes((nds) =>
                nds.map((n) =>
                  n.id === node.id
                    ? {
                        ...n,
                        data: {
                          ...n.data,
                          status: "processing" as const,
                          progress,
                        },
                      }
                    : n
                )
              );
              if (statusJson.status === "success" && statusJson.glbUrl) {
                const outputs = {
                  glb: statusJson.glbUrl,
                  usdz: null,
                  viewerUrl: statusJson.glbUrl,
                };
                outputMap.set(node.id, [statusJson.glbUrl]);
                finalOutput = { kind: "3d", outputs3d: outputs };
                setNodes((nds) =>
                  nds.map((n) =>
                    n.id === node.id
                      ? {
                          ...n,
                          data: {
                            ...n.data,
                            status: "complete" as const,
                            progress: 100,
                            outputs,
                          },
                        }
                      : n
                  )
                );
                break;
              }
              if (statusJson.status === "failed") {
                throw new Error(statusJson.error ?? "3D generation failed");
              }
              if (Date.now() > pollUntil) {
                throw new Error(
                  "3D generation timed out. Try again later or use fewer or simpler images."
                );
              }
              await new Promise((r) => setTimeout(r, pollInterval));
            }
          } else {
            const outputs = {
              glb: json.glb,
              usdz: json.usdz,
              viewerUrl: json.viewerUrl,
            };
            outputMap.set(node.id, [json.viewerUrl ?? json.glb ?? ""]);
            finalOutput = { kind: "3d", outputs3d: outputs };
            setNodes((nds) =>
              nds.map((n) =>
                n.id === node.id
                  ? {
                      ...n,
                      data: {
                        ...n.data,
                        status: "complete" as const,
                        progress: 100,
                        outputs,
                      },
                    }
                  : n
              )
            );
          }
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : "Failed";
          setNodes((nds) =>
            nds.map((n) =>
              n.id === node.id
                ? {
                    ...n,
                    data: {
                      ...n.data,
                      status: "error" as const,
                      error: errMsg,
                    },
                  }
                : n
            )
          );
          finalError =
            errMsg +
            " (3D Modeling)";
          break;
        }
        continue;
      }

      if (node.type === "spinVideo") {
        const inEdge = edges.find((e) => {
          if (e.target !== node.id) return false;
          const src = nodes.find((n) => n.id === e.source);
          if (src?.type === "promptNode") return false;
          return e.targetHandle === "target-image";
        });
        const sourceId = inEdge?.source;
        if (!sourceId || !outputMap.has(sourceId)) continue;
        lastProcessedNodeId = node.id;
        try {
          const res = await fetch("/api/spin-video", { method: "POST" });
          const json = await res.json();
          if (!res.ok) throw new Error("Failed");
          outputMap.set(node.id, json.videoUrl ? [json.videoUrl] : []);
          finalOutput = { kind: "video", videoUrl: json.videoUrl ?? "" };
          lastProcessedNodeId = node.id;
        } catch (e) {
          finalError =
            (e instanceof Error ? e.message : "Failed") + " (Dynamic Showcase)";
          break;
        }
        continue;
      }

      if (node.type === "backgroundReplace") {
        const inEdge = edges.find((e) => {
          if (e.target !== node.id) return false;
          const src = nodes.find((n) => n.id === e.source);
          if (src?.type === "promptNode") return false;
          return e.targetHandle === "target-image";
        });
        const sourceId = inEdge?.source;
        if (!sourceId || !outputMap.has(sourceId)) continue;
        lastProcessedNodeId = node.id;

        let subjectUrl: string | null = null;
        for (const nType of ["lighting", "backgroundRemover"] as const) {
          for (const n of nodes) {
            if (n.type === nType) {
              const urls = outputMap.get(n.id);
              if (urls?.length) {
                subjectUrl = urls[0];
                break;
              }
            }
          }
          if (subjectUrl) break;
        }
        if (!subjectUrl) {
          const sourceUrls = outputMap.get(sourceId) ?? [];
          subjectUrl = sourceUrls[0] ?? null;
        }
        if (!subjectUrl) continue;

        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id
              ? { ...n, data: { ...n.data, status: "processing" as const } }
              : n
          )
        );
        try {
          const bgPrompt = getConnectedPrompt(node.id, edges, nodes);
          const fullSubjectUrl = subjectUrl.startsWith("http")
            ? subjectUrl
            : getBaseUrl() + (subjectUrl.startsWith("/") ? subjectUrl : `/${subjectUrl}`);
          const res = await fetch("/api/background-replace", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subjectImageUrl: fullSubjectUrl,
              prompt: bgPrompt || undefined,
            }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || "Brand scene builder failed");
          const renderUrl = json.renderUrl as string;
          outputMap.set(node.id, renderUrl ? [renderUrl] : []);
          finalOutput = { kind: "image", renderUrl: renderUrl ?? "" };
          setNodes((nds) =>
            nds.map((n) =>
              n.id === node.id
                ? {
                    ...n,
                    data: {
                      ...n.data,
                      status: "complete" as const,
                      renderUrl,
                    },
                  }
                : n
            )
          );
          lastProcessedNodeId = node.id;
        } catch (e) {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === node.id
                ? {
                    ...n,
                    data: {
                      ...n.data,
                      status: "error" as const,
                      error: e instanceof Error ? e.message : "Failed",
                    },
                  }
                : n
            )
          );
          finalError =
            (e instanceof Error ? e.message : "Failed") + " (Brand Scene Builder)";
          break;
        }
      }
    }
    if (finalError) break;
  }

  // Output is shown inside each processing node; remove any Output node
  const outputNodeId = "pipeline-output";
  setNodes((nds) => nds.filter((n) => n.id !== outputNodeId));
  setEdges((eds) =>
    eds.filter((e) => e.target !== outputNodeId && e.source !== outputNodeId)
  );

  if (lastProcessedNodeId) {
    if (finalError) onProgress?.(lastProcessedNodeId, "error");
    else if (finalOutput) onProgress?.(lastProcessedNodeId, "complete");
  }
}
