import type { AnalysisResult, NodeRole } from '../shared/types';

export type LabelMode = 'prefix' | 'pluginData' | 'both';

const FK_LABEL_PATTERN = /^\[fk:\w+\]\s*/;

const LABELABLE_ROLES: Set<NodeRole> = new Set([
  'text', 'heading', 'image', 'icon', 'button', 'buttons',
  'divider', 'spacer',
  'section', 'row', 'column', 'group',
  'card', 'hero', 'feature', 'cta', 'testimonial',
  'accordion', 'tabs', 'modal', 'gallery',
  'isi', 'header',
  'list', 'list-item',
]);

/**
 * Format a role as an [fk:type] label string.
 * Returns null for roles that shouldn't be labeled.
 */
export function formatLabel(role: NodeRole): string | null {
  if (!LABELABLE_ROLES.has(role)) return null;
  return `[fk:${role}]`;
}

/**
 * Apply a label to a node via prefix, plugin data, or both.
 */
export function applyLabel(node: any, role: NodeRole, mode: LabelMode): void {
  if (mode === 'prefix' || mode === 'both') {
    // Remove existing label if present
    const baseName = (node.name as string).replace(FK_LABEL_PATTERN, '');
    node.name = `[fk:${role}] ${baseName}`;
  }

  if (mode === 'pluginData' || mode === 'both') {
    if (typeof node.setPluginData === 'function') {
      node.setPluginData('fk-type', role);
    }
  }
}

/**
 * Remove label from a node (both prefix and plugin data).
 */
export function removeLabel(node: any): void {
  node.name = (node.name as string).replace(FK_LABEL_PATTERN, '');
  if (typeof node.setPluginData === 'function') {
    node.setPluginData('fk-type', '');
  }
}

/**
 * Check if a node has an [fk:type] label prefix.
 */
export function hasLabel(node: any): boolean {
  return FK_LABEL_PATTERN.test(node.name as string);
}

/**
 * Apply labels to all nodes in results (recursively) based on their detected role.
 * Skips unknown/container roles.
 */
export function batchLabel(results: AnalysisResult[], mode: LabelMode): number {
  let count = 0;

  function processResults(items: AnalysisResult[]): void {
    for (const result of items) {
      const label = formatLabel(result.role);
      if (label) {
        applyLabel(result.node, result.role, mode);
        count++;
      }
      if (result.children.length > 0) {
        processResults(result.children);
      }
    }
  }

  processResults(results);
  return count;
}
