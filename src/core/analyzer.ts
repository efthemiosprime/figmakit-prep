import type { AnalysisResult, Classification, DesignTokens, Fingerprint } from '../shared/types';
import { AUTO_NAME_PATTERN, SEMANTIC_NAMES } from '../shared/constants';
import { matchNamePattern } from '../shared/patterns';
import { classifyNode } from './classifier';
import { fingerprintChildren, matchFingerprint } from './fingerprinter';
import { canRemove, canFlatten, isRedundantNesting } from './safety-check';
import { safeGetFills, safeGetStrokes, safeGetEffects, safeGetChildren, safeGetNumber, safeGetString, safeGetBoolean } from '../shared/figma-helpers';

// --- Helpers ---

function hasAnyVisibleFill(node: any): boolean {
  var fills = safeGetFills(node);
  for (var i = 0; i < fills.length; i++) {
    if (fills[i].visible !== false) return true;
  }
  return false;
}

function hasAnyVisibleStroke(node: any): boolean {
  var strokes = safeGetStrokes(node);
  for (var i = 0; i < strokes.length; i++) {
    if (strokes[i].visible !== false) return true;
  }
  return false;
}

function hasAnyVisibleEffect(node: any): boolean {
  var effects = safeGetEffects(node);
  for (var i = 0; i < effects.length; i++) {
    if (effects[i].visible !== false) return true;
  }
  return false;
}

function hasImageFill(node: any): boolean {
  var fills = safeGetFills(node);
  for (var i = 0; i < fills.length; i++) {
    if (fills[i].type === 'IMAGE' && fills[i].visible !== false) return true;
  }
  return false;
}

function getChildCount(node: any): number {
  return safeGetChildren(node).length;
}

function isAutoNamed(name: string): boolean {
  return AUTO_NAME_PATTERN.test(name);
}

function isSemanticName(name: string): boolean {
  return SEMANTIC_NAMES.includes(name.toLowerCase());
}

// --- Token Extraction ---

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function extractColors(node: any): Array<{ name: string; value: string }> {
  var colors: Array<{ name: string; value: string }> = [];
  var fills = safeGetFills(node);
  for (var i = 0; i < fills.length; i++) {
    var fill = fills[i];
    if (fill.visible === false) continue;
    if (fill.type === 'SOLID' && fill.color) {
      var hex = rgbToHex(fill.color.r, fill.color.g, fill.color.b);
      var opacity = fill.opacity != null ? fill.opacity : 1;
      if (opacity < 1) {
        colors.push({ name: 'fill_' + i, value: 'rgba(' + Math.round(fill.color.r * 255) + ', ' + Math.round(fill.color.g * 255) + ', ' + Math.round(fill.color.b * 255) + ', ' + opacity + ')' });
      } else {
        colors.push({ name: 'fill_' + i, value: hex });
      }
    }
  }
  var strokes = safeGetStrokes(node);
  for (var si = 0; si < strokes.length; si++) {
    var stroke = strokes[si];
    if (stroke.visible === false) continue;
    if (stroke.type === 'SOLID' && stroke.color) {
      colors.push({ name: 'stroke_' + si, value: rgbToHex(stroke.color.r, stroke.color.g, stroke.color.b) });
    }
  }
  return colors;
}

function extractTypography(node: any): DesignTokens['typography'] {
  if (safeGetString(node, 'type', '') !== 'TEXT') return null;
  var fontName: any = null;
  try { fontName = node.fontName; } catch (e) { /* ignore */ }
  var lineHeight: any = null;
  try { lineHeight = node.lineHeight; } catch (e) { /* ignore */ }
  var letterSpacing: any = null;
  try { letterSpacing = node.letterSpacing; } catch (e) { /* ignore */ }
  return {
    fontFamily: (fontName && fontName.family) ? fontName.family : 'Unknown',
    fontSize: safeGetNumber(node, 'fontSize', 16),
    fontWeight: safeGetNumber(node, 'fontWeight', 400),
    lineHeight: lineHeight ? lineHeight.value : undefined,
    letterSpacing: letterSpacing ? letterSpacing.value : undefined,
    textCase: safeGetString(node, 'textCase', undefined as any),
  };
}

function extractSpacing(node: any): DesignTokens['spacing'] {
  var top = safeGetNumber(node, 'paddingTop', 0);
  var right = safeGetNumber(node, 'paddingRight', 0);
  var bottom = safeGetNumber(node, 'paddingBottom', 0);
  var left = safeGetNumber(node, 'paddingLeft', 0);
  var gap = safeGetNumber(node, 'itemSpacing', 0);
  if (top === 0 && right === 0 && bottom === 0 && left === 0 && gap === 0) return null;
  return { top: top, right: right, bottom: bottom, left: left, gap: gap };
}

function extractEffects(node: any): Array<{ type: string; value: string }> {
  var result: Array<{ type: string; value: string }> = [];
  var effects = safeGetEffects(node);
  for (var i = 0; i < effects.length; i++) {
    var effect = effects[i];
    if (effect.visible === false) continue;
    if (effect.type === 'DROP_SHADOW') {
      var offset = effect.offset || { x: 0, y: 0 };
      var x = offset.x || 0;
      var y = offset.y || 0;
      var r = effect.radius || 0;
      var s = effect.spread || 0;
      var color = effect.color;
      var c = color
        ? 'rgba(' + Math.round(color.r * 255) + ', ' + Math.round(color.g * 255) + ', ' + Math.round(color.b * 255) + ', ' + (color.a != null ? color.a : 1) + ')'
        : 'rgba(0,0,0,0.25)';
      result.push({ type: 'box-shadow', value: x + 'px ' + y + 'px ' + r + 'px ' + s + 'px ' + c });
    }
  }
  return result;
}

function extractTokens(node: any): DesignTokens {
  var cr = safeGetNumber(node, 'cornerRadius', 0);
  return {
    colors: extractColors(node),
    typography: extractTypography(node),
    spacing: extractSpacing(node),
    borderRadius: cr > 0 ? cr : null,
    effects: extractEffects(node),
  };
}

// --- Main Analysis ---

/**
 * Analyze a single node: classify, fingerprint, check safety, extract tokens.
 * Combines all core modules and resolves priority between detection methods.
 */
export function analyzeNode(node: any, depth: number = 0): AnalysisResult {
  var name: string = safeGetString(node, 'name', '');
  var children = safeGetChildren(node);

  // Wrap entire analysis in try/catch to identify problematic nodes
  try {
    return analyzeNodeInner(node, name, children, depth);
  } catch (e: any) {
    // Return a safe fallback result with error info
    var errName = name || safeGetString(node, 'id', 'unknown');
    throw new Error('Error analyzing node "' + errName + '": ' + (e.message || e));
  }
}

function analyzeNodeInner(node: any, name: string, children: any[], depth: number): AnalysisResult {

  // 1. Classify by node type/properties (confidence 85-90)
  const typeClassification = classifyNode(node);

  // 2. Check name patterns (confidence 60)
  let nameClassification: Classification | null = null;
  const nameRole = matchNamePattern(name);
  if (nameRole) {
    nameClassification = { role: nameRole, confidence: 60, source: 'name' };
  }

  // 3. Fingerprint children for structural detection (confidence 80)
  let fingerprint: Fingerprint | null = null;
  let structureClassification: Classification | null = null;
  if (children.length >= 2) {
    fingerprint = fingerprintChildren(children);
    if (fingerprint) {
      fingerprint.parentWidth = safeGetNumber(node, 'width', 0);
      fingerprint.parentHeight = safeGetNumber(node, 'height', 0);
      fingerprint.hasImageFill = hasImageFill(node);
      structureClassification = matchFingerprint(node, fingerprint);
    }
  }

  // 4. Resolve: pick highest confidence
  // Special rule: structural fingerprint overrides type-based classification
  // for container nodes with children (e.g., a frame with image fill + text children
  // is a hero, not just an image)
  let best = typeClassification;

  if (structureClassification) {
    if (structureClassification.confidence > best.confidence) {
      best = structureClassification;
    } else if (children.length >= 2) {
      // For containers with 2+ children, structural patterns are more meaningful
      // than simple type detection (image fill doesn't make it "just an image")
      best = structureClassification;
    }
  }

  if (nameClassification && nameClassification.confidence > best.confidence) {
    best = nameClassification;
  }

  // 5. Safety assessment — strict, only remove what's truly safe
  var removeAssessment = canRemove(node);
  // canRemove already checks: hidden, zero opacity, redundant mask, empty container
  // Do NOT override canRemove for decorative layers — let the base check decide
  // A "Background" rectangle with a fill is kept (canRemove returns false for has-fill)
  // Only truly empty/hidden nodes get removed
  const flattenAssessment = canFlatten(node);
  const redundantAssessment = isRedundantNesting(node);
  // Only flatten if safety checks pass — never bypass them
  // classifiedAsWrapper is only used if the node also passes redundant nesting checks
  // (single child, no fill, no stroke, no effects, no corner radius)
  const isFlattenable = flattenAssessment.safe || redundantAssessment.safe;

  // 6. Suggested name (only for auto-generated names)
  let suggestedName: string | null = null;
  if (isAutoNamed(name) && best.role !== 'unknown' && best.role !== 'container') {
    suggestedName = best.role;
  } else if (isSemanticName(name)) {
    suggestedName = null;
  }

  // 7. Recurse into children
  var analyzedChildren: AnalysisResult[] = [];
  for (var ci = 0; ci < children.length; ci++) {
    analyzedChildren.push(analyzeNode(children[ci], depth + 1));
  }

  // 8. Build result
  var layoutMode = safeGetString(node, 'layoutMode', 'NONE');

  return {
    node: node,
    id: safeGetString(node, 'id', ''),
    name: name,
    type: safeGetString(node, 'type', ''),
    depth: depth,

    role: best.role,
    confidence: best.confidence,
    source: best.source,

    suggestedName: suggestedName,
    suggestedBEM: null,
    fkLabel: null,

    canRemove: removeAssessment.safe,
    canFlatten: isFlattenable,
    removeReason: removeAssessment.safe ? removeAssessment.reason : null,
    preserveReason: removeAssessment.safe ? null : removeAssessment.reason,

    hasVisualContribution: !removeAssessment.safe,
    isVisible: safeGetBoolean(node, 'visible', true),
    opacity: safeGetNumber(node, 'opacity', 1),
    hasFill: hasAnyVisibleFill(node),
    hasStroke: hasAnyVisibleStroke(node),
    hasEffects: hasAnyVisibleEffect(node),
    hasAutoLayout: layoutMode !== 'NONE',
    layoutMode: layoutMode as 'NONE' | 'HORIZONTAL' | 'VERTICAL',
    childCount: children.length,
    isMask: safeGetBoolean(node, 'isMask', false),
    clipsContent: safeGetBoolean(node, 'clipsContent', false),
    cornerRadius: safeGetNumber(node, 'cornerRadius', 0),

    tokens: extractTokens(node),
    fingerprint,
    children: analyzedChildren,
  };
}

/**
 * Analyze a selection of nodes (top-level, each at depth 0).
 */
export function analyzeSelection(nodes: readonly any[]): AnalysisResult[] {
  var results: AnalysisResult[] = [];
  for (var i = 0; i < nodes.length; i++) {
    results.push(analyzeNode(nodes[i], 0));
  }
  return results;
}
