import type { AnalysisResult } from '../shared/types';

export interface VariantMapping {
  nodeId: string;
  nodeName: string;
  componentName: string;
  variants: Array<{ property: string; value: string }>;
  cssClasses: string[];
}

/**
 * Safely read componentProperties from a Figma INSTANCE node.
 */
function safeGetComponentProperties(node: any): Record<string, { type: string; value: string }> {
  try {
    if (!node) return {};
    var props = node.componentProperties;
    if (!props || typeof props !== 'object') return {};
    var result: Record<string, { type: string; value: string }> = {};
    var keys = Object.keys(props);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      try {
        var val = props[key];
        if (val && typeof val === 'object' && val.type && val.value !== undefined) {
          result[key] = { type: String(val.type), value: String(val.value) };
        }
      } catch (e) {
        // skip
      }
    }
    return result;
  } catch (e) {
    return {};
  }
}

/**
 * Clean a component name for CSS class prefix.
 * "Button / Primary" → "button"
 */
function cleanComponentName(name: string): string {
  // Remove variant suffix after /
  var slashIdx = name.indexOf('/');
  if (slashIdx > 0) name = name.substring(0, slashIdx);
  // Clean for CSS
  return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
}

/**
 * Map component variants to CSS modifier classes.
 * Mirrors FigmaKit WP plugin's add_variant_classes().
 * Generates: fk-{prefix}--{value}
 */
export function mapVariantsToCSSModifiers(results: AnalysisResult[]): VariantMapping[] {
  var mappings: VariantMapping[] = [];

  function walk(nodes: AnalysisResult[]) {
    for (var i = 0; i < nodes.length; i++) {
      var result = nodes[i];

      if (result.type === 'INSTANCE') {
        var props = safeGetComponentProperties(result.node);
        var keys = Object.keys(props);

        if (keys.length > 0) {
          var variants: Array<{ property: string; value: string }> = [];
          var cssClasses: string[] = [];
          var prefix = 'fk-' + cleanComponentName(result.name);

          for (var k = 0; k < keys.length; k++) {
            var prop = props[keys[k]];
            if (prop.type === 'VARIANT') {
              var value = prop.value.toLowerCase().replace(/\s+/g, '-');
              if (value !== 'default') {
                variants.push({ property: keys[k], value: prop.value });
                cssClasses.push(prefix + '--' + value);
              }
            }
          }

          if (variants.length > 0) {
            mappings.push({
              nodeId: result.id,
              nodeName: result.name,
              componentName: cleanComponentName(result.name),
              variants: variants,
              cssClasses: cssClasses,
            });
          }
        }
      }

      if (result.children.length > 0) {
        walk(result.children);
      }
    }
  }

  walk(results);
  return mappings;
}
