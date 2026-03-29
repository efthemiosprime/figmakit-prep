import type { AnalysisResult, Classification, DesignTokens, Fingerprint } from '../shared/types';
import { AUTO_NAME_PATTERN, SEMANTIC_NAMES } from '../shared/constants';
import { matchNamePattern } from '../shared/patterns';
import { classifyNode } from './classifier';
import { fingerprintChildren, matchFingerprint } from './fingerprinter';
import { canRemove, canFlatten } from './safety-check';

// --- Helpers ---

function hasAnyVisibleFill(node: any): boolean {
  const fills = node.fills;
  if (!Array.isArray(fills)) return false;
  return fills.some((f: any) => f.visible !== false);
}

function hasAnyVisibleStroke(node: any): boolean {
  const strokes = node.strokes;
  if (!Array.isArray(strokes)) return false;
  return strokes.some((s: any) => s.visible !== false);
}

function hasAnyVisibleEffect(node: any): boolean {
  const effects = node.effects;
  if (!Array.isArray(effects)) return false;
  return effects.some((e: any) => e.visible !== false);
}

function hasImageFill(node: any): boolean {
  const fills = node.fills;
  if (!Array.isArray(fills)) return false;
  return fills.some((f: any) => f.type === 'IMAGE' && f.visible !== false);
}

function getChildCount(node: any): number {
  return Array.isArray(node.children) ? node.children.length : 0;
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
  const colors: Array<{ name: string; value: string }> = [];
  const fills = node.fills;
  if (Array.isArray(fills)) {
    fills.forEach((fill: any, i: number) => {
      if (fill.visible === false) return;
      if (fill.type === 'SOLID' && fill.color) {
        const hex = rgbToHex(fill.color.r, fill.color.g, fill.color.b);
        const opacity = fill.opacity ?? 1;
        if (opacity < 1) {
          colors.push({ name: `fill_${i}`, value: `rgba(${Math.round(fill.color.r * 255)}, ${Math.round(fill.color.g * 255)}, ${Math.round(fill.color.b * 255)}, ${opacity})` });
        } else {
          colors.push({ name: `fill_${i}`, value: hex });
        }
      }
    });
  }
  const strokes = node.strokes;
  if (Array.isArray(strokes)) {
    strokes.forEach((stroke: any, i: number) => {
      if (stroke.visible === false) return;
      if (stroke.type === 'SOLID' && stroke.color) {
        const hex = rgbToHex(stroke.color.r, stroke.color.g, stroke.color.b);
        colors.push({ name: `stroke_${i}`, value: hex });
      }
    });
  }
  return colors;
}

function extractTypography(node: any): DesignTokens['typography'] {
  if (node.type !== 'TEXT') return null;
  return {
    fontFamily: node.fontName?.family ?? 'Unknown',
    fontSize: node.fontSize ?? 16,
    fontWeight: node.fontWeight ?? 400,
    lineHeight: node.lineHeight?.value,
    letterSpacing: node.letterSpacing?.value,
    textCase: node.textCase,
  };
}

function extractSpacing(node: any): DesignTokens['spacing'] {
  const top = node.paddingTop ?? 0;
  const right = node.paddingRight ?? 0;
  const bottom = node.paddingBottom ?? 0;
  const left = node.paddingLeft ?? 0;
  const gap = node.itemSpacing ?? 0;
  if (top === 0 && right === 0 && bottom === 0 && left === 0 && gap === 0) return null;
  return { top, right, bottom, left, gap };
}

function extractEffects(node: any): Array<{ type: string; value: string }> {
  const effects: Array<{ type: string; value: string }> = [];
  if (!Array.isArray(node.effects)) return effects;
  for (const effect of node.effects) {
    if (effect.visible === false) continue;
    if (effect.type === 'DROP_SHADOW') {
      const { offset, radius, color, spread } = effect;
      const x = offset?.x ?? 0;
      const y = offset?.y ?? 0;
      const r = radius ?? 0;
      const s = spread ?? 0;
      const c = color
        ? `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${color.a ?? 1})`
        : 'rgba(0,0,0,0.25)';
      effects.push({ type: 'box-shadow', value: `${x}px ${y}px ${r}px ${s}px ${c}` });
    }
  }
  return effects;
}

function extractTokens(node: any): DesignTokens {
  return {
    colors: extractColors(node),
    typography: extractTypography(node),
    spacing: extractSpacing(node),
    borderRadius: (node.cornerRadius ?? 0) > 0 ? node.cornerRadius : null,
    effects: extractEffects(node),
  };
}

// --- Main Analysis ---

/**
 * Analyze a single node: classify, fingerprint, check safety, extract tokens.
 * Combines all core modules and resolves priority between detection methods.
 */
export function analyzeNode(node: any, depth: number = 0): AnalysisResult {
  const name: string = node.name ?? '';
  const children = Array.isArray(node.children) ? node.children : [];

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
      fingerprint.parentWidth = node.width ?? 0;
      fingerprint.parentHeight = node.height ?? 0;
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

  // 5. Safety assessment
  const removeAssessment = canRemove(node);
  const flattenAssessment = canFlatten(node);

  // 6. Suggested name (only for auto-generated names)
  let suggestedName: string | null = null;
  if (isAutoNamed(name) && best.role !== 'unknown' && best.role !== 'container') {
    suggestedName = best.role;
  } else if (isSemanticName(name)) {
    suggestedName = null;
  }

  // 7. Recurse into children
  const analyzedChildren = children.map((child: any) => analyzeNode(child, depth + 1));

  // 8. Build result
  const layoutMode = node.layoutMode ?? 'NONE';

  return {
    node,
    id: node.id ?? '',
    name,
    type: node.type ?? '',
    depth,

    role: best.role,
    confidence: best.confidence,
    source: best.source,

    suggestedName,
    suggestedBEM: null,
    fkLabel: null,

    canRemove: removeAssessment.safe,
    canFlatten: flattenAssessment.safe,
    removeReason: removeAssessment.safe ? removeAssessment.reason : null,
    preserveReason: removeAssessment.safe ? null : removeAssessment.reason,

    hasVisualContribution: !removeAssessment.safe,
    isVisible: node.visible !== false,
    opacity: node.opacity ?? 1,
    hasFill: hasAnyVisibleFill(node),
    hasStroke: hasAnyVisibleStroke(node),
    hasEffects: hasAnyVisibleEffect(node),
    hasAutoLayout: layoutMode !== 'NONE',
    layoutMode: layoutMode as 'NONE' | 'HORIZONTAL' | 'VERTICAL',
    childCount: children.length,
    isMask: node.isMask === true,
    clipsContent: node.clipsContent === true,
    cornerRadius: node.cornerRadius ?? 0,

    tokens: extractTokens(node),
    fingerprint,
    children: analyzedChildren,
  };
}

/**
 * Analyze a selection of nodes (top-level, each at depth 0).
 */
export function analyzeSelection(nodes: readonly any[]): AnalysisResult[] {
  return nodes.map((node) => analyzeNode(node, 0));
}
