import type { AnalysisResult, ValidationResult } from '../shared/types';
import { AUTO_NAME_PATTERN } from '../shared/constants';

export interface ValidationReport {
  high: ValidationResult[];
  needsReview: ValidationResult[];
  low: ValidationResult[];
  skipped: ValidationResult[];
}

export interface Suggestion {
  type: 'rename' | 'clean' | 'add-mapping';
  detail: string;
}

function getTier(confidence: number, canRemove: boolean): ValidationResult['tier'] {
  if (canRemove) return 'skipped';
  if (confidence >= 90) return 'high';
  if (confidence >= 50) return 'needsReview';
  return 'low';
}

function toValidationResult(result: AnalysisResult): ValidationResult {
  const tier = getTier(result.confidence, result.canRemove);
  return {
    nodeId: result.id,
    name: result.name,
    role: result.role,
    confidence: result.confidence,
    source: result.source,
    tier,
    suggestion: null,
  };
}

/**
 * Collect all results into the report (recursively).
 */
function collectIntoReport(results: AnalysisResult[], report: ValidationReport): void {
  for (const result of results) {
    const entry = toValidationResult(result);

    switch (entry.tier) {
      case 'high':
        report.high.push(entry);
        break;
      case 'needsReview':
        report.needsReview.push(entry);
        break;
      case 'low':
        report.low.push(entry);
        break;
      case 'skipped':
        report.skipped.push(entry);
        break;
    }

    if (result.children.length > 0) {
      collectIntoReport(result.children, report);
    }
  }
}

/**
 * Generate a confidence report from analysis results.
 * Categorizes nodes into high (>= 90), needsReview (50-89), low (< 50), skipped (removable).
 */
export function generateReport(results: AnalysisResult[]): ValidationReport {
  const report: ValidationReport = {
    high: [],
    needsReview: [],
    low: [],
    skipped: [],
  };

  collectIntoReport(results, report);

  return report;
}

/**
 * Suggest an action for a given analysis result.
 * Returns null if no action is needed (high confidence).
 */
export function suggestAction(result: AnalysisResult): Suggestion | null {
  // Removable nodes → suggest cleaning
  if (result.canRemove) {
    return {
      type: 'clean',
      detail: `Remove: ${result.removeReason}`,
    };
  }

  // High confidence → no action needed
  if (result.confidence >= 90) {
    return null;
  }

  // Already has a semantic name — no rename suggestion
  const isAutoNamed = AUTO_NAME_PATTERN.test(result.name);
  if (!isAutoNamed) {
    return null;
  }

  // Medium or low confidence with auto name → suggest rename
  if (result.role !== 'container' && result.role !== 'unknown') {
    return {
      type: 'rename',
      detail: `Rename to "${result.role}" for ${result.confidence}%+ confidence`,
    };
  }

  // Low confidence container → suggest adding a mapping
  return {
    type: 'add-mapping',
    detail: 'Add a Component Name Mapping in WordPress for 100% confidence',
  };
}
