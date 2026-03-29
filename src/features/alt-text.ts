import type { AnalysisResult } from '../shared/types';
import { safeGetString } from '../shared/figma-helpers';

export interface AltTextSuggestion {
  nodeId: string;
  assetName: string;
  suggestedAlt: string;
  source: 'sibling-text' | 'parent-context' | 'layer-name' | 'icon-name';
}

/**
 * Clean a layer name into human-readable alt text.
 * "hero-image" → "Hero image", "DSE_Icons_Brain" → "Brain icon"
 */
function cleanNameToAlt(name: string): string {
  // Remove common prefixes
  var cleaned = name
    .replace(/^(DSE_Icons_|icon[._]|img[._]|image[._])/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase split
    .trim();
  if (cleaned.length === 0) return '';
  // Capitalize first letter
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
}

/**
 * Find sibling text content for an image node.
 * Looks for TEXT siblings in the same parent.
 */
function findSiblingText(result: AnalysisResult, allResults: AnalysisResult[]): string {
  // Walk all results to find siblings of this node's parent
  function findParentChildren(nodes: AnalysisResult[]): AnalysisResult[] | null {
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      for (var j = 0; j < node.children.length; j++) {
        if (node.children[j].id === result.id) {
          return node.children;
        }
      }
      var found = findParentChildren(node.children);
      if (found) return found;
    }
    return null;
  }

  var siblings = findParentChildren(allResults);
  if (!siblings) return '';

  // Look for a heading sibling first, then any text
  for (var i = 0; i < siblings.length; i++) {
    if (siblings[i].id === result.id) continue;
    if (siblings[i].role === 'heading' && siblings[i].type === 'TEXT') {
      var headingText = safeGetString(siblings[i].node, 'characters', '');
      if (typeof headingText === 'string' && headingText.length > 0 && headingText.length < 100) {
        return headingText;
      }
    }
  }
  for (var j = 0; j < siblings.length; j++) {
    if (siblings[j].id === result.id) continue;
    if (siblings[j].role === 'text' && siblings[j].type === 'TEXT') {
      var bodyText = safeGetString(siblings[j].node, 'characters', '');
      if (typeof bodyText === 'string' && bodyText.length > 0 && bodyText.length < 80) {
        return bodyText;
      }
    }
  }
  return '';
}

/**
 * Generate alt text suggestions for exportable image assets.
 */
export function suggestAltText(results: AnalysisResult[]): AltTextSuggestion[] {
  var suggestions: AltTextSuggestion[] = [];

  function walk(nodes: AnalysisResult[], parentName: string) {
    for (var i = 0; i < nodes.length; i++) {
      var result = nodes[i];
      var role = result.role;

      if (role === 'image' || role === 'icon') {
        // Try sibling text first (most descriptive)
        var siblingText = findSiblingText(result, results);
        if (siblingText) {
          suggestions.push({
            nodeId: result.id,
            assetName: result.name,
            suggestedAlt: siblingText,
            source: 'sibling-text',
          });
        } else if (parentName && parentName.length < 50) {
          // Parent context
          var parentAlt = cleanNameToAlt(parentName);
          if (role === 'icon') parentAlt += ' icon';
          else parentAlt += ' image';
          suggestions.push({
            nodeId: result.id,
            assetName: result.name,
            suggestedAlt: parentAlt,
            source: 'parent-context',
          });
        } else {
          // Layer name fallback
          var nameAlt = cleanNameToAlt(result.name);
          if (role === 'icon' && nameAlt.toLowerCase().indexOf('icon') < 0) {
            nameAlt += ' icon';
          }
          suggestions.push({
            nodeId: result.id,
            assetName: result.name,
            suggestedAlt: nameAlt || (role === 'icon' ? 'Icon' : 'Image'),
            source: role === 'icon' ? 'icon-name' : 'layer-name',
          });
        }
      }

      if (result.children.length > 0) {
        var ctx = /^(Frame|Group|Rectangle|Vector)\s*\d*$/i.test(result.name) ? parentName : result.name;
        walk(result.children, ctx);
      }
    }
  }

  walk(results, '');
  return suggestions;
}
