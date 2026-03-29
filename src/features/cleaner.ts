import type { AnalysisResult, CleanActionItem } from '../shared/types';

export interface CleanScanResult {
  removable: AnalysisResult[];
  flattenable: AnalysisResult[];
  safe: AnalysisResult[];
}

export interface CleanResult {
  removed: number;
  flattened: number;
}

/**
 * Collect all results into removable/flattenable/safe buckets (recursively).
 */
function collectResults(
  results: AnalysisResult[],
  removable: AnalysisResult[],
  flattenable: AnalysisResult[],
  safe: AnalysisResult[],
): void {
  for (const result of results) {
    if (result.canRemove) {
      removable.push(result);
    } else if (result.canFlatten) {
      flattenable.push(result);
    } else {
      safe.push(result);
    }

    // Recurse into children
    if (result.children.length > 0) {
      collectResults(result.children, removable, flattenable, safe);
    }
  }
}

/**
 * Scan analysis results and categorize nodes into removable, flattenable, and safe.
 */
export function scanForCleaning(results: AnalysisResult[]): CleanScanResult {
  const removable: AnalysisResult[] = [];
  const flattenable: AnalysisResult[] = [];
  const safe: AnalysisResult[] = [];

  collectResults(results, removable, flattenable, safe);

  return { removable, flattenable, safe };
}

/**
 * Flatten a wrapper node: move its single child to the wrapper's parent,
 * adjust child position, and remove the empty wrapper.
 */
export function flattenWrapper(wrapper: any): void {
  const parent = wrapper.parent;
  if (!parent) return;

  const children = wrapper.children;
  if (!Array.isArray(children) || children.length === 0) return;

  const child = children[0];
  const wrapperIndex = parent.children.indexOf(wrapper);

  // Offset child position by wrapper's position
  child.x = (child.x ?? 0) + (wrapper.x ?? 0);
  child.y = (child.y ?? 0) + (wrapper.y ?? 0);

  // Insert child at wrapper's position in parent
  parent.insertChild(wrapperIndex, child);

  // Remove the now-empty wrapper
  wrapper.remove();
}

/**
 * Apply clean actions: remove or flatten nodes.
 */
export function applyClean(actions: CleanActionItem[]): CleanResult {
  let removed = 0;
  let flattened = 0;

  for (const action of actions) {
    if (action.action === 'remove') {
      action.node.remove();
      removed++;
    } else if (action.action === 'flatten') {
      flattenWrapper(action.node);
      flattened++;
    }
  }

  return { removed, flattened };
}
