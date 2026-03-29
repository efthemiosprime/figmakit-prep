import { describe, it, expect } from 'vitest';
import {
  snapTypography,
  snapSpacing,
  formatTokens,
  extractTokens,
} from '../../src/features/token-preview';
import { analyzeNode } from '../../src/core/analyzer';
import {
  mockTextNode,
  mockFrameNode,
  mockRectangleNode,
  mockSolidPaint,
  mockImagePaint,
  mockDropShadowEffect,
} from '../helpers/figma-mock';

describe('snapTypography', () => {
  it('returns fk-text-footnote for fs <= 11', () => {
    expect(snapTypography(10, 400)).toBe('fk-text-footnote');
    expect(snapTypography(11, 400)).toBe('fk-text-footnote');
  });

  it('returns fk-text-eyebrow for fs <= 13, fw >= 500, uppercase', () => {
    expect(snapTypography(12, 600, 'UPPER')).toBe('fk-text-eyebrow');
    expect(snapTypography(13, 500, 'UPPER')).toBe('fk-text-eyebrow');
  });

  it('returns fk-text-caption for fs <= 13 (non-eyebrow)', () => {
    expect(snapTypography(12, 400)).toBe('fk-text-caption');
    expect(snapTypography(13, 400)).toBe('fk-text-caption');
  });

  it('returns fk-text-body-sm for 14 <= fs <= 15', () => {
    expect(snapTypography(14, 400)).toBe('fk-text-body-sm');
    expect(snapTypography(15, 400)).toBe('fk-text-body-sm');
  });

  it('returns fk-text-body-md for 16 <= fs <= 17', () => {
    expect(snapTypography(16, 400)).toBe('fk-text-body-md');
    expect(snapTypography(17, 400)).toBe('fk-text-body-md');
  });

  it('returns fk-text-body-lg for 18 <= fs <= 22', () => {
    expect(snapTypography(18, 400)).toBe('fk-text-body-lg');
    expect(snapTypography(20, 400)).toBe('fk-text-body-lg');
    expect(snapTypography(22, 400)).toBe('fk-text-body-lg');
  });

  it('returns fk-text-subtitle for fs >= 28, fw >= 500', () => {
    expect(snapTypography(28, 500)).toBe('fk-text-subtitle');
    expect(snapTypography(35, 600)).toBe('fk-text-subtitle');
    expect(snapTypography(39, 500)).toBe('fk-text-subtitle');
  });

  it('returns fk-text-title for fs >= 40, fw >= 600', () => {
    expect(snapTypography(40, 600)).toBe('fk-text-title');
    expect(snapTypography(48, 700)).toBe('fk-text-title');
    expect(snapTypography(72, 800)).toBe('fk-text-title');
  });

  it('returns empty string for unmatched sizes', () => {
    // fs = 25, fw = 400 — between body-lg (max 22) and subtitle (min 28, needs fw 500)
    expect(snapTypography(25, 400)).toBe('');
  });
});

describe('snapSpacing', () => {
  it('snaps exact values to token names', () => {
    expect(snapSpacing(4)).toBe('4xs');
    expect(snapSpacing(8)).toBe('3xs');
    expect(snapSpacing(12)).toBe('2xs');
    expect(snapSpacing(16)).toBe('xs');
    expect(snapSpacing(20)).toBe('sm');
    expect(snapSpacing(24)).toBe('md');
    expect(snapSpacing(32)).toBe('lg');
    expect(snapSpacing(48)).toBe('xl');
    expect(snapSpacing(80)).toBe('2xl');
    expect(snapSpacing(96)).toBe('3xl');
  });

  it('snaps to nearest value', () => {
    expect(snapSpacing(5)).toBe('4xs');   // closer to 4 (diff 1 vs 3)
    expect(snapSpacing(7)).toBe('3xs');   // closer to 8 (diff 1 vs 3)
    expect(snapSpacing(11)).toBe('2xs');  // closer to 12 (diff 1 vs 3)
    expect(snapSpacing(15)).toBe('xs');   // closer to 16 (diff 1 vs 3)
    expect(snapSpacing(30)).toBe('lg');   // closer to 32 (diff 2 vs 6)
    expect(snapSpacing(44)).toBe('xl');   // closer to 48 (diff 4 vs 12)
  });

  it('returns empty string for 0', () => {
    expect(snapSpacing(0)).toBe('');
  });
});

describe('formatTokens', () => {
  const tokens = {
    colors: [
      { name: 'fill_0', value: '#1a1a2e' },
      { name: 'stroke_0', value: '#cccccc' },
    ],
    typography: {
      fontFamily: 'Inter',
      fontSize: 16,
      fontWeight: 400,
      lineHeight: 24,
      letterSpacing: 0,
      textCase: 'ORIGINAL',
    },
    spacing: { top: 24, right: 32, bottom: 24, left: 32, gap: 16 },
    borderRadius: 8,
    effects: [{ type: 'box-shadow', value: '0px 4px 8px 0px rgba(0,0,0,0.25)' }],
  };

  it('formats as CSS variables', () => {
    const css = formatTokens(tokens, 'css');
    expect(css).toContain('--fill-0: #1a1a2e');
    expect(css).toContain('--stroke-0: #cccccc');
    expect(css).toContain('--font-family: Inter');
    expect(css).toContain('--font-size: 16px');
    expect(css).toContain('--border-radius: 8px');
    expect(css).toContain('box-shadow');
  });

  it('formats as SCSS variables', () => {
    const scss = formatTokens(tokens, 'scss');
    expect(scss).toContain('$fill-0: #1a1a2e');
    expect(scss).toContain('$font-family: Inter');
    expect(scss).toContain('$font-size: 16px');
    expect(scss).toContain('$border-radius: 8px');
  });

  it('formats as utility classes', () => {
    const util = formatTokens(tokens, 'utility');
    expect(util).toContain('.fk-p');
    expect(util).toContain('.fk-gap-xs');
  });

  it('formats as Gutenberg block attributes', () => {
    const json = formatTokens(tokens, 'gutenberg');
    const parsed = JSON.parse(json);
    expect(parsed.style).toBeDefined();
    expect(parsed.style.color).toBeDefined();
    expect(parsed.style.spacing).toBeDefined();
    expect(parsed.style.border).toBeDefined();
  });

  it('handles empty tokens gracefully', () => {
    const empty = {
      colors: [],
      typography: null,
      spacing: null,
      borderRadius: null,
      effects: [],
    };
    const css = formatTokens(empty, 'css');
    expect(typeof css).toBe('string');
  });
});

describe('extractTokens', () => {
  it('extracts colors from node with fills', () => {
    const node = mockRectangleNode({
      fills: [mockSolidPaint({ color: { r: 1, g: 0, b: 0 } })],
    });
    const result = analyzeNode(node);
    const tokens = extractTokens(result);
    expect(tokens.colors.length).toBeGreaterThan(0);
    expect(tokens.colors[0].value).toBe('#ff0000');
  });

  it('extracts typography from text node', () => {
    const node = mockTextNode({
      fontSize: 24,
      fontWeight: 700,
      fontName: { family: 'Inter', style: 'Bold' },
    });
    const result = analyzeNode(node);
    const tokens = extractTokens(result);
    expect(tokens.typography).not.toBeNull();
    expect(tokens.typography!.fontFamily).toBe('Inter');
    expect(tokens.typography!.fontSize).toBe(24);
    expect(tokens.typography!.fontWeight).toBe(700);
  });

  it('extracts spacing from frame with padding', () => {
    const node = mockFrameNode({
      paddingTop: 16,
      paddingRight: 24,
      paddingBottom: 16,
      paddingLeft: 24,
      itemSpacing: 12,
      children: [mockTextNode()],
    });
    const result = analyzeNode(node);
    const tokens = extractTokens(result);
    expect(tokens.spacing).not.toBeNull();
    expect(tokens.spacing!.top).toBe(16);
    expect(tokens.spacing!.gap).toBe(12);
  });

  it('extracts border radius', () => {
    const node = mockFrameNode({ cornerRadius: 12, children: [] });
    const result = analyzeNode(node);
    const tokens = extractTokens(result);
    expect(tokens.borderRadius).toBe(12);
  });

  it('extracts effects', () => {
    const node = mockFrameNode({
      effects: [mockDropShadowEffect()],
      children: [],
    });
    const result = analyzeNode(node);
    const tokens = extractTokens(result);
    expect(tokens.effects.length).toBeGreaterThan(0);
    expect(tokens.effects[0].type).toBe('box-shadow');
  });

  it('returns null typography for non-text nodes', () => {
    const node = mockFrameNode({ children: [] });
    const result = analyzeNode(node);
    const tokens = extractTokens(result);
    expect(tokens.typography).toBeNull();
  });

  it('returns null spacing for nodes without padding', () => {
    const node = mockFrameNode({
      paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
      itemSpacing: 0,
      children: [],
    });
    const result = analyzeNode(node);
    const tokens = extractTokens(result);
    expect(tokens.spacing).toBeNull();
  });
});
