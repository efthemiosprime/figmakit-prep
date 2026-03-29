import type { AnalysisResult, NodeRole } from '../shared/types';

export interface StructureEntry {
  name: string;
  role: NodeRole;
  childCount: number;
  componentCount: number;
  hasText: boolean;
  hasImages: boolean;
  depth: number;
  layoutSuffix: string;
}

export interface StructureSummary {
  entries: StructureEntry[];
  totalSections: number;
  totalComponents: number;
  totalTextNodes: number;
  totalImages: number;
  maxDepth: number;
  layerCount: number;
}

function countNodeType(result: AnalysisResult, type: string): number {
  var count = 0;
  if (result.type === type) count++;
  for (var i = 0; i < result.children.length; i++) {
    count += countNodeType(result.children[i], type);
  }
  return count;
}

function countRole(result: AnalysisResult, role: NodeRole): number {
  var count = 0;
  if (result.role === role) count++;
  for (var i = 0; i < result.children.length; i++) {
    count += countRole(result.children[i], role);
  }
  return count;
}

function hasRoleInChildren(result: AnalysisResult, role: NodeRole): boolean {
  for (var i = 0; i < result.children.length; i++) {
    if (result.children[i].role === role) return true;
    if (hasRoleInChildren(result.children[i], role)) return true;
  }
  return false;
}

function countAllNodes(result: AnalysisResult): number {
  var count = 1;
  for (var i = 0; i < result.children.length; i++) {
    count += countAllNodes(result.children[i]);
  }
  return count;
}

function getMaxDepth(result: AnalysisResult, current: number): number {
  var max = current;
  for (var i = 0; i < result.children.length; i++) {
    var childDepth = getMaxDepth(result.children[i], current + 1);
    if (childDepth > max) max = childDepth;
  }
  return max;
}

function getLayoutSuffix(result: AnalysisResult): string {
  if (result.layoutMode === 'VERTICAL') return '_vstack';
  if (result.layoutMode === 'HORIZONTAL') return '_hstack';
  return '';
}

/**
 * Generate a page structure summary from analysis results.
 * Shows top-level sections with counts and composition.
 */
export function generateStructureSummary(results: AnalysisResult[]): StructureSummary {
  var entries: StructureEntry[] = [];
  var totalSections = 0;
  var totalComponents = 0;
  var totalTextNodes = 0;
  var totalImages = 0;
  var maxDepth = 0;
  var layerCount = 0;

  for (var i = 0; i < results.length; i++) {
    var result = results[i];
    layerCount += countAllNodes(result);
    var depth = getMaxDepth(result, 0);
    if (depth > maxDepth) maxDepth = depth;

    // Top-level entry
    var instanceCount = countNodeType(result, 'INSTANCE') + countNodeType(result, 'COMPONENT');
    var textCount = countRole(result, 'text') + countRole(result, 'heading');
    var imageCount = countRole(result, 'image') + countRole(result, 'icon');
    totalComponents += instanceCount;
    totalTextNodes += textCount;
    totalImages += imageCount;

    entries.push({
      name: result.name,
      role: result.role,
      childCount: result.children.length,
      componentCount: instanceCount,
      hasText: textCount > 0,
      hasImages: imageCount > 0,
      depth: 0,
      layoutSuffix: getLayoutSuffix(result),
    });

    // Depth-1 children (sections within the page)
    for (var j = 0; j < result.children.length; j++) {
      var child = result.children[j];
      var childInstances = countNodeType(child, 'INSTANCE') + countNodeType(child, 'COMPONENT');
      var childTexts = countRole(child, 'text') + countRole(child, 'heading');
      var childImages = countRole(child, 'image') + countRole(child, 'icon');

      var sectionRoles: NodeRole[] = ['section', 'container', 'hero', 'card', 'cta', 'accordion', 'tabs', 'modal', 'gallery', 'header', 'group', 'flex-row', 'flex-col', 'list', 'feature', 'testimonial'];
      if (sectionRoles.indexOf(child.role) >= 0) {
        totalSections++;
      }

      entries.push({
        name: child.name,
        role: child.role,
        childCount: child.children.length,
        componentCount: childInstances,
        hasText: childTexts > 0,
        hasImages: childImages > 0,
        depth: 1,
        layoutSuffix: getLayoutSuffix(child),
      });
    }
  }

  return {
    entries: entries,
    totalSections: totalSections,
    totalComponents: totalComponents,
    totalTextNodes: totalTextNodes,
    totalImages: totalImages,
    maxDepth: maxDepth,
    layerCount: layerCount,
  };
}
