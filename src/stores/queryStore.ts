/**
 * @fileoverview Query state management store for SQLens.
 *
 * This store manages all query-related state including the current query,
 * execution plan, step-through state, and query results.
 *
 * @module stores/queryStore
 */

import { create } from 'zustand';
import type { QueryPlan, QueryResult, ParseError, ExecutionStep, IntermediateResult } from '@/types';
import { parseQuery } from '@/engine/parser';
import { createQueryPlan } from '@/engine/planner';
import { executeSteps } from '@/engine/stepper';
import { executeQuery } from '@/engine/database';

/**
 * State for step-through visualization
 */
interface StepThroughState {
  steps: ExecutionStep[];
  currentStepIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;
  finalResult: IntermediateResult | null;
}

// ============================================================================
// Store State Interface
// ============================================================================

/**
 * State interface for the query store.
 */
interface QueryStoreState {
  /**
   * The current SQL query string in the editor.
   * Aliased as currentQuery for component compatibility.
   */
  query: string;

  /**
   * The parsed query execution plan.
   * Null if no query has been parsed or parsing failed.
   */
  queryPlan: QueryPlan | null;

  /**
   * Step-through execution state for visualizing query execution.
   */
  stepThrough: StepThroughState;

  /**
   * The final query result after execution.
   * Null if no query has been executed.
   */
  queryResult: QueryResult | null;

  /**
   * Whether a query is currently being parsed or executed.
   */
  isLoading: boolean;

  /**
   * Error message from the last operation.
   * Null if no error occurred.
   */
  error: string | null;

  /**
   * Parse error with detailed information for display.
   * Null if no parse error occurred.
   */
  parseError: ParseError | null;
}

// ============================================================================
// Store Actions Interface
// ============================================================================

/**
 * Actions interface for the query store.
 */
interface QueryStoreActions {
  /**
   * Sets the current query string.
   */
  setQuery: (query: string) => void;

  /**
   * Sets the parsed query plan.
   */
  setQueryPlan: (plan: QueryPlan | null) => void;

  /**
   * Sets the step-through execution state.
   */
  setStepThrough: (state: Partial<StepThroughState>) => void;

  /**
   * Advances to the next step in step-through execution.
   */
  nextStep: () => void;

  /**
   * Goes back to the previous step in step-through execution.
   */
  prevStep: () => void;

  /**
   * Jumps to a specific step in step-through execution.
   */
  goToStep: (index: number) => void;

  /**
   * Starts automatic playback of steps.
   */
  play: () => void;

  /**
   * Pauses automatic playback.
   */
  pause: () => void;

  /**
   * Sets the playback speed in milliseconds.
   */
  setPlaybackSpeed: (speed: number) => void;

  /**
   * Sets the query result.
   */
  setQueryResult: (result: QueryResult | null) => void;

  /**
   * Sets the loading state.
   */
  setLoading: (loading: boolean) => void;

  /**
   * Sets an error message.
   */
  setError: (error: string | null) => void;

  /**
   * Resets the store to initial state.
   */
  reset: () => void;

  /**
   * Initializes step-through with a list of execution steps.
   */
  initializeStepThrough: (steps: ExecutionStep[]) => void;

  /**
   * Sets a parse error.
   */
  setParseError: (error: ParseError | null) => void;

  /**
   * Parse the current query and generate plan.
   */
  parseCurrentQuery: () => boolean;

  /**
   * Executes the current query against the database.
   */
  executeCurrentQuery: () => void;

  /**
   * Starts step-through mode for the current query.
   */
  startStepThrough: () => void;

  /**
   * Toggle playback on/off.
   */
  togglePlayback: () => void;

  /**
   * Alias for prevStep.
   */
  previousStep: () => void;

  /**
   * Reset step-through state.
   */
  resetStepThrough: () => void;

  /**
   * Clear all errors.
   */
  clearError: () => void;
}

// ============================================================================
// Computed Properties (Aliases)
// ============================================================================

/**
 * Extended store type with computed properties for component compatibility.
 */
interface QueryStoreComputed {
  /**
   * Alias for query - used by components expecting currentQuery.
   */
  currentQuery: string;
}

// ============================================================================
// Initial State
// ============================================================================

/**
 * Initial state for the step-through execution.
 */
const initialStepThroughState: StepThroughState = {
  steps: [],
  currentStepIndex: -1,
  isPlaying: false,
  playbackSpeed: 1000,
  finalResult: null,
};

/**
 * Initial state for the query store.
 */
const initialState: QueryStoreState = {
  query: '',
  queryPlan: null,
  stepThrough: initialStepThroughState,
  queryResult: null,
  isLoading: false,
  error: null,
  parseError: null,
};

// ============================================================================
// Store Definition
// ============================================================================

/**
 * Query state management store.
 *
 * Manages all query-related state including:
 * - Current SQL query in the editor
 * - Parsed execution plan
 * - Step-through visualization state
 * - Query execution results
 *
 * @example
 * ```typescript
 * import { useQueryStore } from '@/stores';
 *
 * function QueryEditor() {
 *   const { query, setQuery, queryPlan } = useQueryStore();
 *
 *   return (
 *     <textarea
 *       value={query}
 *       onChange={(e) => setQuery(e.target.value)}
 *     />
 *   );
 * }
 * ```
 */
export const useQueryStore = create<QueryStoreState & QueryStoreActions & QueryStoreComputed>((set, get) => ({
  // State
  ...initialState,

  // Computed property alias for component compatibility
  get currentQuery() {
    return get().query;
  },

  // Actions
  setQuery: (query: string) => set({ query, parseError: null }),

  setQueryPlan: (plan: QueryPlan | null) => set({ queryPlan: plan }),

  setStepThrough: (state: Partial<StepThroughState>) =>
    set((prev) => ({
      stepThrough: { ...prev.stepThrough, ...state },
    })),

  nextStep: () => {
    const { stepThrough } = get();
    if (stepThrough.currentStepIndex < stepThrough.steps.length - 1) {
      set({
        stepThrough: {
          ...stepThrough,
          currentStepIndex: stepThrough.currentStepIndex + 1,
        },
      });
    }
  },

  prevStep: () => {
    const { stepThrough } = get();
    if (stepThrough.currentStepIndex > 0) {
      set({
        stepThrough: {
          ...stepThrough,
          currentStepIndex: stepThrough.currentStepIndex - 1,
        },
      });
    }
  },

  goToStep: (index: number) => {
    const { stepThrough } = get();
    if (index >= 0 && index < stepThrough.steps.length) {
      set({
        stepThrough: {
          ...stepThrough,
          currentStepIndex: index,
        },
      });
    }
  },

  play: () => {
    set((prev) => ({
      stepThrough: { ...prev.stepThrough, isPlaying: true },
    }));
  },

  pause: () => {
    set((prev) => ({
      stepThrough: { ...prev.stepThrough, isPlaying: false },
    }));
  },

  setPlaybackSpeed: (speed: number) => {
    set((prev) => ({
      stepThrough: { ...prev.stepThrough, playbackSpeed: speed },
    }));
  },

  setQueryResult: (result: QueryResult | null) => set({ queryResult: result }),

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  setError: (error: string | null) => set({ error }),

  reset: () => set(initialState),

  initializeStepThrough: (steps: ExecutionStep[]) => {
    set({
      stepThrough: {
        steps,
        currentStepIndex: steps.length > 0 ? 0 : -1,
        isPlaying: false,
        playbackSpeed: 1000,
        finalResult: steps.length > 0 ? (steps[steps.length - 1]?.output ?? null) : null,
      },
    });
  },

  setParseError: (parseError: ParseError | null) => set({ parseError, queryPlan: null }),

  /**
   * Parse the current query and generate execution plan
   */
  parseCurrentQuery: (): boolean => {
    const { query } = get();
    const result = parseQuery(query);

    if (!result.success) {
      set({ parseError: result.error, queryPlan: null });
      return false;
    }

    // Create execution plan from AST
    const plan = createQueryPlan(result.result?.ast);
    plan.originalQuery = query;

    set({ queryPlan: plan, parseError: null });
    return true;
  },

  /**
   * Execute the current query against the database
   */
  executeCurrentQuery: () => {
    const { query } = get();
    if (!query.trim()) {
      return;
    }

    // First parse the query
    const parseResult = parseQuery(query);
    if (!parseResult.success) {
      set({
        parseError: parseResult.error,
        queryPlan: null,
        isLoading: false
      });
      return;
    }

    // Create execution plan
    const plan = createQueryPlan(parseResult.result?.ast);
    plan.originalQuery = query;

    set({ isLoading: true, error: null, parseError: null, queryPlan: plan });

    try {
      // Execute against the database
      const result = executeQuery(query);
      set({
        queryResult: result,
        isLoading: false
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Query execution failed';
      set({
        queryResult: {
          success: false,
          columns: [],
          rows: [],
          rowCount: 0,
          executionTime: 0,
          error: message
        },
        isLoading: false,
        error: message
      });
    }
  },

  /**
   * Start step-through visualization
   */
  startStepThrough: () => {
    const { query, queryPlan, stepThrough } = get();
    if (!query.trim()) {
      return;
    }

    // Ensure we have a plan
    let plan = queryPlan;
    if (!plan) {
      const parseResult = parseQuery(query);
      if (!parseResult.success) {
        set({ parseError: parseResult.error });
        return;
      }
      plan = createQueryPlan(parseResult.result?.ast);
      plan.originalQuery = query;
      set({ queryPlan: plan, parseError: null });
    }

    // Generate execution steps
    const steps = executeSteps(plan);
    const finalStep = steps[steps.length - 1];

    set({
      stepThrough: {
        steps,
        currentStepIndex: 0,
        isPlaying: false,
        playbackSpeed: stepThrough.playbackSpeed,
        finalResult: finalStep?.output || null
      }
    });
  },

  /**
   * Toggle playback on/off
   */
  togglePlayback: () => {
    const { stepThrough } = get();

    // If at the end and not playing, reset to beginning
    if (stepThrough.currentStepIndex >= stepThrough.steps.length - 1 && !stepThrough.isPlaying) {
      set({
        stepThrough: {
          ...stepThrough,
          currentStepIndex: 0,
          isPlaying: true
        }
      });
      return;
    }

    set({
      stepThrough: {
        ...stepThrough,
        isPlaying: !stepThrough.isPlaying
      }
    });
  },

  /**
   * Alias for prevStep
   */
  previousStep: () => {
    get().prevStep();
  },

  /**
   * Reset step-through state
   */
  resetStepThrough: () => {
    set({
      stepThrough: {
        steps: [],
        currentStepIndex: -1,
        isPlaying: false,
        playbackSpeed: 1000,
        finalResult: null
      }
    });
  },

  /**
   * Clear all errors
   */
  clearError: () => {
    set({ parseError: null, error: null });
  }
}));

// =============================================================================
// SELECTOR HOOKS
// =============================================================================

/**
 * Get the current execution step
 */
export function useCurrentStep(): ExecutionStep | null {
  const stepThrough = useQueryStore(state => state.stepThrough);

  if (stepThrough.currentStepIndex < 0 || stepThrough.currentStepIndex >= stepThrough.steps.length) {
    return null;
  }

  return stepThrough.steps[stepThrough.currentStepIndex] ?? null;
}

/**
 * Check if we're at the first step
 */
export function useIsFirstStep(): boolean {
  const stepThrough = useQueryStore(state => state.stepThrough);
  return stepThrough.currentStepIndex <= 0;
}

/**
 * Check if we're at the last step
 */
export function useIsLastStep(): boolean {
  const stepThrough = useQueryStore(state => state.stepThrough);
  return stepThrough.currentStepIndex >= stepThrough.steps.length - 1;
}

/**
 * Get total number of steps
 */
export function useTotalSteps(): number {
  return useQueryStore(state => state.stepThrough.steps.length);
}

/**
 * Check if there's a valid query plan
 */
export function useHasQueryPlan(): boolean {
  return useQueryStore(state => state.queryPlan !== null);
}

/**
 * Check if there's a parse error
 */
export function useHasParseError(): boolean {
  return useQueryStore(state => state.parseError !== null);
}
