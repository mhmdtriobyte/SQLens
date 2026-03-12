/**
 * SQLens Engine
 *
 * Re-exports all engine modules for convenient importing.
 */

// Database operations
export {
  initDatabase,
  isDatabaseReady,
  executeQuery,
  executeStatements,
  getSchema,
  getTableNames,
  getTableInfo,
  getRowCount,
  getSampleRows,
  createTable,
  dropTable,
  resetDatabase,
  loadPreset,
  exportAsSql,
  importFromSql,
  importCsv,
  closeDatabase
} from './database';

// SQL parsing
export {
  parseQuery,
  parseQuerySync,
  parseQueryAsync,
  ensureParserInitialized,
  validateQuery,
  getQueryType,
  extractTableNames,
  extractTables,
  extractColumns,
  extractAliases,
  isSelectQuery,
  getParserInstance,
  astToSql
} from './parser';
export type { ParseResult, ParseResultType, ParsedQuery, QueryType } from './parser';

// Query planning
export {
  createQueryPlan,
  resetNodeIdCounter,
  getExecutionOrder,
  getExecutionOrderIds,
  getNodeById,
  getAllNodes,
  getPreOrder,
  getNodesAtLevel,
  getTreeDepth,
  countNodes,
  layoutPlanTree,
  getTreeBounds,
  describeNode,
  describePlan,
  getPlanSummary
} from './planner';

// Step-through execution
export {
  executeSteps,
  getExecutionOrder as getStepperExecutionOrder,
  evaluateCondition,
  evaluateJoinCondition
} from './stepper';

// Explainer for plain English explanations
export {
  generateExplanation,
  generateExecutionSummary,
  getOperationSymbol,
  getOperationDescription
} from './explainer';
