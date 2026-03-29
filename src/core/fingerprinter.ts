import type { Fingerprint, Classification } from '../shared/types';
import { classifyNode } from './classifier';
import {
  ICON_MAX_SIZE,
  HERO_MIN_HEIGHT,
  HERO_MIN_WIDTH,
  CARD_MAX_WIDTH,
  FEATURE_MAX_WIDTH,
  FINGERPRINT_UNIFORMITY_THRESHOLD,
} from '../shared/constants';

const HEADING_NAME_PATTERN = /\b(h[1-6]|heading|headline|title)\b/i;
const BUTTON_NAME_PATTERN = /\b(button|btn|cta)\b/i;
const IMAGE_NAME_PATTERN = /\b(image|img|photo|thumbnail|thumb|avatar|logo|picture|banner|cover)\b/i;

const FINGERPRINT_HEADING_MIN_SIZE = 22;

/**
 * Check if a node has any visible fills of type IMAGE.
 */
function hasImageFill(node: any): boolean {
  const fills = node.fills;
  if (!Array.isArray(fills)) return false;
  return fills.some((f: any) => f.type === 'IMAGE' && f.visible !== false);
}

/**
 * Classify a child node for fingerprinting purposes.
 * Returns a semantic category: 'button', 'image', 'icon', 'heading', 'text', 'container', or 'other'.
 */
function classifyChild(child: any): string {
  const type: string = child.type ?? '';
  const name: string = child.name ?? '';
  const width: number = child.width ?? 0;
  const height: number = child.height ?? 0;

  // Check button by nodeRole or name
  const classification = classifyNode(child);
  if (classification.role === 'button' || BUTTON_NAME_PATTERN.test(name)) {
    return 'button';
  }

  // Check image (IMAGE fill or image-named)
  if (hasImageFill(child) || IMAGE_NAME_PATTERN.test(name)) {
    // Small images are icons
    if (width > 0 && height > 0 && width <= ICON_MAX_SIZE && height <= ICON_MAX_SIZE) {
      return 'icon';
    }
    return 'image';
  }

  // Check vector/shape types → icon
  const shapeTypes = ['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'POLYGON', 'ELLIPSE'];
  if (shapeTypes.includes(type) || classification.role === 'icon') {
    return 'icon';
  }

  // Check text
  if (type === 'TEXT') {
    const fontSize: number = child.fontSize ?? 16;
    if (fontSize >= FINGERPRINT_HEADING_MIN_SIZE || HEADING_NAME_PATTERN.test(name)) {
      return 'heading';
    }
    return 'text';
  }

  // Check container (frame/group with children)
  const containerTypes = ['FRAME', 'GROUP', 'INSTANCE', 'COMPONENT'];
  if (containerTypes.includes(type) && Array.isArray(child.children) && child.children.length > 0) {
    return 'container';
  }

  return 'other';
}

/**
 * Analyze children composition to produce a structural fingerprint.
 * Mirrors fk_fingerprint_children() from helpers.php.
 */
export function fingerprintChildren(children: any[]): Fingerprint | null {
  if (!children || children.length === 0) return null;

  const counts: Record<string, number> = {
    image: 0,
    text: 0,
    heading: 0,
    button: 0,
    icon: 0,
    container: 0,
  };

  const categories: string[] = [];

  for (const child of children) {
    const category = classifyChild(child);
    categories.push(category);
    if (category in counts) {
      counts[category]++;
    }
  }

  // Compute uniformity: 80%+ of children are the same semantic type
  let allSameType = false;
  if (children.length >= 3) {
    const categoryCounts: Record<string, number> = {};
    for (const cat of categories) {
      categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
    }
    const maxCount = Math.max(...Object.values(categoryCounts));
    allSameType = maxCount / children.length >= FINGERPRINT_UNIFORMITY_THRESHOLD;
  }

  return {
    images: counts.image,
    texts: counts.text,
    headings: counts.heading,
    buttons: counts.button,
    icons: counts.icon,
    containers: counts.container,
    total: children.length,
    hasImageFill: false, // Set by caller based on parent node
    allSameType,
    parentWidth: 0,  // Set by caller
    parentHeight: 0, // Set by caller
  };
}

/**
 * Match a structural fingerprint against known component patterns.
 * Mirrors fk_resolve_from_structure() from fk-module-resolver.php.
 */
export function matchFingerprint(
  node: any,
  fingerprint: Fingerprint | null,
): Classification | null {
  if (!fingerprint) return null;

  const w = fingerprint.parentWidth || (node.width ?? 0);
  const h = fingerprint.parentHeight || (node.height ?? 0);
  const nodeHasImageFill = fingerprint.hasImageFill || hasImageFill(node);

  const { total, images, texts, headings, buttons, icons, containers, allSameType } = fingerprint;

  // Hero: image fill + headings/texts + tall + wide
  if (
    nodeHasImageFill &&
    (headings >= 1 || texts >= 1) &&
    h >= HERO_MIN_HEIGHT &&
    (w >= HERO_MIN_WIDTH || w === 0)
  ) {
    return { role: 'hero', confidence: 80, source: 'structure' };
  }

  // Gallery: 3+ same-type images, no texts/buttons
  if (
    total >= 3 &&
    allSameType &&
    images >= 3 &&
    texts === 0 &&
    headings === 0 &&
    buttons === 0
  ) {
    return { role: 'gallery', confidence: 80, source: 'structure' };
  }

  // List: 3+ uniform children that are mostly text/containers (no images, no buttons)
  // Typical nav menu or footer link list
  if (
    total >= 3 &&
    allSameType &&
    (containers >= 3 || texts >= 3) &&
    images === 0 &&
    buttons === 0 &&
    icons === 0
  ) {
    return { role: 'list', confidence: 80, source: 'structure' };
  }

  // Repeater: 3+ same-type containers (with mixed content)
  if (total >= 3 && allSameType && containers >= 3) {
    return { role: 'row', confidence: 80, source: 'structure' };
  }

  // Feature/Blurb: 2-4 children, icons + headings/texts, no images, narrow
  if (
    total >= 2 &&
    total <= 4 &&
    icons >= 1 &&
    (headings >= 1 || texts >= 1) &&
    images === 0 &&
    (w < FEATURE_MAX_WIDTH || w === 0)
  ) {
    return { role: 'feature', confidence: 80, source: 'structure' };
  }

  // Card: 2-6 children, headings/texts + images/icons, not image fill, not too wide
  if (
    total >= 2 &&
    total <= 6 &&
    (headings >= 1 || texts >= 1) &&
    (images >= 1 || icons >= 1) &&
    !nodeHasImageFill &&
    (w <= CARD_MAX_WIDTH || w === 0)
  ) {
    return { role: 'card', confidence: 80, source: 'structure' };
  }

  return null;
}
