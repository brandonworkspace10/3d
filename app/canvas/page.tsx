"use client";

import type {
  ConnectionLineComponent,
  Edge,
  EdgeTypes,
  NodeProps as FlowNodeProps,
  Node,
  NodeTypes,
  OnConnect,
} from "@xyflow/react";
import {
  addEdge,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { Plus } from "lucide-react";
import { useCallback, useMemo, useRef } from "react";

import { Canvas } from "@/components/ai-elements/canvas";
import { Connection } from "@/components/ai-elements/connection";
import { Controls } from "@/components/ai-elements/controls";
import { Edge as CanvasEdge } from "@/components/ai-elements/edge";
import {
  Node as CanvasNode,
  NodeContent,
  NodeDescription,
  NodeHeader,
  NodeTitle,
} from "@/components/ai-elements/node";
import { Panel } from "@/components/ai-elements/panel";
import { Button } from "@/components/ui/button";

type WorkflowNodeData = {
  label: string;
  description?: string;
  content?: string;
};

type WorkflowNode = Node<WorkflowNodeData, "workflow">;

const NODE_OFFSET = 40;
const INITIAL_X = 100;
const INITIAL_Y = 100;

function WorkflowNodeComponent({ data }: FlowNodeProps<WorkflowNode>) {
  return (
    <CanvasNode handles={{ target: true, source: true }}>
      <NodeHeader>
        <NodeTitle>{data.label}</NodeTitle>
        {data.description && (
          <NodeDescription>{data.description}</NodeDescription>
        )}
      </NodeHeader>
      {data.content && <NodeContent>{data.content}</NodeContent>}
    </CanvasNode>
  );
}

const initialNodes: WorkflowNode[] = [
  {
    id: "1",
    type: "workflow",
    position: { x: 100, y: 200 },
    data: {
      label: "Node 1",
      description: "Starting node",
      content: "Drag from the handles to connect nodes.",
    },
  },
  {
    id: "2",
    type: "workflow",
    position: { x: 600, y: 200 },
    data: {
      label: "Node 2",
      description: "Second node",
      content: "Connect me to the first node!",
    },
  },
];

const initialEdges: Edge[] = [];

function CanvasInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const nodeCount = useRef(initialNodes.length);

  const nodeTypes: NodeTypes = useMemo(
    () => ({ workflow: WorkflowNodeComponent }),
    []
  );

  const edgeTypes: EdgeTypes = useMemo(
    () => ({
      animated: CanvasEdge.Animated,
      temporary: CanvasEdge.Temporary,
    }),
    []
  );

  const onConnect: OnConnect = useCallback(
    (connection) => {
      setEdges((eds) => addEdge({ ...connection, type: "animated" }, eds));
    },
    [setEdges]
  );

  const addNode = useCallback(() => {
    nodeCount.current += 1;
    const count = nodeCount.current;

    const newNode: WorkflowNode = {
      id: String(count),
      type: "workflow",
      position: {
        x: INITIAL_X + (count - 1) * NODE_OFFSET,
        y: INITIAL_Y + (count - 1) * NODE_OFFSET,
      },
      data: {
        label: `Node ${count}`,
        description: "New node",
      },
    };

    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  return (
    <div className="h-screen w-screen">
      <Canvas<WorkflowNode, Edge>
        connectionLineComponent={Connection as ConnectionLineComponent<WorkflowNode>}
        defaultEdgeOptions={{ type: "animated" }}
        edges={edges}
        edgeTypes={edgeTypes}
        nodes={nodes}
        nodeTypes={nodeTypes}
        onConnect={onConnect}
        onEdgesChange={onEdgesChange}
        onNodesChange={onNodesChange}
      >
        <Controls />
        <Panel className="flex items-center gap-2 p-2" position="top-right">
          <Button onClick={addNode} size="sm" variant="outline">
            <Plus data-icon="inline-start" />
            Add Node
          </Button>
        </Panel>
      </Canvas>
    </div>
  );
}

export default function CanvasPage() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
