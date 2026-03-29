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
 * Check if a node name indicates a decorative/shadow layer.
 * Catches patterns like: Button:shadow, Background+Border+Shadow, :margin
 */
function isDecorativeLayer(name: string): boolean {
  var lower = name.toLowerCase();
  // Exact decorative names
  if (lower === 'shadow' || lower === 'border' || lower === 'overlay') return true;
  // Separator patterns: :shadow, +shadow, :border, +border, :margin
  if (lower.indexOf(':shadow') >= 0 || lower.indexOf('+shadow') >= 0) return true;
  if (lower.indexOf(':border') >= 0 || lower.indexOf('+border') >= 0) return true;
  if (lower.indexOf(':margin') >= 0) return true;
  // Combined decorative names
  if (lower.indexOf('background+border') >= 0) return true;
  // Border separators
  if (lower === 'horizontalborder' || lower === 'verticalborder') return true;
  return false;
}

/**
 * Check if a node name matches "Background" — a common decorative wrapper.
 */
function isBackgroundName(name: string): boolean {
  return name.toLowerCase() === 'background';
}

/**
 * Check if a node name matches "Heading N" pattern.
 */
var HEADING_NAME_RE = /^heading\s*(\d)?$/i;
function getHeadingFromName(name: string): number {
  var match = HEADING_NAME_RE.exec(name);
  if (match) return match[1] ? parseInt(match[1]) : 0;
  return -1;
}

/**
 * Check if all children of a node are button-appropriate (TEXT or small icons).
 */
function allChildrenAreButtonContent(node: any): boolean {
  var children = node.children;
  if (!Array.isArray(children) || children.length === 0) return false;
  for (var i = 0; i < children.length; i++) {
    var child = children[i];
    var childType = child.type || '';
    // TEXT is always fine in a button
    if (childType === 'TEXT') continue;
    // Small vectors/shapes are icons — fine in a button
    var isSmallShape = (childType === 'VECTOR' || childType === 'BOOLEAN_OPERATION' ||
      childType === 'STAR' || childType === 'POLYGON' || childType === 'ELLIPSE') &&
      (child.width || 0) <= ICON_MAX_SIZE && (child.height || 0) <= ICON_MAX_SIZE;
    if (isSmallShape) continue;
    // Small frames with image fill can be icons too
    var childW = child.width || 0;
    var childH = child.height || 0;
    if (childW <= ICON_MAX_SIZE && childH <= ICON_MAX_SIZE) continue;
    // Anything else = not a button
    return false;
  }
  return true;
}

/**
 * Classify a Figma node based on its type, properties, and layout.
 * Mirrors classifyNode() from FigmaKit's code.js.
 *
 * Priority chain:
 * 0. Decorative layer detection (:shadow, :border, overlay)
 * 1. TEXT → heading or text
 * 2. Image fill → image
 * 3. Small vector/shape → icon
 * 4. LINE → divider
 * 5. Thin rectangle → divider
 * 6. Button heuristic (tightened)
 * 7. Spacer (empty, no fills)
 * 8. Wrapper (single child, no visual)
 * 9. Section (wide container)
 * 10. Flex-row / flex-col
 * 11. Default → container
 */
export function classifyNode(node: any): Classification {
  var type: string = node.type;
  var width: number = node.width != null ? node.width : 0;
  var height: number = node.height != null ? node.height : 0;
  var childCount = getChildCount(node);
  var layoutMode: string = node.layoutMode != null ? node.layoutMode : 'NONE';
  var name: string = node.name != null ? node.name : '';

  // 0. Decorative layers — skip (high confidence to override name patterns)
  if (isDecorativeLayer(name)) {
    return result('background-shape', 95, 'type');
  }

  // 0b. "Background" named leaf nodes (no children) → background-shape (decorative)
  // "Background" with children is a styled container, keep as container
  if (isBackgroundName(name) && childCount === 0) {
    return result('background-shape', 85, 'type');
  }

  // 0c. "Heading N" named containers with single text child → wrapper (should flatten)
  // The actual heading is the TEXT child inside, not the frame itself
  var headingLevel = getHeadingFromName(name);
  if (headingLevel >= 0 && isContainerType(type) && childCount === 1) {
    var onlyChild = node.children[0];
    if (onlyChild && onlyChild.type === 'TEXT') {
      // This is a heading wrapper — mark as wrapper so it gets flattened
      return result('wrapper', 90, 'type');
    }
  }

  // 0d. "SVG" named containers → image (exportable asset)
  // The renamer will convert to button_icon when inside a button context
  if (isContainerType(type) && /^svg$/i.test(name)) {
    return result('image', 90, 'type');
  }

  // 0e. "Link" named containers → list-item (nav link wrapper)
  if (isContainerType(type) && /^link$/i.test(name)) {
    return result('list-item', 85, 'type');
  }

  // 0f. Nav/Menu containers with children → list
  if (isContainerType(type) && /\b(nav|menu|navigation)\b/i.test(name) && childCount >= 1) {
    return result('list', 90, 'type');
  }

  // 0g. "Button" / "btn" named containers → button (trust the designer's name)
  if (isContainerType(type) && /^(button|btn)$/i.test(name)) {
    return result('button', 90, 'type');
  }

  // 0e. "List" named containers → list (preserve as-is)
  var lowerName = name.toLowerCase();
  if ((lowerName === 'list' || lowerName === 'nav-list' || lowerName === 'menu') && isContainerType(type) && childCount >= 1) {
    return result('list', 90, 'type');
  }

  // 0e. "Item" named containers → list-item (preserve as-is)
  if ((lowerName === 'item' || lowerName === 'list-item' || lowerName === 'menu-item' || lowerName === 'nav-item') && isContainerType(type)) {
    return result('list-item', 90, 'type');
  }

  // 1. TEXT nodes
  if (type === 'TEXT') {
    var fontSize: number = node.fontSize != null ? node.fontSize : 16;
    var fontWeight: number = node.fontWeight != null ? node.fontWeight : 400;
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
    var isHorizontalDivider = height > 0 && height <= DIVIDER_MAX_THICKNESS && width / height >= DIVIDER_ASPECT_RATIO;
    var isVerticalDivider = width > 0 && width <= DIVIDER_MAX_THICKNESS && height / width >= DIVIDER_ASPECT_RATIO;
    if (isHorizontalDivider || isVerticalDivider) {
      return result('divider', 90, 'type');
    }
  }

  // For container-like nodes only (FRAME, GROUP, COMPONENT, INSTANCE, SECTION)
  if (isContainerType(type)) {
    var hasFill = hasAnyVisibleFill(node);
    var hasStroke = hasAnyVisibleStroke(node);
    var hasEffects = hasAnyVisibleEffect(node);
    var cornerRadius = node.cornerRadius != null ? node.cornerRadius : 0;
    var hasLayout = layoutMode !== 'NONE';

    // 6. Button heuristic (tightened):
    // - Must have auto-layout + fill
    // - Must be small (h <= 80, w <= 400)
    // - Must have 1-3 children AND all children must be TEXT (or single text + icon)
    // - Excludes containers with effects (shadow layers) or multiple non-text children
    if (
      hasLayout &&
      hasFill &&
      height <= BUTTON_MAX_HEIGHT &&
      width <= BUTTON_MAX_WIDTH &&
      childCount <= BUTTON_MAX_CHILDREN &&
      childCount >= 1 &&
      !hasEffects &&
      allChildrenAreButtonContent(node)
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
