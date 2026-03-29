import type { Classification, NodeRole } from '../shared/types';
import {
  ICON_MAX_SIZE,
  BUTTON_MAX_HEIGHT,
  BUTTON_MAX_WIDTH,
  BUTTON_MAX_CHILDREN,
  SECTION_MIN_WIDTH,
  DIVIDER_MAX_THICKNESS,
  DIVIDER_ASPECT_RATIO,
  HEADING_MIN_FONT_SIZE,
  HEADING_MIN_FONT_WEIGHT,
} from '../shared/constants';

/**
 * Check if a node has any visible fills of a given type.
 */
function hasVisibleFillOfType(node: any, type: string): boolean {
  const fills = node.fills;
  if (!Array.isArray(fills)) return false;
  return fills.some((f: any) => f.type === type && f.visible !== false);
}

/**
 * Check if a node has any visible fills (of any type).
 */
function hasAnyVisibleFill(node: any): boolean {
  const fills = node.fills;
  if (!Array.isArray(fills)) return false;
  return fills.some((f: any) => f.visible !== false);
}

/**
 * Check if a node has any visible strokes.
 */
function hasAnyVisibleStroke(node: any): boolean {
  const strokes = node.strokes;
  if (!Array.isArray(strokes)) return false;
  return strokes.some((s: any) => s.visible !== false);
}

/**
 * Check if a node has any visible effects.
 */
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

function isContainerType(type: string): boolean {
  return ['FRAME', 'GROUP', 'COMPONENT', 'INSTANCE', 'SECTION'].includes(type);
}

function isShapeType(type: string): boolean {
  return ['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'POLYGON', 'ELLIPSE'].includes(type);
}

function result(role: NodeRole, confidence: number, source: Classification['source']): Classification {
  return { role, confidence, source };
}

/**
 * Classify a Figma node based on its type, properties, and layout.
 * Mirrors classifyNode() from FigmaKit's code.js.
 *
 * Priority chain:
 * 1. TEXT → heading or text
 * 2. Image fill → image
 * 3. Small vector/shape → icon
 * 4. LINE → divider
 * 5. Thin rectangle → divider
 * 6. Button heuristic
 * 7. Spacer (empty, no fills)
 * 8. Wrapper (single child, no visual)
 * 9. Section (wide container)
 * 10. Flex-row / flex-col
 * 11. Default → container
 */
export function classifyNode(node: any): Classification {
  const type: string = node.type;
  const width: number = node.width ?? 0;
  const height: number = node.height ?? 0;
  const childCount = getChildCount(node);
  const layoutMode: string = node.layoutMode ?? 'NONE';

  // 1. TEXT nodes
  if (type === 'TEXT') {
    const fontSize: number = node.fontSize ?? 16;
    const fontWeight: number = node.fontWeight ?? 400;
    if (fontSize >= HEADING_MIN_FONT_SIZE || fontWeight >= HEADING_MIN_FONT_WEIGHT) {
      return result('heading', 90, 'type');
    }
    return result('text', 90, 'type');
  }

  // 2. Image fill detection (any node type)
  if (hasVisibleFillOfType(node, 'IMAGE')) {
    return result('image', 90, 'type');
  }

  // 3. Small vector/shape → icon
  if (isShapeType(type) && width <= ICON_MAX_SIZE && height <= ICON_MAX_SIZE) {
    return result('icon', 90, 'type');
  }

  // 4. LINE node → divider
  if (type === 'LINE') {
    return result('divider', 90, 'type');
  }

  // 5. Thin rectangle → divider
  if (type === 'RECTANGLE') {
    const isHorizontalDivider = height > 0 && height <= DIVIDER_MAX_THICKNESS && width / height >= DIVIDER_ASPECT_RATIO;
    const isVerticalDivider = width > 0 && width <= DIVIDER_MAX_THICKNESS && height / width >= DIVIDER_ASPECT_RATIO;
    if (isHorizontalDivider || isVerticalDivider) {
      return result('divider', 90, 'type');
    }
  }

  // For container-like nodes only (FRAME, GROUP, COMPONENT, INSTANCE, SECTION)
  if (isContainerType(type)) {
    const hasFill = hasAnyVisibleFill(node);
    const hasStroke = hasAnyVisibleStroke(node);
    const hasEffects = hasAnyVisibleEffect(node);
    const cornerRadius = node.cornerRadius ?? 0;
    const hasLayout = layoutMode !== 'NONE';

    // 6. Button heuristic
    if (
      hasLayout &&
      hasFill &&
      height <= BUTTON_MAX_HEIGHT &&
      width <= BUTTON_MAX_WIDTH &&
      childCount <= BUTTON_MAX_CHILDREN &&
      childCount >= 1
    ) {
      return result('button', 85, 'type');
    }

    // 7. Spacer (empty container, no visual properties)
    if (childCount === 0 && !hasFill && !hasStroke && !hasEffects) {
      return result('spacer', 85, 'type');
    }

    // 8. Wrapper (single child, no visual contribution)
    if (
      childCount === 1 &&
      !hasFill &&
      !hasStroke &&
      !hasEffects &&
      cornerRadius === 0 &&
      !hasLayout &&
      !hasPadding(node)
    ) {
      return result('wrapper', 85, 'type');
    }

    // 9. Section (wide container)
    if (width >= SECTION_MIN_WIDTH && childCount >= 1) {
      return result('section', 85, 'type');
    }

    // 10. Flex-row / flex-col
    if (layoutMode === 'HORIZONTAL' && childCount >= 1) {
      return result('flex-row', 85, 'type');
    }
    if (layoutMode === 'VERTICAL' && childCount >= 1) {
      return result('flex-col', 85, 'type');
    }

    // 11. Default container
    return result('container', 30, 'default');
  }

  // Non-container, non-text, non-shape fallback
  return result('unknown', 30, 'default');
}
