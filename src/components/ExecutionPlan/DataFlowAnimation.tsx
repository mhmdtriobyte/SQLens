/**
 * @fileoverview Data flow animation component for the execution plan visualizer.
 *
 * Renders animated particles that flow along edges to visualize
 * data movement between nodes during step-through execution.
 *
 * @module components/ExecutionPlan/DataFlowAnimation
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useReactFlow } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the DataFlowAnimation component.
 */
interface DataFlowAnimationProps {
  /**
   * ID of the currently active node receiving data.
   * Null if no step is active.
   */
  currentNodeId: string | null;
}

/**
 * Represents an animated particle flowing along an edge.
 */
interface Particle {
  /**
   * Unique identifier for the particle.
   */
  id: string;

  /**
   * Starting X coordinate.
   */
  x: number;

  /**
   * Starting Y coordinate.
   */
  y: number;

  /**
   * Target X coordinate.
   */
  targetX: number;

  /**
   * Target Y coordinate.
   */
  targetY: number;

  /**
   * Particle color (defaults to accent color).
   */
  color?: string;

  /**
   * Delay before animation starts (in seconds).
   */
  delay?: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default particle radius in pixels.
 */
const PARTICLE_RADIUS = 6;

/**
 * Animation duration in seconds.
 */
const ANIMATION_DURATION = 0.8;

/**
 * Time to wait before clearing particles (in milliseconds).
 */
const CLEAR_DELAY = 1000;

/**
 * Offset for centering particles on nodes.
 */
const NODE_CENTER_OFFSET_X = 80;
const NODE_CENTER_OFFSET_Y = 60;

// ============================================================================
// DataFlowAnimation Component
// ============================================================================

/**
 * Renders animated particles flowing along edges in the plan tree.
 *
 * When a node becomes active during step-through execution, particles
 * are created to flow from child nodes (data sources) to the current
 * node, visualizing the data flow.
 *
 * Features:
 * - Smooth bezier curve animations
 * - Multiple particles for multiple input edges
 * - Staggered animation delays
 * - Automatic cleanup after animation completes
 * - Color-coded by operation type (optional)
 *
 * @example
 * ```tsx
 * // Used inside React Flow
 * <ReactFlow>
 *   <DataFlowAnimation currentNodeId="node-selection-1" />
 * </ReactFlow>
 * ```
 */
export function DataFlowAnimation({ currentNodeId }: DataFlowAnimationProps) {
  const { getNodes, getEdges } = useReactFlow();
  const [particles, setParticles] = useState<Particle[]>([]);

  /**
   * Creates particles for edges flowing into the current node.
   */
  const createParticles = useCallback(() => {
    if (!currentNodeId) {
      setParticles([]);
      return;
    }

    try {
      // Find edges leading to current node
      const edges = getEdges().filter((e) => e.target === currentNodeId);
      const nodes = getNodes();

      // Create particles for each incoming edge
      const newParticles: Particle[] = [];

      edges.forEach((edge, idx) => {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        const targetNode = nodes.find((n) => n.id === edge.target);

        if (sourceNode && targetNode) {
          newParticles.push({
            id: `${edge.id}-${Date.now()}-${idx}`,
            x: sourceNode.position.x + NODE_CENTER_OFFSET_X,
            y: sourceNode.position.y,
            targetX: targetNode.position.x + NODE_CENTER_OFFSET_X,
            targetY: targetNode.position.y + NODE_CENTER_OFFSET_Y,
            delay: idx * 0.1, // Stagger animation for multiple inputs
          });
        }
      });

      setParticles(newParticles);
    } catch (error) {
      // Silently handle errors (e.g., if React Flow is not ready)
      console.warn('DataFlowAnimation: Could not create particles', error);
    }
  }, [currentNodeId, getEdges, getNodes]);

  useEffect(() => {
    createParticles();

    // Clear particles after animation completes
    const timer = setTimeout(() => setParticles([]), CLEAR_DELAY);
    return () => clearTimeout(timer);
  }, [createParticles]);

  // Don't render if no particles
  if (particles.length === 0) {
    return null;
  }

  return (
    <svg className="absolute inset-0 pointer-events-none overflow-visible z-50">
      <defs>
        {/* Glow filter for particles */}
        <filter id="particle-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <AnimatePresence>
        {particles.map((particle) => (
          <motion.g key={particle.id}>
            {/* Trail effect */}
            <motion.circle
              cx={particle.x}
              cy={particle.y}
              r={PARTICLE_RADIUS + 2}
              fill="var(--accent)"
              opacity={0.3}
              initial={{
                cx: particle.x,
                cy: particle.y,
              }}
              animate={{
                cx: particle.targetX,
                cy: particle.targetY,
                opacity: [0.3, 0.1, 0],
              }}
              transition={{
                duration: ANIMATION_DURATION,
                ease: 'easeInOut',
                delay: particle.delay || 0,
              }}
            />

            {/* Main particle */}
            <motion.circle
              cx={particle.x}
              cy={particle.y}
              r={PARTICLE_RADIUS}
              fill={particle.color || 'var(--accent)'}
              filter="url(#particle-glow)"
              initial={{
                cx: particle.x,
                cy: particle.y,
                opacity: 1,
                scale: 1,
              }}
              animate={{
                cx: particle.targetX,
                cy: particle.targetY,
                opacity: [1, 1, 0],
                scale: [1, 1.2, 0.8],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: ANIMATION_DURATION,
                ease: 'easeInOut',
                delay: particle.delay || 0,
              }}
            />
          </motion.g>
        ))}
      </AnimatePresence>
    </svg>
  );
}
