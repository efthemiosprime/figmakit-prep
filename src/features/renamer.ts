import type { AnalysisResult, RenameAction, ConfidenceSource } from '../shared/types';
import { AUTO_NAME_PATTERN, SEMANTIC_NAMES, HEADING_THRESHOLDS } from '../shared/constants';

const ROLE_TO_NAME: Record<string, string> = {
  'text': 'text',
  'image': 'image',
  'icon': 'icon',
  'button': 'button',
  'divider': 'divider',
  'spacer': 'spacer',
  'wrapper': 'wrapper',
  'section': 'section',
  'row': 'row',
  'flex-row': 'row',
  'flex-col': 'vstack',
  'column': 'column',
  'group': 'group',
  'card': 'card',
  'hero': 'hero',
  'feature': 'feature',
  'cta': 'cta',
  'testimonial': 'testimonial',
  'accordion': 'accordion',
  'tabs': 'tabs',
  'modal': 'modal',
  'gallery': 'gallery',
  'isi': 'isi',
  'header': 'header',
  'buttons': 'buttons',
};

function isAutoNamed(name: string): boolean {
  return AUTO_NAME_PATTERN.test(name);
}

function isSemanticName(name: string): boolean {
  return SEMANTIC_NAMES.includes(name.toLowerCase());
}

function getHeadingLevel(fontSize: number): number {
  for (const { level, minSize } of HEADING_THRESHOLDS) {
    if (fontSize >= minSize) return level;
  }
  return 6;
}

/**
 * Generate a semantic name for an analyzed node.
 * Returns null if the node should not be renamed.
 */
export function generateName(result: AnalysisResult): string | null {
  const { name, role, type } = result;

  // Don't rename user-given or semantic names
  if (!isAutoNamed(name)) return null;
  if (isSemanticName(name)) return null;

  // Don't rename low-confidence defaults
  if (role === 'container' || role === 'unknown') return null;

  // Don't rename component definitions
  if (type === 'COMPONENT') return null;

  // Heading with level
  if (role === 'heading') {
    const fontSize = result.tokens.typography?.fontSize ?? 16;
    const level = getHeadingLevel(fontSize);
    return `h${level}`;
  }

  return ROLE_TO_NAME[role] ?? null;
}

/**
 * Collect renamable nodes from analysis results (recursively).
 */
function collectRenamable(
  results: AnalysisResult[],
  actions: RenameAction[],
  nameCount: Map<string, number>,
): void {
  for (const result of results) {
    const suggested = generateName(result);
    if (suggested) {
      // Handle duplicate names by appending index
      const count = (nameCount.get(suggested) ?? 0) + 1;
      nameCount.set(suggested, count);

      const finalName = count === 1 ? suggested : `${suggested}-${count}`;

      actions.push({
        nodeId: result.id,
        node: result.node,
        currentName: result.name,
        suggestedName: finalName,
        confidence: result.confidence,
        source: result.source,
      });
    }

    // Recurse into children
    if (result.children.length > 0) {
      collectRenamable(result.children, actions, nameCount);
    }
  }
}

/**
 * Scan analysis results for nodes that should be renamed.
 * Excludes user-named, semantic-named, and component definition nodes.
 */
export function scanForRenaming(results: AnalysisResult[]): RenameAction[] {
  const actions: RenameAction[] = [];
  const nameCount = new Map<string, number>();
  collectRenamable(results, actions, nameCount);
  return actions;
}

/**
 * Apply rename actions by setting node.name for each action.
 */
export function applyRenames(actions: RenameAction[]): number {
  for (const action of actions) {
    action.node.name = action.suggestedName;
  }
  return actions.length;
}
