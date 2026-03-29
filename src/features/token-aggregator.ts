import type { AnalysisResult } from '../shared/types';
import { SPACING_SCALE } from '../shared/constants';
import { snapTypography, snapSpacing } from './token-preview';

export interface ColorToken {
  value: string;
  count: number;
  suggestedName: string;
  usedIn: string[];
}

export interface FontToken {
  family: string;
  count: number;
  suggestedName: string;
}

export interface TextStyleToken {
  fontSize: number;
  fontWeight: number;
  fontFamily: string;
  count: number;
  suggestedName: string;
  textClass: string;
  usedIn: string[];
}

export interface SpacingToken {
  value: number;
  count: number;
  suggestedName: string;
  type: string; // padding, gap
}

export interface AggregatedTokens {
  colors: ColorToken[];
  fonts: FontToken[];
  textStyles: TextStyleToken[];
  spacings: SpacingToken[];
}

function rgbToHex(r: number, g: number, b: number): string {
  var toHex = function(v: number) {
    var h = Math.round(v * 255).toString(16);
    return h.length === 1 ? '0' + h : h;
  };
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

function colorKey(value: string): string {
  return value.toLowerCase().replace(/\s/g, '');
}

function textStyleKey(fontSize: number, fontWeight: number, family: string): string {
  return Math.round(fontSize) + '-' + fontWeight + '-' + family.toLowerCase();
}

function suggestColorName(hex: string, index: number): string {
  var lower = hex.toLowerCase();
  // Common color detection
  if (lower === '#ffffff' || lower === '#fff') return 'white';
  if (lower === '#000000' || lower === '#000') return 'black';

  // Parse RGB for hue-based naming
  var r = parseInt(lower.slice(1, 3), 16);
  var g = parseInt(lower.slice(3, 5), 16);
  var b = parseInt(lower.slice(5, 7), 16);

  // Greyscale
  if (Math.abs(r - g) < 15 && Math.abs(g - b) < 15) {
    var brightness = Math.round((r / 255) * 100);
    if (brightness > 90) return 'grey-light';
    if (brightness > 60) return 'grey-mid';
    if (brightness > 30) return 'grey-dark';
    return 'grey-darker';
  }

  // Dominant hue
  var max = Math.max(r, g, b);
  if (max === r && r > g + 30 && r > b + 30) return 'color-red-' + (index + 1);
  if (max === g && g > r + 30 && g > b + 30) return 'color-green-' + (index + 1);
  if (max === b && b > r + 30 && b > g + 30) return 'color-blue-' + (index + 1);
  if (r > 200 && g > 100 && b < 80) return 'color-orange-' + (index + 1);
  if (r > 150 && g < 80 && b > 150) return 'color-purple-' + (index + 1);

  return 'color-' + (index + 1);
}

/**
 * Aggregate all design tokens from an analysis tree.
 */
export function aggregateTokens(results: AnalysisResult[]): AggregatedTokens {
  var colorMap = new Map<string, ColorToken>();
  var fontMap = new Map<string, FontToken>();
  var textStyleMap = new Map<string, TextStyleToken>();
  var spacingMap = new Map<string, SpacingToken>();

  function walk(items: AnalysisResult[]) {
    for (var i = 0; i < items.length; i++) {
      var result = items[i];
      var nodeName = result.name;

      // Collect colors
      if (result.tokens.colors) {
        for (var ci = 0; ci < result.tokens.colors.length; ci++) {
          var c = result.tokens.colors[ci];
          var key = colorKey(c.value);
          var existing = colorMap.get(key);
          if (existing) {
            existing.count++;
            if (existing.usedIn.length < 3 && existing.usedIn.indexOf(nodeName) < 0) {
              existing.usedIn.push(nodeName);
            }
          } else {
            colorMap.set(key, {
              value: c.value,
              count: 1,
              suggestedName: '',
              usedIn: [nodeName],
            });
          }
        }
      }

      // Collect typography
      if (result.tokens.typography) {
        var t = result.tokens.typography;
        var family = t.fontFamily;

        // Font families
        var fontKey = family.toLowerCase();
        var existingFont = fontMap.get(fontKey);
        if (existingFont) {
          existingFont.count++;
        } else {
          fontMap.set(fontKey, {
            family: family,
            count: 1,
            suggestedName: family.toLowerCase().replace(/\s+/g, '-'),
          });
        }

        // Text styles (unique fontSize + fontWeight + family combos)
        var tsKey = textStyleKey(t.fontSize, t.fontWeight, family);
        var existingTs = textStyleMap.get(tsKey);
        if (existingTs) {
          existingTs.count++;
          if (existingTs.usedIn.length < 3 && existingTs.usedIn.indexOf(nodeName) < 0) {
            existingTs.usedIn.push(nodeName);
          }
        } else {
          var textClass = snapTypography(t.fontSize, t.fontWeight, t.textCase || undefined);
          textStyleMap.set(tsKey, {
            fontSize: t.fontSize,
            fontWeight: t.fontWeight,
            fontFamily: family,
            count: 1,
            suggestedName: textClass || ('text-' + Math.round(t.fontSize)),
            textClass: textClass,
            usedIn: [nodeName],
          });
        }
      }

      // Collect spacing
      if (result.tokens.spacing) {
        var sp = result.tokens.spacing;
        var spacingValues = [
          { value: sp.top, type: 'padding-top' },
          { value: sp.right, type: 'padding-right' },
          { value: sp.bottom, type: 'padding-bottom' },
          { value: sp.left, type: 'padding-left' },
        ];
        if (sp.gap) {
          spacingValues.push({ value: sp.gap, type: 'gap' });
        }
        for (var si = 0; si < spacingValues.length; si++) {
          var sv = spacingValues[si];
          if (sv.value <= 0) continue;
          var spKey = String(Math.round(sv.value));
          var existingSp = spacingMap.get(spKey);
          if (existingSp) {
            existingSp.count++;
          } else {
            var snapped = snapSpacing(sv.value);
            spacingMap.set(spKey, {
              value: sv.value,
              count: 1,
              suggestedName: snapped || ('space-' + Math.round(sv.value)),
              type: sv.type,
            });
          }
        }
      }

      // Recurse
      if (result.children.length > 0) {
        walk(result.children);
      }
    }
  }

  walk(results);

  // Convert maps to sorted arrays
  var colors: ColorToken[] = [];
  colorMap.forEach(function(v) { colors.push(v); });
  colors.sort(function(a, b) { return b.count - a.count; });

  // Assign suggested names to colors
  for (var ci2 = 0; ci2 < colors.length; ci2++) {
    colors[ci2].suggestedName = suggestColorName(colors[ci2].value, ci2);
  }

  var fonts: FontToken[] = [];
  fontMap.forEach(function(v) { fonts.push(v); });
  fonts.sort(function(a, b) { return b.count - a.count; });

  var textStyles: TextStyleToken[] = [];
  textStyleMap.forEach(function(v) { textStyles.push(v); });
  textStyles.sort(function(a, b) { return a.fontSize - b.fontSize; });

  var spacings: SpacingToken[] = [];
  spacingMap.forEach(function(v) { spacings.push(v); });
  spacings.sort(function(a, b) { return a.value - b.value; });

  return { colors: colors, fonts: fonts, textStyles: textStyles, spacings: spacings };
}
