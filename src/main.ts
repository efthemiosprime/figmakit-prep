import { analyzeNode, analyzeSelection } from './core/analyzer';
import { scanForCleaning, applyClean } from './features/cleaner';
import { scanForRenaming, applyRenames } from './features/renamer';
import { generateReport } from './features/validator';
import { applyLabel, batchLabel } from './features/labeler';
import { generateBEMNames, applyBEMNames } from './features/bem-formatter';
import { extractTokens, formatTokens } from './features/token-preview';
import type { CleanActionItem, RenameAction } from './shared/types';

/**
 * Get the nodes to analyze: selection if available, otherwise all page children.
 */
function getTargetNodes(): readonly any[] {
  const selection = figma.currentPage.selection;
  if (selection.length > 0) return selection;
  return figma.currentPage.children;
}

/**
 * Handle a message from the UI.
 */
export async function handleMessage(msg: any): Promise<void> {
  try {
    var type = msg.type;

    if (type === 'scan') {
      handleScan(msg);
    } else if (type === 'apply') {
      await handleApply(msg);
    } else {
      figma.ui.postMessage({ type: 'error', message: 'Unknown message type: ' + type });
    }
  } catch (err: any) {
    figma.ui.postMessage({ type: 'error', message: err.message || 'Unknown error' });
  }
}

function handleScan(msg: any): void {
  const { feature } = msg;
  const nodes = getTargetNodes();
  const results = analyzeSelection(nodes);

  switch (feature) {
    case 'cleaner': {
      const scan = scanForCleaning(results);
      var cleanTree = results.map(function serializeCleanTree(r: any): any {
        return {
          id: r.id,
          name: r.name,
          role: r.role,
          canRemove: r.canRemove,
          canFlatten: r.canFlatten,
          removeReason: r.removeReason,
          children: r.children.map(serializeCleanTree),
        };
      });
      figma.ui.postMessage({
        type: 'scan-result',
        feature: 'cleaner',
        data: {
          removable: serializeResults(scan.removable),
          flattenable: serializeResults(scan.flattenable),
          safe: serializeResults(scan.safe),
          tree: cleanTree,
        },
      });
      break;
    }

    case 'renamer': {
      const actions = scanForRenaming(results);
      // Build lookup of rename suggestions by node ID
      var renameMap: Record<string, string> = {};
      for (var ai = 0; ai < actions.length; ai++) {
        renameMap[actions[ai].nodeId] = actions[ai].suggestedName;
      }
      // Send tree structure with parent-context-aware rename suggestions
      const tree = results.map(function serializeTree(r: any): any {
        return {
          id: r.id,
          name: r.name,
          role: r.role,
          confidence: r.confidence,
          suggestedName: renameMap[r.id] || null,
          canFlatten: r.canFlatten,
          canRemove: r.canRemove,
          depth: r.depth,
          children: r.children.map(serializeTree),
        };
      });
      figma.ui.postMessage({
        type: 'scan-result',
        feature: 'renamer',
        data: {
          actions: actions.map(function(a: any) {
            return {
              nodeId: a.nodeId,
              currentName: a.currentName,
              suggestedName: a.suggestedName,
              confidence: a.confidence,
              source: a.source,
              node: a.node,
            };
          }),
          tree: tree,
        },
      });
      break;
    }

    case 'validator': {
      const report = generateReport(results);
      figma.ui.postMessage({
        type: 'scan-result',
        feature: 'validator',
        data: report,
      });
      break;
    }

    case 'tokens': {
      // Extract tokens from first selected node (or first result)
      const result = results[0];
      if (!result) {
        figma.ui.postMessage({
          type: 'scan-result',
          feature: 'tokens',
          data: { tokens: null, formatted: {} },
        });
        break;
      }
      const tokens = extractTokens(result);
      figma.ui.postMessage({
        type: 'scan-result',
        feature: 'tokens',
        data: {
          tokens,
          formatted: {
            css: formatTokens(tokens, 'css'),
            scss: formatTokens(tokens, 'scss'),
            utility: formatTokens(tokens, 'utility'),
            gutenberg: formatTokens(tokens, 'gutenberg'),
          },
        },
      });
      break;
    }

    case 'bem': {
      const result = results[0];
      if (!result) {
        figma.ui.postMessage({ type: 'scan-result', feature: 'bem', data: [] });
        break;
      }
      const mappings = generateBEMNames(result);
      figma.ui.postMessage({
        type: 'scan-result',
        feature: 'bem',
        data: mappings.map(m => ({
          nodeId: m.nodeId,
          currentName: m.currentName,
          bemName: m.bemName,
          node: m.node,
        })),
      });
      break;
    }

    default:
      figma.ui.postMessage({ type: 'error', message: `Unknown feature: ${feature}` });
  }
}

async function handleApply(msg: any): Promise<void> {
  var feature = msg.feature;

  switch (feature) {
    case 'cleaner': {
      var removed = 0;
      var flattened = 0;
      var actions = msg.actions || [];
      for (var ci = 0; ci < actions.length; ci++) {
        var action = actions[ci];
        var node = await figma.getNodeByIdAsync(action.nodeId);
        if (!node) continue;
        if (action.action === 'remove') {
          node.remove();
          removed++;
        } else if (action.action === 'flatten') {
          var parent = node.parent;
          if (parent && 'children' in node && (node as any).children.length === 1) {
            var child = (node as any).children[0];
            var idx = parent.children.indexOf(node);
            child.x = (child.x || 0) + ((node as any).x || 0);
            child.y = (child.y || 0) + ((node as any).y || 0);
            parent.insertChild(idx, child);
            node.remove();
            flattened++;
          }
        }
      }
      figma.ui.postMessage({ type: 'apply-result', feature: 'cleaner', data: { removed: removed, flattened: flattened } });
      break;
    }

    case 'renamer': {
      var renameCount = 0;
      var renameActions = msg.actions || [];
      for (var ri = 0; ri < renameActions.length; ri++) {
        var rAction = renameActions[ri];
        var rNode = await figma.getNodeByIdAsync(rAction.nodeId);
        if (rNode) {
          rNode.name = rAction.suggestedName;
          renameCount++;
        }
      }
      figma.ui.postMessage({ type: 'apply-result', feature: 'renamer', data: renameCount });
      break;
    }

    case 'labeler': {
      if (msg.role && msg.mode) {
        // Single node label
        const nodes = getTargetNodes();
        if (nodes.length > 0) {
          applyLabel(nodes[0], msg.role, msg.mode);
        }
        figma.ui.postMessage({ type: 'apply-result', feature: 'labeler', data: 'ok' });
      } else if (msg.batchMode) {
        // Batch label
        const results = analyzeSelection(getTargetNodes());
        const count = batchLabel(results, msg.mode ?? 'prefix');
        figma.ui.postMessage({ type: 'apply-result', feature: 'labeler', data: count });
      }
      break;
    }

    case 'bem': {
      const nodes = getTargetNodes();
      const results = analyzeSelection(nodes);
      if (results.length > 0) {
        const count = applyBEMNames(results[0], msg.includeModifiers ?? false);
        figma.ui.postMessage({ type: 'apply-result', feature: 'bem', data: count });
      } else {
        figma.ui.postMessage({ type: 'apply-result', feature: 'bem', data: 0 });
      }
      break;
    }

    default:
      figma.ui.postMessage({ type: 'error', message: `Unknown feature: ${feature}` });
  }
}

/**
 * Serialize analysis results for posting to UI (strip node references for large trees).
 */
function serializeResults(results: any[]): any[] {
  return results.map(r => ({
    id: r.id,
    name: r.name,
    role: r.role,
    confidence: r.confidence,
    canRemove: r.canRemove,
    canFlatten: r.canFlatten,
    removeReason: r.removeReason,
    node: r.node,
  }));
}

/**
 * Set up the message handler for the plugin.
 */
export function setupMessageHandler(): void {
  figma.ui.onmessage = handleMessage;
}

// --- Plugin initialization ---
// Guard: only run in Figma sandbox (not in test environment)
if (typeof figma !== 'undefined' && typeof __html__ !== 'undefined') {
  figma.showUI(__html__, { width: 480, height: 600 });
  setupMessageHandler();
}
