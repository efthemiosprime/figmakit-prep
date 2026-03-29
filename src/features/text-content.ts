import type { AnalysisResult, NodeRole } from '../shared/types';
import { safeGetString, safeGetNumber } from '../shared/figma-helpers';
import { HEADING_THRESHOLDS } from '../shared/constants';

export interface TextContentItem {
  nodeId: string;
  nodeName: string;
  role: NodeRole;
  contentType: 'text' | 'heading' | 'button_text';
  content: string;
  headingLevel: number;
  truncated: boolean;
}

function getHeadingLevel(fontSize: number): number {
  for (var i = 0; i < HEADING_THRESHOLDS.length; i++) {
    if (fontSize >= HEADING_THRESHOLDS[i].minSize) return HEADING_THRESHOLDS[i].level;
  }
  return 6;
}

/**
 * Extract text content from all text/heading/button nodes in the tree.
 * Reads node.characters safely for preview.
 */
export function extractTextContent(results: AnalysisResult[]): TextContentItem[] {
  var items: TextContentItem[] = [];

  function walk(nodes: AnalysisResult[]) {
    for (var i = 0; i < nodes.length; i++) {
      var result = nodes[i];
      var type = result.type;
      var role = result.role;

      // TEXT nodes — extract characters
      if (type === 'TEXT') {
        var chars = safeGetString(result.node, 'characters', '');
        if (chars === '' || typeof chars !== 'string') {
          chars = '[mixed content]';
        }

        var truncated = false;
        if (chars.length > 100) {
          chars = chars.substring(0, 100) + '...';
          truncated = true;
        }

        if (role === 'heading') {
          var fontSize = result.tokens.typography ? result.tokens.typography.fontSize : 16;
          items.push({
            nodeId: result.id,
            nodeName: result.name,
            role: role,
            contentType: 'heading',
            content: chars,
            headingLevel: getHeadingLevel(fontSize),
            truncated: truncated,
          });
        } else {
          items.push({
            nodeId: result.id,
            nodeName: result.name,
            role: role,
            contentType: 'text',
            content: chars,
            headingLevel: 0,
            truncated: truncated,
          });
        }
      }

      // Button nodes — find TEXT child for button_text
      if (role === 'button' && type !== 'TEXT') {
        var buttonText = findButtonText(result);
        if (buttonText) {
          items.push({
            nodeId: result.id,
            nodeName: result.name,
            role: role,
            contentType: 'button_text',
            content: buttonText,
            headingLevel: 0,
            truncated: false,
          });
        }
      }

      // Recurse
      if (result.children.length > 0) {
        walk(result.children);
      }
    }
  }

  walk(results);
  return items;
}

function findButtonText(result: AnalysisResult): string {
  // Search children for TEXT node
  for (var i = 0; i < result.children.length; i++) {
    var child = result.children[i];
    if (child.type === 'TEXT') {
      var chars = safeGetString(child.node, 'characters', '');
      if (typeof chars === 'string' && chars.length > 0) return chars;
    }
    // Recurse into wrappers
    if (child.children.length > 0) {
      var found = findButtonText(child);
      if (found) return found;
    }
  }
  return '';
}
