import type { EdgeProps, InternalNode, Node } from "@xyflow/react";

import {
  BaseEdge,
  getBezierPath,
  getSimpleBezierPath,
  Position,
  useInternalNode,
} from "@xyflow/react";

const Temporary = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: EdgeProps) => {
  const [edgePath] = getSimpleBezierPath({
    sourcePosition,
    sourceX,
    sourceY,
    targetPosition,
    targetX,
    targetY,
  });

  return (
    <BaseEdge
      className="stroke-1 stroke-ring"
      id={id}
      path={edgePath}
      style={{
        strokeDasharray: "5, 5",
      }}
    />
  );
};

const getHandleCoordsByPosition = (
  node: InternalNode<Node>,
  handlePosition: Position,
  handleId?: string | null
) => {
  // Choose the handle type based on position - Left is for target, Right is for source
  const handleType = handlePosition === Position.Left ? "target" : "source";

  const bounds = node.internals.handleBounds?.[handleType] ?? [];
  const byIdAndPosition =
    handleId != null && handleId !== ""
      ? bounds.find((h) => h.position === handlePosition && (h as { id?: string }).id === handleId)
      : null;
  const handle = byIdAndPosition ?? bounds.find((h) => h.position === handlePosition);

  if (!handle) {
    return [0, 0] as const;
  }

  let offsetX = handle.width / 2;
  let offsetY = handle.height / 2;

  // this is a tiny detail to make the markerEnd of an edge visible.
  // The handle position that gets calculated has the origin top-left, so depending which side we are using, we add a little offset
  // when the handlePosition is Position.Right for example, we need to add an offset as big as the handle itself in order to get the correct position
  switch (handlePosition) {
    case Position.Left: {
      offsetX = 0;
      break;
    }
    case Position.Right: {
      offsetX = handle.width;
      break;
    }
    case Position.Top: {
      offsetY = 0;
      break;
    }
    case Position.Bottom: {
      offsetY = handle.height;
      break;
    }
    default: {
      throw new Error(`Invalid handle position: ${handlePosition}`);
    }
  }

  const x = node.internals.positionAbsolute.x + handle.x + offsetX;
  const y = node.internals.positionAbsolute.y + handle.y + offsetY;

  return [x, y] as const;
};

const getEdgeParams = (
  source: InternalNode<Node>,
  target: InternalNode<Node>,
  sourceHandle?: string | null,
  targetHandle?: string | null
) => {
  const sourcePos = Position.Right;
  const [sx, sy] = getHandleCoordsByPosition(source, sourcePos, sourceHandle);
  const targetPos = Position.Left;
  const [tx, ty] = getHandleCoordsByPosition(target, targetPos, targetHandle);

  return {
    sourcePos,
    sx,
    sy,
    targetPos,
    tx,
    ty,
  };
};

const Animated = ({
  id,
  source,
  target,
  sourceHandle,
  targetHandle,
  sourceX: propsSourceX,
  sourceY: propsSourceY,
  targetX: propsTargetX,
  targetY: propsTargetY,
  sourcePosition: propsSourcePosition,
  targetPosition: propsTargetPosition,
  markerEnd,
  style,
}: EdgeProps) => {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!(sourceNode && targetNode)) {
    return null;
  }

  const usePropsCoords =
    propsSourceX != null &&
    propsSourceY != null &&
    propsTargetX != null &&
    propsTargetY != null &&
    propsSourcePosition != null &&
    propsTargetPosition != null;

  const { sx, sy, tx, ty, sourcePos, targetPos } = usePropsCoords
    ? {
        sx: propsSourceX,
        sy: propsSourceY,
        tx: propsTargetX,
        ty: propsTargetY,
        sourcePos: propsSourcePosition,
        targetPos: propsTargetPosition,
      }
    : getEdgeParams(sourceNode, targetNode, sourceHandle, targetHandle);

  const [edgePath] = getBezierPath({
    sourcePosition: sourcePos,
    sourceX: sx,
    sourceY: sy,
    targetPosition: targetPos,
    targetX: tx,
    targetY: ty,
  });

  return (
    <BaseEdge id={id} markerEnd={markerEnd} path={edgePath} style={style} />
  );
};

export const Edge = {
  Animated,
  Temporary,
};
