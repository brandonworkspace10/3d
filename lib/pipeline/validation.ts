import { canConnect, type PipelineNodeType } from "./types";

export interface NodeWithType {
  id: string;
  type?: string;
}

export interface ConnectionLike {
  source: string;
  target: string;
}

/**
 * Returns true if the connection is allowed by the pipeline graph.
 */
export function isValidPipelineConnection(
  connection: ConnectionLike,
  nodes: NodeWithType[]
): boolean {
  const sourceNode = nodes.find((n) => n.id === connection.source);
  const targetNode = nodes.find((n) => n.id === connection.target);
  if (!sourceNode || !targetNode) return false;
  if (sourceNode.id === targetNode.id) return false;
  const sourceType = sourceNode.type as PipelineNodeType | undefined;
  const targetType = targetNode.type as PipelineNodeType | undefined;
  if (!sourceType || !targetType) return false;
  return canConnect(sourceType, targetType);
}
