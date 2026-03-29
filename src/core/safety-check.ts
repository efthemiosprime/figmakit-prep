import type { SafetyAssessment } from '../shared/types';
import { BACKGROUND_SHAPE_THRESHOLD } from '../shared/constants';

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

function hasPadding(node: any): boolean {
  return (
    (node.paddingTop ?? 0) > 0 ||
    (node.paddingRight ?? 0) > 0 ||
    (node.paddingBottom ?? 0) > 0 ||
    (node.paddingLeft ?? 0) > 0
  );
}

function getChildCount(node: any): number {
  return Array.isArray(node.children) ? node.children.length : 0;
}

/**
 * Determine if a node can be safely removed without visual impact.
 * Mirrors fk_should_skip_layer_data() from helpers.php.
 */
export function canRemove(node: any): SafetyAssessment {
  // Hidden node
  if (node.visible === false) {
    return { safe: true, reason: 'hidden' };
  }

  // Zero opacity
  if (node.opacity === 0) {
    return { safe: true, reason: 'zero-opacity' };
  }

  // Redundant mask (parent already clips with corner radius)
  if (node.isMask === true) {
    const parent = node.parent;
    if (parent && parent.clipsContent === true && (parent.cornerRadius ?? 0) > 0) {
      return { safe: true, reason: 'redundant-mask' };
    }
  }

  // Non-normal blend mode
  const blendMode = node.blendMode ?? 'PASS_THROUGH';
  if (blendMode !== 'PASS_THROUGH' && blendMode !== 'NORMAL') {
    return { safe: false, reason: 'has-blend-mode' };
  }

  // TEXT nodes always have visual contribution
  if (node.type === 'TEXT') {
    return { safe: false, reason: 'has-visual-contribution' };
  }

  // Check visual properties
  const hasFill = hasAnyVisibleFill(node);
  const hasStroke = hasAnyVisibleStroke(node);
  const hasEffects = hasAnyVisibleEffect(node);

  if (hasFill) {
    return { safe: false, reason: 'has-fill' };
  }

  if (hasStroke) {
    return { safe: false, reason: 'has-stroke' };
  }

  if (hasEffects) {
    return { safe: false, reason: 'has-effects' };
  }

  // Semi-transparent (has children or content that's blended)
  const opacity = node.opacity ?? 1;
  if (opacity > 0 && opacity < 1 && getChildCount(node) > 0) {
    return { safe: false, reason: 'has-visual-contribution' };
  }

  // Empty container with no visual contribution
  if (getChildCount(node) === 0) {
    return { safe: true, reason: 'empty-container' };
  }

  return { safe: false, reason: 'has-visual-contribution' };
}

/**
 * Determine if a container node can be safely flattened (unwrapped).
 * Flattening moves the single child to the parent and removes the wrapper.
 */
export function canFlatten(node: any): SafetyAssessment {
  const childCount = getChildCount(node);

  if (childCount === 0) {
    return { safe: false, reason: 'no-children' };
  }

  if (childCount > 1) {
    return { safe: false, reason: 'multiple-children' };
  }

  // Single child — check if wrapper has any visual properties
  if (hasAnyVisibleFill(node)) {
    return { safe: false, reason: 'has-fill' };
  }

  if (hasAnyVisibleStroke(node)) {
    return { safe: false, reason: 'has-stroke' };
  }

  if (hasAnyVisibleEffect(node)) {
    return { safe: false, reason: 'has-effects' };
  }

  if ((node.cornerRadius ?? 0) > 0) {
    return { safe: false, reason: 'has-corner-radius' };
  }

  const layoutMode = node.layoutMode ?? 'NONE';
  if (layoutMode !== 'NONE') {
    return { safe: false, reason: 'has-auto-layout' };
  }

  if (hasPadding(node)) {
    return { safe: false, reason: 'has-padding' };
  }

  return { safe: true, reason: 'passthrough-wrapper' };
}

/**
 * Check if a single-child container is a redundant nesting wrapper.
 * More aggressive than canFlatten — allows auto-layout and padding IF:
 * - Single child that is also a container type
 * - No fill, no stroke, no effects, no corner radius
 * This catches patterns like: Footer > Container > Container > [content]
 */
export function isRedundantNesting(node: any): SafetyAssessment {
  var childCount = getChildCount(node);
  if (childCount !== 1) {
    return { safe: false, reason: 'not-single-child' };
  }

  // Must be a container type
  var type = node.type || '';
  var containerTypes = ['FRAME', 'GROUP', 'COMPONENT', 'INSTANCE', 'SECTION'];
  if (containerTypes.indexOf(type) < 0) {
    return { safe: false, reason: 'not-container' };
  }

  // Child must also be a container type with children
  var child = node.children[0];
  var childType = child.type || '';
  if (containerTypes.indexOf(childType) < 0) {
    return { safe: false, reason: 'child-not-container' };
  }

  // No visual contribution allowed
  if (hasAnyVisibleFill(node)) {
    return { safe: false, reason: 'has-fill' };
  }
  if (hasAnyVisibleStroke(node)) {
    return { safe: false, reason: 'has-stroke' };
  }
  if (hasAnyVisibleEffect(node)) {
    return { safe: false, reason: 'has-effects' };
  }
  if ((node.cornerRadius || 0) > 0) {
    return { safe: false, reason: 'has-corner-radius' };
  }

  return { safe: true, reason: 'redundant-nesting' };
}

/**
 * Check if a node is a background decoration shape covering >= 90% of its parent.
 * Only RECTANGLE and ELLIPSE are considered background shapes.
 */
export function isBackgroundShape(node: any, parent: any): boolean {
  const type: string = node.type ?? '';

  // Only rectangles and ellipses can be background shapes
  if (type !== 'RECTANGLE' && type !== 'ELLIPSE') {
    return false;
  }

  const parentWidth: number = parent.width ?? 0;
  const parentHeight: number = parent.height ?? 0;

  if (parentWidth === 0 || parentHeight === 0) {
    return false;
  }

  const nodeWidth: number = node.width ?? 0;
  const nodeHeight: number = node.height ?? 0;

  const widthRatio = nodeWidth / parentWidth;
  const heightRatio = nodeHeight / parentHeight;

  return widthRatio >= BACKGROUND_SHAPE_THRESHOLD && heightRatio >= BACKGROUND_SHAPE_THRESHOLD;
}
