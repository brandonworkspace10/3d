"use client";

import { useRouter } from "next/navigation";
import type {
  Connection as FlowConnection,
  ConnectionLineComponent,
  Edge,
  EdgeTypes,
  FinalConnectionState,
  Node,
  NodeTypes,
  OnConnect,
  OnConnectEnd,
  XYPosition,
} from "@xyflow/react";
import {
  addEdge,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import {
  ImageIcon,
  InfoIcon,
  LayersIcon,
  LightbulbIcon,
  BoxIcon,
  VideoIcon,
  ImagePlusIcon,
  Plus,
  MoonIcon,
  SunIcon,
  ChevronDownIcon,
  FileIcon,
  FilePlusIcon,
  HistoryIcon,
  CopyIcon,
  PencilIcon,
  ShareIcon,
  MonitorPlayIcon,
  PlusCircleIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Canvas } from "@/components/ai-elements/canvas";
import { Connection } from "@/components/ai-elements/connection";
import { Controls } from "@/components/ai-elements/controls";
import { Edge as CanvasEdge } from "@/components/ai-elements/edge";
import { Panel } from "@/components/ai-elements/panel";
import { ImageUploadNode } from "@/components/nodes/image-upload-node";
import { BackgroundRemoverNode } from "@/components/nodes/background-remover-node";
import { LightingNode } from "@/components/nodes/lighting-node";
import { Generate3DNode } from "@/components/nodes/generate-3d-node";
import { SpinVideoNode } from "@/components/nodes/spin-video-node";
import { BackgroundReplaceNode } from "@/components/nodes/background-replace-node";
import { PromptNode } from "@/components/nodes/prompt-node";
import { PipelineOutputNode } from "@/components/nodes/pipeline-output-node";
import {
  PipelineExecuteProvider,
  TerminalExecuteButton,
} from "@/components/nodes/terminal-execute-button";
import { ModelNode } from "@/components/nodes/model-node";
import type { ModelProfile } from "@/components/canvas/model-setup-card";
import { ModelSetupCard } from "@/components/canvas/model-setup-card";
import { getProject, saveProject } from "@/lib/projects/storage";
import { getSavedModels, removeModel, saveModel } from "@/lib/models/storage";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { executePipeline } from "@/lib/pipeline/execution";
import type { PipelineNodeType } from "@/lib/pipeline/types";
import { isValidPipelineConnection } from "@/lib/pipeline/validation";

const NODE_OFFSET = 50;
const INITIAL_X = 100;
const INITIAL_Y = 100;
const CONNECT_END_MENU_OFFSET = 8;
const PROMPT_NODE_OFFSET_X = 280;

const PROMPT_LABELS: Partial<Record<PipelineNodeType, string>> = {
  lighting: "Scene Light Prompt",
  spinVideo: "Showcase Prompt",
  backgroundReplace: "Brand Scene Prompt",
};

const PROMPT_PARENT_TYPES = new Set<PipelineNodeType>([
  "lighting",
  "spinVideo",
  "backgroundReplace",
]);

/** Short descriptions for each pipeline node (shown on info icon hover). */
const NODE_DESCRIPTIONS: Record<PipelineNodeType, string> = {
  imageUpload:
    "Upload front, right, left, and back views of your product. These images feed into the pipeline.",
  backgroundRemover:
    "Removes the background from each uploaded view so only the subject is kept (subject isolation).",
  lighting:
    "Syncs lighting across views for consistent appearance before 3D modeling.",
  generate3d:
    "Generates a 3D model (GLB) from your isolated views using Stable Fast 3D.",
  spinVideo:
    "Renders a spin/turntable video from the 3D model for showcase.",
  backgroundReplace:
    "Places the 3D model or subject into a custom background scene.",
};

const PIPELINE_NODE_DEFAULTS: Record<
  PipelineNodeType,
  { label: string; data: Record<string, unknown> }
> = {
  imageUpload: {
    label: "Upload Asset",
    data: {
      label: "Upload Asset",
      images: [],
      validation: { status: "idle", errors: [] },
    },
  },
  backgroundRemover: {
    label: "Subject Isolation",
    data: {
      label: "Subject Isolation",
      status: "idle",
      inputUrls: [],
      outputUrls: [],
    },
  },
  lighting: {
    label: "Scene Light Sync",
    data: {
      label: "Scene Light Sync",
      status: "idle",
      inputUrls: [],
      outputUrls: [],
    },
  },
  generate3d: {
    label: "3D Modeling",
    data: {
      label: "3D Modeling",
      status: "idle",
      progress: 0,
      outputs: {},
    },
  },
  spinVideo: {
    label: "Dynamic Showcase",
    data: {
      label: "Dynamic Showcase",
      status: "idle",
    },
  },
  backgroundReplace: {
    label: "Brand Scene Builder",
    data: {
      label: "Brand Scene Builder",
      status: "idle",
    },
  },
};

type AnyNode = Node<
  Record<string, unknown>,
  PipelineNodeType | "pipelineOutput" | "model" | "promptNode"
>;

type ConnectEndMenuState = {
  open: boolean;
  screenX: number;
  screenY: number;
  flowPosition: XYPosition;
  source: { nodeId: string; handleId: string | null } | null;
};

type ConnectionEndHandle = {
  handleConnectEnd: OnConnectEnd;
};

function NodePickerMenuContent({
  onSelectPipeline,
  onClose,
  onProductRequired,
  productType,
  className,
}: {
  onSelectPipeline: (type: PipelineNodeType) => void;
  onClose: () => void;
  onProductRequired?: () => void;
  productType?: "rigid" | "fabric" | "footwear" | null;
  className?: string;
}) {
  const handleSelect = (type: PipelineNodeType) => {
    if (!productType && onProductRequired) {
      onProductRequired();
      onClose();
    } else {
      onSelectPipeline(type);
      onClose();
    }
  };
  return (
    <div
      className={className}
      role="menu"
      data-slot="dropdown-menu-content"
    >
      {(
        [
          ["imageUpload", "Upload Asset", ImageIcon],
          ["backgroundRemover", "Subject Isolation", LayersIcon],
          ["lighting", "Scene Light Sync", LightbulbIcon],
          ["generate3d", "3D Modeling", BoxIcon],
          ["spinVideo", "Dynamic Showcase", VideoIcon],
          ["backgroundReplace", "Brand Scene Builder", ImagePlusIcon],
        ] as const
      ).map(([type, label, Icon]) => (
        <button
          key={type}
          type="button"
          className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
          onClick={() => handleSelect(type)}
        >
          <Icon className="mr-2 size-4 shrink-0" />
          <span className="min-w-0 flex-1 text-left">{label}</span>
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground inline-flex">
                  <InfoIcon className="size-3.5" />
                </span>
              }
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              aria-label="What this node does"
            />
            <TooltipContent side="left" className="max-w-[220px] text-xs">
              {NODE_DESCRIPTIONS[type]}
            </TooltipContent>
          </Tooltip>
        </button>
      ))}
    </div>
  );
}

const PROMPT_TARGET_HANDLE = "target-prompt";
const PROMPT_PARENT_NODE_TYPES = ["lighting", "spinVideo", "backgroundReplace"] as const;

function ConnectionEndMenu({
  connectionEndRef,
  setEdges,
  addPipelineNodeAt,
  addPromptNodeAndConnect,
  productType,
  onProductRequired,
}: {
  connectionEndRef: React.MutableRefObject<ConnectionEndHandle | null>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  addPipelineNodeAt: (type: PipelineNodeType, position?: XYPosition) => string;
  addPromptNodeAndConnect: (
    parentNodeId: string,
    parentType: "lighting" | "spinVideo" | "backgroundReplace",
    position: XYPosition
  ) => void;
  productType: "rigid" | "fabric" | "footwear" | null;
  onProductRequired: () => void;
}) {
  const { screenToFlowPosition } = useReactFlow();
  const [menu, setMenu] = useState<ConnectEndMenuState>({
    open: false,
    screenX: 0,
    screenY: 0,
    flowPosition: { x: 0, y: 0 },
    source: null,
  });

  const handleConnectEnd = useCallback<OnConnectEnd>(
    (event: MouseEvent | TouchEvent, connectionState: FinalConnectionState) => {
      const fromNode = connectionState.fromNode ?? null;
      const toNode = connectionState.toNode ?? null;
      if (!fromNode || toNode) return;
      const handleId = connectionState.fromHandle?.id ?? null;
      const clientX = "clientX" in event ? event.clientX : event.touches?.[0]?.clientX ?? 0;
      const clientY = "clientY" in event ? event.clientY : event.touches?.[0]?.clientY ?? 0;
      const flowPosition = screenToFlowPosition({ x: clientX, y: clientY });

      // Dragging from a prompt input handle: add only a prompt node, no node picker
      if (
        handleId === PROMPT_TARGET_HANDLE &&
        fromNode.type != null &&
        PROMPT_PARENT_NODE_TYPES.includes(fromNode.type as (typeof PROMPT_PARENT_NODE_TYPES)[number])
      ) {
        addPromptNodeAndConnect(fromNode.id, fromNode.type as (typeof PROMPT_PARENT_NODE_TYPES)[number], flowPosition);
        return;
      }

      setMenu({
        open: true,
        screenX: clientX + CONNECT_END_MENU_OFFSET,
        screenY: clientY + CONNECT_END_MENU_OFFSET,
        flowPosition,
        source: {
          nodeId: fromNode.id,
          handleId,
        },
      });
    },
    [screenToFlowPosition, addPromptNodeAndConnect]
  );

  const closeMenu = useCallback(() => {
    setMenu((m) => ({ ...m, open: false, source: null }));
  }, []);

  const addAndConnect = useCallback(
    (type: PipelineNodeType) => {
      if (!menu.source) return;
      const newNodeId = addPipelineNodeAt(type, menu.flowPosition);
      const srcHandle = menu.source.handleId ?? null;
      // Derive targetHandle from sourceHandle so each connection lands on the correct handle
      let tgtHandle: string | null = null;
      if (srcHandle === "source-prompt") tgtHandle = "target-prompt";
      else if (srcHandle === "source-image" || srcHandle === "source-output") tgtHandle = "target-image";
      const connection: FlowConnection = {
        source: menu.source.nodeId,
        sourceHandle: srcHandle,
        target: newNodeId,
        targetHandle: tgtHandle,
      };
      setEdges((eds) => addEdge({ ...connection, type: "animated" }, eds));
      closeMenu();
    },
    [menu.source, setEdges, closeMenu, addPipelineNodeAt]
  );

  useEffect(() => {
    connectionEndRef.current = { handleConnectEnd };
    return () => {
      connectionEndRef.current = null;
    };
  }, [connectionEndRef, handleConnectEnd]);

  if (!menu.open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        aria-hidden
        onClick={closeMenu}
        onContextMenu={(e) => e.preventDefault()}
      />
      <div
        className="bg-popover text-popover-foreground ring-foreground/10 min-w-32 rounded-md p-1 shadow-md ring-1 z-50 max-h-[var(--available-height)] overflow-x-hidden overflow-y-auto outline-none"
        style={{
          position: "fixed",
          left: menu.screenX,
          top: menu.screenY,
        }}
        role="dialog"
        aria-label="Add node"
      >
        <NodePickerMenuContent
          className="w-56"
          onSelectPipeline={(type) => addAndConnect(type)}
          onClose={closeMenu}
          productType={productType}
          onProductRequired={onProductRequired}
        />
      </div>
    </>
  );
}

function CanvasInner({ projectId }: { projectId: string }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<AnyNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [projectName, setProjectName] = useState("Untitled workflow");
  const nodeCount = useRef(1);
  const [running, setRunning] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showOutputPlaceholder, setShowOutputPlaceholder] = useState(false);
  const [activeSidebarSection, setActiveSidebarSection] = useState<"product" | "model">("product");
  const [productType, setProductType] = useState<"rigid" | "fabric" | "footwear" | null>(null);
  const [showProductMenu, setShowProductMenu] = useState(false);
  const [showAddNodeMenu, setShowAddNodeMenu] = useState(false);
  const [productPulseTriggered, setProductPulseTriggered] = useState(false);
  const [savedModels, setSavedModels] = useState<ModelProfile[]>([]);
  const [activeModelProfile, setActiveModelProfile] = useState<ModelProfile | null>(null);
  const [showModelSetupCard, setShowModelSetupCard] = useState(false);
  const [setupCardMode, setSetupCardMode] = useState<"create" | "generate">("create");
  const [showModelMenu, setShowModelMenu] = useState(false);
  const connectionEndRef = useRef<ConnectionEndHandle | null>(null);
  const { fitView } = useReactFlow();
  const router = useRouter();
  const loadedRef = useRef(false);

  useEffect(() => {
    setSavedModels(getSavedModels());
  }, []);

  useEffect(() => {
    if (!projectId || loadedRef.current) return;
    const p = getProject(projectId);
    if (p) {
      setProjectName(p.name ?? "Untitled workflow");
      setProductType(p.productType ?? null);
      setNodes((p.nodes?.length ? p.nodes : []) as AnyNode[]);
      const rawEdges = (p.edges ?? []) as Edge[];
      const nodesArr = (p.nodes ?? []) as { id?: string; type?: string }[];
      const normalizedEdges = rawEdges.map((e) => {
        const sourceNode = nodesArr.find((n) => n.id === e.source);
        const targetNode = nodesArr.find((n) => n.id === e.target);
        if (
          sourceNode?.type === "promptNode" &&
          targetNode?.type &&
          PROMPT_PARENT_TYPES.has(targetNode.type as PipelineNodeType)
        ) {
          return {
            ...e,
            sourceHandle: e.sourceHandle ?? "source-prompt",
            targetHandle: "target-prompt",
          };
        }
        return e;
      });
      setEdges(normalizedEdges);
      const maxNum = nodesArr.reduce((max, n) => {
        const m = /-(\d+)$/.exec(n?.id ?? "");
        return Math.max(max, m ? parseInt(m[1], 10) : 0);
      }, 0);
      nodeCount.current = Math.max(1, maxNum + 1);
    }
    loadedRef.current = true;
  }, [projectId, setNodes, setEdges]);

  useEffect(() => {
    if (!projectId || !loadedRef.current) return;
    const t = setTimeout(() => {
      saveProject({
        id: projectId,
        name: projectName,
        updatedAt: Date.now(),
        nodes,
        edges,
        productType,
      });
    }, 500);
    return () => clearTimeout(t);
  }, [projectId, projectName, nodes, edges, productType]);

  const handleRename = useCallback(() => {
    const next = window.prompt("Rename project", projectName);
    if (next != null && next.trim()) setProjectName(next.trim());
  }, [projectName]);

  const onConnectEnd = useCallback<OnConnectEnd>((event, connectionState) => {
    connectionEndRef.current?.handleConnectEnd(event, connectionState);
  }, []);

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      imageUpload: ImageUploadNode,
      backgroundRemover: BackgroundRemoverNode,
      lighting: LightingNode,
      generate3d: Generate3DNode,
      spinVideo: SpinVideoNode,
      backgroundReplace: BackgroundReplaceNode,
      promptNode: PromptNode,
      pipelineOutput: PipelineOutputNode,
      model: ModelNode,
    }),
    []
  );

  const edgeTypes: EdgeTypes = useMemo(
    () => ({
      animated: CanvasEdge.Animated,
      temporary: CanvasEdge.Temporary,
    }),
    []
  );

  const isValidConnection = useCallback(
    (connection: {
      source: string;
      target: string;
      sourceHandle?: string | null;
      targetHandle?: string | null;
    }) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      const srcType = sourceNode?.type;
      const tgtType = targetNode?.type;
      const { sourceHandle, targetHandle } = connection;

      const pipelineTypes: (string | undefined)[] = [
        "imageUpload",
        "backgroundRemover",
        "lighting",
        "generate3d",
        "spinVideo",
        "backgroundReplace",
      ];

      // promptNode source-prompt can ONLY connect to target-prompt handles on the 3 parent nodes
      if (srcType === "promptNode" || sourceHandle === "source-prompt") {
        return (
          ["lighting", "spinVideo", "backgroundReplace"].includes(tgtType ?? "") &&
          targetHandle === "target-prompt"
        );
      }

      // target-prompt handles only accept promptNode / source-prompt
      if (targetHandle === "target-prompt") return false;

      // image-type source handles can only connect to target-image handles
      if (
        (sourceHandle === "source-image" || sourceHandle === "source-output") &&
        targetHandle != null &&
        targetHandle !== "target-image"
      ) {
        return false;
      }

      // target-image handles only accept image-type source handles (not video)
      if (
        targetHandle === "target-image" &&
        sourceHandle != null &&
        sourceHandle !== "source-image" &&
        sourceHandle !== "source-output"
      ) {
        return false;
      }

      if (tgtType === "pipelineOutput") {
        return [
          "backgroundRemover",
          "lighting",
          "generate3d",
          "spinVideo",
          "backgroundReplace",
        ].includes(srcType ?? "");
      }
      if (
        pipelineTypes.includes(srcType) &&
        pipelineTypes.includes(tgtType)
      ) {
        return isValidPipelineConnection(connection, nodes);
      }
      return true;
    },
    [nodes]
  );

  const onConnect: OnConnect = useCallback(
    (connection) => {
      setEdges((eds) => addEdge({ ...connection, type: "animated" }, eds));
    },
    [setEdges]
  );

  const addPipelineNodeAt = useCallback(
    (type: PipelineNodeType, position?: XYPosition): string => {
      nodeCount.current += 1;
      const count = nodeCount.current;
      const id = `pipeline-${type}-${count}`;
      const def = PIPELINE_NODE_DEFAULTS[type];
      const pos = position ?? {
        x: INITIAL_X + (count - 1) * NODE_OFFSET,
        y: INITIAL_Y + (count - 1) * NODE_OFFSET,
      };

      if (PROMPT_PARENT_TYPES.has(type)) {
        const promptId = `prompt-${type}-${count}`;
        setNodes((nds) => [
          ...nds,
          {
            id: promptId,
            type: "promptNode",
            position: { x: pos.x - PROMPT_NODE_OFFSET_X, y: pos.y },
            data: {
              label: PROMPT_LABELS[type] ?? "Prompt",
              parentType: type,
              prompt: "",
              promptMissing: false,
            },
          } as AnyNode,
          {
            id,
            type,
            position: pos,
            data: { ...def.data },
          } as AnyNode,
        ]);
        setEdges((eds) =>
          addEdge(
            {
              source: promptId,
              target: id,
              sourceHandle: "source-prompt",
              targetHandle: "target-prompt",
              type: "animated",
            },
            eds
          )
        );
      } else {
        setNodes((nds) => [
          ...nds,
          {
            id,
            type,
            position: pos,
            data: { ...def.data },
          } as AnyNode,
        ]);
      }

      return id;
    },
    [setNodes, setEdges]
  );

  const addPromptNodeAndConnect = useCallback(
    (parentNodeId: string, parentType: "lighting" | "spinVideo" | "backgroundReplace", position: XYPosition) => {
      const promptId = `prompt-auto-${parentNodeId}-${Date.now()}`;
      const label = PROMPT_LABELS[parentType] ?? "Prompt";
      setNodes((nds) => [
        ...nds,
        {
          id: promptId,
          type: "promptNode",
          position: { x: position.x, y: position.y },
          data: {
            label,
            parentType,
            prompt: "",
            promptMissing: false,
          },
        } as AnyNode,
      ]);
      setEdges((eds) =>
        addEdge(
          {
            source: promptId,
            sourceHandle: "source-prompt",
            target: parentNodeId,
            targetHandle: "target-prompt",
            type: "animated",
          },
          eds
        )
      );
    },
    [setNodes, setEdges]
  );

  const addModelNodeAt = useCallback(
    (profile: ModelProfile, position?: XYPosition): string => {
      nodeCount.current += 1;
      const count = nodeCount.current;
      const id = `model-${profile.id}-${count}`;
      const pos = position ?? {
        x: INITIAL_X + (count - 1) * NODE_OFFSET,
        y: INITIAL_Y + 100,
      };
      setNodes((nds) => [
        ...nds,
        {
          id,
          type: "model",
          position: pos,
          data: { label: profile.name, modelId: profile.id },
        } as AnyNode,
      ]);
      return id;
    },
    [setNodes]
  );

  const handleModelSetupComplete = useCallback(
    (profile: ModelProfile) => {
      saveModel(profile);
      setSavedModels(getSavedModels());
      setActiveModelProfile(profile);
      addModelNodeAt(profile);
      setShowModelSetupCard(false);
      setShowModelMenu(false);
    },
    [addModelNodeAt]
  );

  const handleDeleteModel = useCallback(
    (profile: ModelProfile) => {
      removeModel(profile.id);
      setSavedModels(getSavedModels());
      if (activeModelProfile?.id === profile.id) {
        setActiveModelProfile(null);
        setNodes((nds) => nds.filter((n) => n.type !== "model"));
      }
    },
    [activeModelProfile, setNodes]
  );

  const handleSelectSavedModel = useCallback(
    (profile: ModelProfile) => {
      setActiveModelProfile(profile);
      const modelNode = nodes.find((n) => n.type === "model");
      if (modelNode) {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === modelNode.id
              ? { ...n, data: { ...n.data, label: profile.name, modelId: profile.id } }
              : n
          )
        );
      } else {
        addModelNodeAt(profile);
      }
      setShowModelMenu(false);
    },
    [nodes, setNodes, addModelNodeAt]
  );

  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      onNodesChange(changes);

      const promptNodesToRemove: string[] = [];
      for (const change of changes) {
        if (change.type === "remove" && "id" in change) {
          const removed = nodes.find((n) => n.id === change.id);
          if (removed?.type === "model" && activeModelProfile) {
            setActiveModelProfile(null);
          }
          if (removed && PROMPT_PARENT_TYPES.has(removed.type as PipelineNodeType)) {
            const promptEdge = edges.find((e) => e.target === removed.id);
            if (promptEdge) {
              const src = nodes.find((n) => n.id === promptEdge.source);
              if (src?.type === "promptNode") {
                promptNodesToRemove.push(src.id);
              }
            }
          }
        }
      }

      if (promptNodesToRemove.length > 0) {
        setNodes((nds) => nds.filter((n) => !promptNodesToRemove.includes(n.id)));
        setEdges((eds) =>
          eds.filter(
            (e) =>
              !promptNodesToRemove.includes(e.source) &&
              !promptNodesToRemove.includes(e.target)
          )
        );
      }
    },
    [onNodesChange, nodes, edges, activeModelProfile, setNodes, setEdges]
  );

  const runPipeline = useCallback(async () => {
    const PROMPT_PARENT_NODE_TYPES = ["lighting", "spinVideo", "backgroundReplace"];

    // Collect all validation issues across prompt-parent nodes
    type NodeUpdate = { id: string; data: Record<string, unknown> };
    const updates: NodeUpdate[] = [];

    for (const node of nodes) {
      if (!PROMPT_PARENT_NODE_TYPES.includes(node.type ?? "")) continue;

      const promptEdge = edges.find(
        (e) =>
          e.target === node.id &&
          (e.targetHandle === "target-prompt" || !e.targetHandle) &&
          nodes.find((n) => n.id === e.source)?.type === "promptNode"
      );

      if (!promptEdge) {
        updates.push({
          id: node.id,
          data: { validationMessage: "Connect a prompt to execute" },
        });
      } else {
        const promptNode = nodes.find((n) => n.id === promptEdge.source);
        const prompt = ((promptNode?.data as Record<string, unknown>)?.prompt as string) ?? "";
        if (!prompt.trim()) {
          updates.push({
            id: node.id,
            data: { validationMessage: "Enter a prompt before executing" },
          });
          if (promptNode) {
            updates.push({ id: promptNode.id, data: { promptMissing: true } });
          }
        } else {
          updates.push({ id: node.id, data: { validationMessage: undefined } });
        }
      }
    }

    const errorUpdates = updates.filter(
      (u) => u.data.validationMessage || u.data.promptMissing
    );

    if (errorUpdates.length > 0) {
      setNodes((nds) =>
        nds.map((n) => {
          const upd = updates.find((u) => u.id === n.id);
          if (!upd) return n;
          return { ...n, data: { ...n.data, ...upd.data } };
        })
      );
      return;
    }

    // Clear any stale validation messages before running
    setNodes((nds) =>
      nds.map((n) =>
        PROMPT_PARENT_NODE_TYPES.includes(n.type ?? "")
          ? { ...n, data: { ...n.data, validationMessage: undefined } }
          : n
      )
    );

    setRunning(true);
    try {
      await executePipeline(nodes, edges, setNodes, setEdges);
    } finally {
      setRunning(false);
    }
  }, [nodes, edges, setNodes, setEdges]);

  const handleViewOutput = useCallback(() => {
    const outputNode = nodes.find((n) => n.id === "pipeline-output");
    if (outputNode) {
      fitView({ nodes: [outputNode], duration: 300, padding: 0.3 });
    } else {
      setShowOutputPlaceholder((v) => !v);
    }
  }, [nodes, fitView]);

  return (
    <PipelineExecuteProvider runPipeline={runPipeline} running={running}>
    <div
      className={`canvas-dark-mode-wrapper h-screen w-screen transition-colors duration-500 ease-in-out ${isDarkMode ? "dark bg-black" : "bg-white"}`}
    >
      {/* Top-left: 23D brand + project name */}
      <div className="fixed left-5 top-5 z-50 flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <span
              className="sidebar-primary inline-flex h-9 cursor-pointer items-center justify-center gap-0.5 rounded-lg px-2.5 py-2 text-base font-semibold tracking-tight transition-colors hover:bg-accent/80 dark:text-white dark:hover:bg-white/10 dark:hover:text-white"
            >
              23D
              <ChevronDownIcon className="size-3 shrink-0 opacity-70" />
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="bottom"
            sideOffset={8}
            className="w-48 border-border/60 bg-neutral-900/95 text-neutral-100 backdrop-blur-sm"
          >
            <DropdownMenuItem
              className="cursor-pointer focus:bg-neutral-800"
              onClick={() => router.push("/dashboard")}
            >
              <FileIcon className="mr-2 size-4" />
              Back to files
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer focus:bg-neutral-800"
              onClick={() => router.push("/dashboard")}
            >
              <FilePlusIcon className="mr-2 size-4" />
              New workflow
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-default focus:bg-neutral-800">
              <HistoryIcon className="mr-2 size-4" />
              Open recent
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-default focus:bg-neutral-800">
              <CopyIcon className="mr-2 size-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-default focus:bg-neutral-800">
              <ShareIcon className="mr-2 size-4" />
              Share
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          type="button"
          onClick={handleRename}
          className="group/name flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          <span className="truncate">{projectName}</span>
          <PencilIcon className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover/name:opacity-70" />
        </button>
      </div>

      {/* Left sidebar – Product / Avatar selector + Add Node */}
      <aside
        className="fixed left-5 top-72 z-50 flex w-[4.5rem] flex-col gap-0 rounded-lg border border-border/50 bg-card/95 p-2.5 shadow-md backdrop-blur-sm dark:border-white/10"
      >
        <div className="flex flex-col items-center gap-2">
          <DropdownMenu
            open={showProductMenu}
            onOpenChange={(open) => {
              setShowProductMenu(open);
              if (open) setActiveSidebarSection("product");
            }}
          >
            <DropdownMenuTrigger
              render={(props) => (
                <button
                  {...props}
                  type="button"
                  className={`sidebar-primary flex w-full flex-col items-center gap-1 rounded-md px-2 py-2 text-xs font-medium transition-colors hover:bg-accent/80 dark:hover:bg-white/10 dark:hover:text-white ${
                    activeSidebarSection === "product"
                      ? "bg-accent/60 dark:bg-white/10 dark:text-white"
                      : "dark:text-neutral-300"
                  } ${
                    !productType && productPulseTriggered
                      ? "animate-pulse text-red-600 dark:text-red-400"
                      : ""
                  }`}
                >
                  <BoxIcon
                    className={`size-4 shrink-0 ${
                      !productType && productPulseTriggered
                        ? "text-red-600 dark:text-red-400"
                        : ""
                    }`}
                  />
                  Product
                </button>
              )}
            />
            <DropdownMenuContent
              align="start"
              side="right"
              sideOffset={8}
              className="w-52"
            >
              <DropdownMenuItem
                onClick={() => {
                  setProductType("rigid");
                  setProductPulseTriggered(false);
                }}
              >
                Physical Goods
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setProductType("fabric");
                  setProductPulseTriggered(false);
                }}
              >
                Wearables
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setProductType("footwear");
                  setProductPulseTriggered(false);
                }}
              >
                Footwear
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu
            open={showModelMenu}
            onOpenChange={(open) => {
              setShowModelMenu(open);
              if (open) setActiveSidebarSection("model");
            }}
          >
            <DropdownMenuTrigger
              render={(props) => (
                <button
                  {...props}
                  type="button"
                  className={`sidebar-secondary flex w-full flex-col items-center gap-1 rounded-md px-2 py-2 text-xs font-medium transition-colors hover:bg-accent/80 dark:hover:bg-white/10 dark:hover:text-white ${
                    activeSidebarSection === "model"
                      ? "bg-accent/60 dark:bg-white/10 dark:text-white"
                      : "dark:text-neutral-400"
                  }`}
                >
                  <BoxIcon className="size-4 shrink-0" />
                  Avatar
                </button>
              )}
            />
            <DropdownMenuContent
              align="start"
              side="right"
              sideOffset={8}
              className="w-52"
            >
              <DropdownMenuItem
                onClick={() => {
                  setSetupCardMode("create");
                  setShowModelSetupCard(true);
                }}
              >
                <PlusCircleIcon className="mr-2 size-4" />
                Create Avatar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSetupCardMode("generate");
                  setShowModelSetupCard(true);
                }}
              >
                <SparklesIcon className="mr-2 size-4" />
                Generate Avatar
              </DropdownMenuItem>
              {savedModels.length > 0 && (
                <>
                  <div className="my-1 h-px bg-border" role="separator" />
                  {savedModels.map((profile) => (
                    <DropdownMenuItem
                      key={profile.id}
                      onClick={() => handleSelectSavedModel(profile)}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="min-w-0 flex-1 truncate">{profile.name}</span>
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={`Delete ${profile.name}`}
                        className="shrink-0 rounded p-0.5 text-neutral-500 transition-colors hover:bg-destructive/20 hover:text-destructive dark:text-neutral-400 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteModel(profile);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteModel(profile);
                          }
                        }}
                      >
                        <Trash2Icon className="size-3" />
                      </span>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-full border-t border-border/50 dark:border-white/15" aria-hidden />

          <DropdownMenu open={showAddNodeMenu} onOpenChange={setShowAddNodeMenu}>
            <DropdownMenuTrigger>
              <span
                className="sidebar-primary inline-flex w-full cursor-pointer flex-col items-center gap-1 rounded-md py-2 font-medium transition-colors hover:bg-accent/80 dark:text-white dark:hover:bg-white/10 dark:hover:text-white"
              >
                <Plus className="size-4 shrink-0" />
                <span className="text-xs">Add node</span>
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="right" sideOffset={8} className="w-56 overflow-y-auto">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Add node</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => {
                    if (!productType) {
                      setShowAddNodeMenu(false);
                      setProductPulseTriggered(true);
                      setShowProductMenu(true);
                    } else {
                      addPipelineNodeAt("imageUpload");
                    }
                  }}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <ImageIcon className="size-4 shrink-0" />
                      Upload Asset
                    </span>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <span className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground inline-flex">
                            <InfoIcon className="size-3.5" />
                          </span>
                        }
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        aria-label="What this node does"
                      />
                      <TooltipContent side="left" className="max-w-[220px] text-xs">
                        {NODE_DESCRIPTIONS.imageUpload}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (!productType) {
                      setShowAddNodeMenu(false);
                      setProductPulseTriggered(true);
                      setShowProductMenu(true);
                    } else {
                      addPipelineNodeAt("backgroundRemover");
                    }
                  }}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <LayersIcon className="size-4 shrink-0" />
                      Subject Isolation
                    </span>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <span className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground inline-flex">
                            <InfoIcon className="size-3.5" />
                          </span>
                        }
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        aria-label="What this node does"
                      />
                      <TooltipContent side="left" className="max-w-[220px] text-xs">
                        {NODE_DESCRIPTIONS.backgroundRemover}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (!productType) {
                      setShowAddNodeMenu(false);
                      setProductPulseTriggered(true);
                      setShowProductMenu(true);
                    } else {
                      addPipelineNodeAt("lighting");
                    }
                  }}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <LightbulbIcon className="size-4 shrink-0" />
                      Scene Light Sync
                    </span>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <span className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground inline-flex">
                            <InfoIcon className="size-3.5" />
                          </span>
                        }
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        aria-label="What this node does"
                      />
                      <TooltipContent side="left" className="max-w-[220px] text-xs">
                        {NODE_DESCRIPTIONS.lighting}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (!productType) {
                      setShowAddNodeMenu(false);
                      setProductPulseTriggered(true);
                      setShowProductMenu(true);
                    } else {
                      addPipelineNodeAt("generate3d");
                    }
                  }}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <BoxIcon className="size-4 shrink-0" />
                      3D Modeling
                    </span>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <span className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground inline-flex">
                            <InfoIcon className="size-3.5" />
                          </span>
                        }
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        aria-label="What this node does"
                      />
                      <TooltipContent side="left" className="max-w-[220px] text-xs">
                        {NODE_DESCRIPTIONS.generate3d}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (!productType) {
                      setShowAddNodeMenu(false);
                      setProductPulseTriggered(true);
                      setShowProductMenu(true);
                    } else {
                      addPipelineNodeAt("spinVideo");
                    }
                  }}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <VideoIcon className="size-4 shrink-0" />
                      Dynamic Showcase
                    </span>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <span className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground inline-flex">
                            <InfoIcon className="size-3.5" />
                          </span>
                        }
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        aria-label="What this node does"
                      />
                      <TooltipContent side="left" className="max-w-[220px] text-xs">
                        {NODE_DESCRIPTIONS.spinVideo}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (!productType) {
                      setShowAddNodeMenu(false);
                      setProductPulseTriggered(true);
                      setShowProductMenu(true);
                    } else {
                      addPipelineNodeAt("backgroundReplace");
                    }
                  }}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <ImagePlusIcon className="size-4 shrink-0" />
                      Brand Scene Builder
                    </span>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <span className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground inline-flex">
                            <InfoIcon className="size-3.5" />
                          </span>
                        }
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        aria-label="What this node does"
                      />
                      <TooltipContent side="left" className="max-w-[220px] text-xs">
                        {NODE_DESCRIPTIONS.backgroundReplace}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex flex-col items-center pt-2">
            <div className="w-full border-t border-border/50 dark:border-white/15" aria-hidden />
            <button
              type="button"
              className="sidebar-secondary mt-2 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/80 hover:text-foreground dark:text-neutral-500 dark:hover:bg-white/10 dark:hover:text-neutral-200"
              aria-label="Help"
            >
              ?
            </button>
          </div>
          {activeModelProfile && (
            <div className="mt-2 flex w-full items-center gap-1 rounded bg-accent/40 px-2 py-1">
              <span
                className="min-w-0 flex-1 truncate text-center text-[10px] font-medium dark:text-white"
                title={activeModelProfile.name}
              >
                {activeModelProfile.name}
              </span>
              <button
                type="button"
                onClick={() => handleDeleteModel(activeModelProfile)}
                className="shrink-0 rounded p-0.5 text-neutral-500 transition-colors hover:bg-accent hover:text-destructive dark:text-neutral-400 dark:hover:text-destructive"
                aria-label={`Delete ${activeModelProfile.name}`}
              >
                <Trash2Icon className="size-3" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Product type contextual label */}
      {productType && (
        <div
          className="fixed left-24 top-5 z-50 rounded-md bg-card/90 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur-sm dark:bg-neutral-900/90 dark:text-neutral-400"
          role="status"
        >
          Product:{" "}
          {productType === "rigid"
            ? "Physical Goods"
            : productType === "fabric"
              ? "Wearables"
              : "Footwear"}
        </div>
      )}

      {/* Avatar setup card */}
      {showModelSetupCard && (
        <>
          <div
            className="fixed inset-0 z-[55] bg-black/20"
            aria-hidden
            onClick={() => setShowModelSetupCard(false)}
          />
          <ModelSetupCard
            mode={setupCardMode}
            onComplete={handleModelSetupComplete}
            onCancel={() => setShowModelSetupCard(false)}
          />
        </>
      )}

      {/* Floating top-center – View Output */}
      <div
        className="fixed left-1/2 top-5 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-border/50 bg-card/95 px-3 py-2 shadow-md backdrop-blur-sm dark:border-white/10"
        role="group"
        aria-label="Output controls"
      >
        <Button
          size="sm"
          variant="outline"
          onClick={handleViewOutput}
          className="min-w-[5rem] dark:border-white/30 dark:text-white dark:hover:bg-white/10 dark:hover:text-white"
        >
          <MonitorPlayIcon className="mr-1.5 size-3.5" />
          View Output
        </Button>
      </div>

      {/* Placeholder output panel (View Output) */}
      {showOutputPlaceholder && (
        <div
          className="fixed bottom-5 left-1/2 z-50 w-64 -translate-x-1/2 rounded-lg border border-border/50 bg-card/95 px-4 py-4 shadow-md backdrop-blur-sm dark:border-white/10 dark:bg-neutral-900/95"
          role="dialog"
          aria-label="Output preview"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground dark:text-white">
              Output preview
            </span>
            <button
              type="button"
              onClick={() => setShowOutputPlaceholder(false)}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground dark:text-neutral-400">
            Placeholder — full output rendering coming soon.
          </p>
        </div>
      )}

      <Canvas<AnyNode, Edge>
        className={isDarkMode ? "dark" : undefined}
        connectionLineComponent={Connection as ConnectionLineComponent<AnyNode>}
        defaultEdgeOptions={{ type: "animated" }}
        edges={edges}
        edgeTypes={edgeTypes}
        isValidConnection={isValidConnection}
        nodes={nodes}
        nodeTypes={nodeTypes}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        onEdgesChange={onEdgesChange}
        onNodesChange={handleNodesChange}
      >
        <Controls />
        <ConnectionEndMenu
          connectionEndRef={connectionEndRef}
          setEdges={setEdges}
          addPipelineNodeAt={addPipelineNodeAt}
          addPromptNodeAndConnect={addPromptNodeAndConnect}
          productType={productType}
          onProductRequired={() => {
            setProductPulseTriggered(true);
            setShowProductMenu(true);
          }}
        />
        <Panel className="flex flex-col gap-2 p-2" position="top-right">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsDarkMode((d) => !d)}
            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            className="dark:border-white/30 dark:text-white dark:hover:bg-white/10 dark:hover:text-white"
          >
            {isDarkMode ? (
              <SunIcon className="size-4" />
            ) : (
              <MoonIcon className="size-4" />
            )}
          </Button>
        </Panel>
      </Canvas>
    </div>
    </PipelineExecuteProvider>
  );
}

export { CanvasInner };

export default function CanvasPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return null;
}
