import type { AnalysisResult, NodeRole, BEMMapping } from '../shared/types';

// Parent role → child role → BEM element name
const BEM_ELEMENT_MAP: Record<string, Record<string, string>> = {
  card: {
    image: 'image',
    heading: 'title',
    text: 'body',
    button: 'cta',
    divider: 'divider',
    icon: 'icon',
  },
  hero: {
    image: 'image',
    heading: 'title',
    text: 'description',
    button: 'cta',
  },
  feature: {
    icon: 'icon',
    heading: 'title',
    text: 'description',
  },
  cta: {
    heading: 'title',
    text: 'description',
    button: 'button',
  },
  testimonial: {
    image: 'avatar',
    text: 'quote',
    heading: 'author',
  },
};

const COMPOSITE_ROLES: Set<NodeRole> = new Set([
  'card', 'hero', 'feature', 'cta', 'testimonial',
]);

// Variant property names that map to modifiers
const VARIANT_MODIFIER_MAP: Record<string, (value: string) => string> = {
  'Layout': (v) => v.toLowerCase(),
  'Style': (v) => v.toLowerCase(),
  'Size': (v) => v.toLowerCase(),
  'Variant': (v) => v.toLowerCase(),
  'Type': (v) => v.toLowerCase(),
  'State': (v) => v.toLowerCase(),
};

/**
 * Build a BEM class string from block, element, and modifier parts.
 */
export function toBEM(block: string, element?: string, modifier?: string): string {
  let result = block;
  if (element && element.length > 0) {
    result += `__${element}`;
  }
  if (modifier && modifier.length > 0) {
    result += `--${modifier}`;
  }
  return result;
}

/**
 * Get the BEM element name for a child role within a parent role.
 * Falls back to the child role name if no specific mapping exists.
 */
export function getChildBEMElement(parentRole: string, childRole: string): string {
  const parentMap = BEM_ELEMENT_MAP[parentRole];
  if (parentMap && parentMap[childRole]) {
    return parentMap[childRole];
  }
  return childRole;
}

/**
 * Extract variant modifiers from a node's component properties.
 */
function extractModifiers(node: any): string[] {
  const props = node.componentProperties;
  if (!props || typeof props !== 'object') return [];

  const modifiers: string[] = [];
  for (const [key, prop] of Object.entries(props)) {
    const p = prop as any;
    if (p.type === 'VARIANT' && typeof p.value === 'string') {
      const mapper = VARIANT_MODIFIER_MAP[key];
      if (mapper) {
        modifiers.push(mapper(p.value));
      }
    }
  }
  return modifiers;
}

/**
 * Generate BEM name mappings for a composite component's children.
 * Returns empty array for non-composite roles.
 */
export function generateBEMNames(parentResult: AnalysisResult): BEMMapping[] {
  if (!COMPOSITE_ROLES.has(parentResult.role)) return [];

  const block = parentResult.role;
  const mappings: BEMMapping[] = [];
  const elementCounts = new Map<string, number>();

  for (const child of parentResult.children) {
    const element = getChildBEMElement(block, child.role);
    const count = (elementCounts.get(element) ?? 0) + 1;
    elementCounts.set(element, count);

    const bemName = toBEM(block, count > 1 ? `${element}-${count}` : element);

    mappings.push({
      nodeId: child.id,
      node: child.node,
      currentName: child.name,
      bemName,
    });
  }

  return mappings;
}

/**
 * Apply BEM names to a composite component and its children.
 * Optionally includes variant modifiers on the parent.
 * Returns the number of nodes renamed.
 */
export function applyBEMNames(parentResult: AnalysisResult, includeModifiers: boolean): number {
  if (!COMPOSITE_ROLES.has(parentResult.role)) return 0;

  const mappings = generateBEMNames(parentResult);
  let count = 0;

  // Rename parent with optional modifier
  if (includeModifiers) {
    const modifiers = extractModifiers(parentResult.node);
    if (modifiers.length > 0) {
      parentResult.node.name = toBEM(parentResult.role, undefined, modifiers[0]);
    } else {
      parentResult.node.name = parentResult.role;
    }
    count++;
  }

  // Rename children
  for (const mapping of mappings) {
    mapping.node.name = mapping.bemName;
    count++;
  }

  return count;
}
