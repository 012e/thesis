import { useMemo } from "react";
import dagre from "@dagrejs/dagre";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import type {
  ModerationValidationGraphNodeType,
  ModerationValidationGraphType,
  ModerationValidationStepStatusType,
} from "@repo/rest-contracts";
import "@xyflow/react/dist/style.css";

import { BaseNode, BaseNodeContent } from "@/components/base-node";
import {
  NodeTooltip,
  NodeTooltipContent,
  NodeTooltipTrigger,
} from "@/components/node-tooltip";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

import { humanize } from "./-shared";

type ValidationNodeData = ModerationValidationGraphNodeType["data"] &
  Record<string, unknown>;
type ValidationFlowNode = Node<ValidationNodeData, "validationStep">;

const validationNodeWidth = 224;
const validationNodeHeight = 112;

const validationStatusClasses: Record<
  ModerationValidationStepStatusType,
  string
> = {
  passed: "border-emerald-500 bg-emerald-50 text-emerald-950",
  blocked: "border-red-600 bg-red-50 text-red-950",
  needs_human_review: "border-orange-500 bg-orange-50 text-orange-950",
  pending: "border-yellow-500 border-dashed bg-yellow-50 text-yellow-950",
  not_run:
    "border-slate-400 border-dotted bg-slate-50 text-slate-500 opacity-45",
};

const validationStatusLabels: Record<
  ModerationValidationStepStatusType,
  string
> = {
  passed: "Passed",
  blocked: "Blocked",
  needs_human_review: "Needs human review",
  pending: "Pending",
  not_run: "Not run",
};

function layoutValidationGraph(
  nodes: ModerationValidationGraphType["nodes"],
  edges: ModerationValidationGraphType["edges"],
): ValidationFlowNode[] {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: "LR", nodesep: 48, ranksep: 88 });

  for (const node of nodes) {
    graph.setNode(node.id, {
      width: validationNodeWidth,
      height: validationNodeHeight,
    });
  }

  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  return nodes.map((node) => {
    const position = graph.node(node.id) as
      | { x: number; y: number }
      | undefined;

    return {
      ...node,
      type: "validationStep",
      draggable: false,
      position: position
        ? {
            x: position.x - validationNodeWidth / 2,
            y: position.y - validationNodeHeight / 2,
          }
        : node.position,
    };
  });
}

function ValidationStepNode({ data }: NodeProps<ValidationFlowNode>) {
  const hoverText = [data.message, data.detail].filter(Boolean).join("\n\n");

  return (
    <NodeTooltip>
      {hoverText ? (
        <NodeTooltipContent
          position={Position.Top}
          className="max-w-sm whitespace-pre-wrap text-xs leading-relaxed"
        >
          {hoverText}
        </NodeTooltipContent>
      ) : null}
      <BaseNode
        className={cn(
          "w-56 rounded-none border-2 shadow-sm hover:ring-0",
          validationStatusClasses[data.status],
        )}
      >
        <Handle type="target" position={Position.Left} className="opacity-40" />
        <BaseNodeContent className="p-0">
          <NodeTooltipTrigger className="px-3 py-2 text-left">
            <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
              {humanize(data.pipeline)}
            </div>
            <div className="mt-1 text-xs font-semibold">{data.label}</div>
            <div className="mt-2 text-[11px] opacity-80">
              {validationStatusLabels[data.status]}
            </div>
            {data.message ? (
              <div className="mt-1 line-clamp-2 text-[11px] opacity-75">
                {data.message}
              </div>
            ) : null}
          </NodeTooltipTrigger>
        </BaseNodeContent>
        <Handle
          type="source"
          position={Position.Right}
          className="opacity-40"
        />
      </BaseNode>
    </NodeTooltip>
  );
}

const validationNodeTypes = { validationStep: ValidationStepNode };

export function ValidationStatusGraph({
  graph,
  isLoading,
  error,
}: {
  graph: ModerationValidationGraphType | undefined;
  isLoading: boolean;
  error: Error | null;
}) {
  const nodes = useMemo<ValidationFlowNode[]>(
    () => (graph ? layoutValidationGraph(graph.nodes, graph.edges) : []),
    [graph],
  );
  const edges = useMemo<Edge[]>(
    () =>
      graph?.edges.map((edge) => ({
        ...edge,
        type: "smoothstep",
        animated: false,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 18,
          height: 18,
        },
      })) ?? [],
    [graph?.edges],
  );

  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center rounded-none border">
        <Spinner size="md" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-none border border-destructive/30 bg-destructive/5 p-4 text-xs text-destructive">
        Failed to load validation graph: {error.message}
      </div>
    );
  }

  if (!graph) {
    return (
      <div className="rounded-none border p-4 text-xs text-muted-foreground">
        Validation graph is unavailable for this post.
      </div>
    );
  }

  return (
    <div className="h-80 overflow-hidden rounded-none border bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={validationNodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        colorMode={"dark"}
      >
        <Background gap={18} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
