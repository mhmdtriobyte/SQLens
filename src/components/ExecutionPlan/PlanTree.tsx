/**
 * @fileoverview Main plan tree visualization component for SQLens.
 *
 * Renders the query execution plan as an interactive tree using React Flow,
 * with support for zooming, panning, node selection, and step-through animation.
 *
 * @module components/ExecutionPlan/PlanTree
 */

'use client';

import { useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  type Node,
  type Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionLineType,
  MarkerType,
  type NodeMouseHandler,
  type Viewport,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useQueryStore, useUIStore } from '@/stores';
import { PlanNode } from './PlanNode';
import { DataFlowAnimation } from './DataFlowAnimation';
import { NodeDetailPanel } from './NodeDetailPanel';
import { cn } from '@/utils';
import type { PlanNode as PlanNodeType, QueryPlan } from '@/types';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the PlanTree component.
 */
interface PlanTreeProps {
  /**
   * Additional CSS classes for the container.
   */
  className?: string;
}

/**
 * Data structure passed to React Flow nodes.
 */
interface NodeData {
  node: PlanNodeType;
  isActive: boolean;
  isComplete: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Custom node types for React Flow.
 */
const nodeTypes = {
  planNode: PlanNode,
};

/**
 * Layout configuration.
 */
const LAYOUT_CONFIG = {
  levelHeight: 120,
  nodeWidth: 180,
  horizontalGap: 40,
  rootX: 400,
  rootY: 50,
};

// ============================================================================
// Layout Utilities
// ============================================================================

/**
 * Calculates the total width of a subtree.
 *
 * @param node - The root of the subtree
 * @returns Total width in pixels
 */
function getSubtreeWidth(node: PlanNodeType): number {
  if (node.children.length === 0) {
    return LAYOUT_CONFIG.nodeWidth;
  }

  return node.children.reduce(
    (sum, child) => sum + getSubtreeWidth(child) + LAYOUT_CONFIG.horizontalGap,
    -LAYOUT_CONFIG.horizontalGap
  );
}

/**
 * Converts a query plan tree to React Flow nodes and edges.
 *
 * The layout algorithm:
 * 1. Calculates subtree widths recursively
 * 2. Positions parent nodes centered above their children
 * 3. Creates edges from children to parents (data flows up)
 *
 * @param plan - The query plan to convert
 * @param currentStepNodeId - ID of the currently active step
 * @param completedNodeIds - Set of node IDs that have completed execution
 * @returns Object containing nodes and edges arrays
 */
function planToFlow(
  plan: QueryPlan | null,
  currentStepNodeId: string | null,
  completedNodeIds: Set<string>
): { nodes: Node<NodeData>[]; edges: Edge[] } {
  if (!plan) return { nodes: [], edges: [] };

  const nodes: Node<NodeData>[] = [];
  const edges: Edge[] = [];

  /**
   * Recursively positions nodes and creates edges.
   */
  function positionNodes(
    node: PlanNodeType,
    x: number,
    y: number,
    parentId: string | null
  ): void {
    // Create the node
    nodes.push({
      id: node.id,
      type: 'planNode',
      position: { x, y },
      data: {
        node,
        isActive: node.id === currentStepNodeId,
        isComplete: completedNodeIds.has(node.id),
      },
    });

    // Create edge from child to parent (data flows up)
    if (parentId) {
      const isOnActivePath = node.id === currentStepNodeId;

      edges.push({
        id: `${node.id}-${parentId}`,
        source: node.id,
        target: parentId,
        type: 'smoothstep',
        animated: isOnActivePath,
        style: {
          stroke: isOnActivePath ? 'var(--accent)' : 'var(--border)',
          strokeWidth: isOnActivePath ? 2 : 1,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isOnActivePath ? 'var(--accent)' : 'var(--border)',
        },
      });
    }

    // Position children
    if (node.children.length > 0) {
      const totalWidth = getSubtreeWidth(node);
      let childX = x - totalWidth / 2 + LAYOUT_CONFIG.nodeWidth / 2;

      node.children.forEach((child) => {
        const childWidth = getSubtreeWidth(child);
        positionNodes(
          child,
          childX + childWidth / 2 - LAYOUT_CONFIG.nodeWidth / 2,
          y + LAYOUT_CONFIG.levelHeight,
          node.id
        );
        childX += childWidth + LAYOUT_CONFIG.horizontalGap;
      });
    }
  }

  // Start positioning from root at top
  positionNodes(plan.root, LAYOUT_CONFIG.rootX, LAYOUT_CONFIG.rootY, null);

  return { nodes, edges };
}

// ============================================================================
// Empty State Component
// ============================================================================

/**
 * Renders an empty state when no plan is available.
 */
function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center bg-background">
      <div className="text-center text-muted">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
          <svg
            className="w-8 h-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
            />
          </svg>
        </div>
        <p className="text-sm font-medium">No query plan to display</p>
        <p className="text-xs mt-1 max-w-[250px] mx-auto">
          Write a SQL query and click &quot;Step Through&quot; to visualize the execution plan
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// PlanTree Component
// ============================================================================

/**
 * Main plan tree visualization component.
 *
 * Features:
 * - Interactive zoomable/pannable canvas
 * - Animated edges during step-through
 * - Node highlighting for current step
 * - Click to select nodes and see details
 * - Minimap for large plans
 * - Background grid
 * - Animated particles showing data flow
 *
 * @example
 * ```tsx
 * <div className="h-screen">
 *   <PlanTree />
 * </div>
 * ```
 */
export function PlanTree({ className }: PlanTreeProps) {
  const { queryPlan, stepThrough } = useQueryStore();
  const {
    planTreeZoom,
    setPlanTreeZoom,
    selectedNodeId,
    setSelectedNodeId,
    theme,
    showMinimap,
  } = useUIStore();

  // Calculate current step node ID
  const currentStepNodeId = useMemo(() => {
    if (stepThrough.currentStepIndex < 0) return null;
    return stepThrough.steps[stepThrough.currentStepIndex]?.nodeId || null;
  }, [stepThrough.steps, stepThrough.currentStepIndex]);

  // Calculate completed node IDs
  const completedNodeIds = useMemo(() => {
    const completed = new Set<string>();
    for (let i = 0; i < stepThrough.currentStepIndex; i++) {
      const step = stepThrough.steps[i];
      if (step) {
        completed.add(step.nodeId);
      }
    }
    return completed;
  }, [stepThrough.steps, stepThrough.currentStepIndex]);

  // Convert plan to React Flow format
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => planToFlow(queryPlan, currentStepNodeId, completedNodeIds),
    [queryPlan, currentStepNodeId, completedNodeIds]
  );

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update when plan or step changes
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = planToFlow(
      queryPlan,
      currentStepNodeId,
      completedNodeIds
    );
    setNodes(newNodes);
    setEdges(newEdges);
  }, [queryPlan, currentStepNodeId, completedNodeIds, setNodes, setEdges]);

  // Node click handler
  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId]
  );

  // Background click handler - deselect node
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  // Zoom change handler
  const onMoveEnd = useCallback(
    (_: unknown, viewport: Viewport) => {
      setPlanTreeZoom(viewport.zoom);
    },
    [setPlanTreeZoom]
  );

  // Render empty state if no plan
  if (!queryPlan) {
    return <EmptyState />;
  }

  // Determine colors based on theme
  const isDark = theme === 'dark';
  const backgroundColor = isDark ? '#333' : '#ddd';
  const maskColor = isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)';

  return (
    <div className={cn('h-full relative', className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: planTreeZoom }}
        onMoveEnd={onMoveEnd}
        proOptions={{ hideAttribution: true }}
        // Disable editing features
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        selectNodesOnDrag={false}
      >
        <Background
          color={backgroundColor}
          gap={20}
          size={1}
        />

        <Controls
          className="!bg-panel !border-border !shadow-lg"
          showZoom
          showFitView
          showInteractive={false}
        />

        {showMinimap && (
          <MiniMap
            className="!bg-panel !border-border"
            nodeColor={(node) =>
              node.data?.isActive ? 'var(--accent)' : 'var(--muted)'
            }
            maskColor={maskColor}
          />
        )}

        <DataFlowAnimation currentNodeId={currentStepNodeId} />
      </ReactFlow>

      {selectedNodeId && <NodeDetailPanel />}
    </div>
  );
}
