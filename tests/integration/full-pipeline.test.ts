import { describe, it, expect, vi } from 'vitest';
import { analyzeNode, analyzeSelection } from '../../src/core/analyzer';
import { scanForCleaning } from '../../src/features/cleaner';
import { scanForRenaming, generateName, applyRenames } from '../../src/features/renamer';
import { generateReport, suggestAction } from '../../src/features/validator';
import { generateBEMNames, applyBEMNames } from '../../src/features/bem-formatter';
import { extractTokens, formatTokens, snapTypography, snapSpacing } from '../../src/features/token-preview';
import { batchLabel, hasLabel } from '../../src/features/labeler';
import {
  mockTextNode,
  mockFrameNode,
  mockRectangleNode,
  mockVectorNode,
  mockGroupNode,
  mockLineNode,
  mockInstanceNode,
  mockSolidPaint,
  mockImagePaint,
  mockDropShadowEffect,
} from '../helpers/figma-mock';

/**
 * Build a realistic mock page with:
 * - A hero section (1200x600, image fill, heading, text, button)
 * - A card grid (3 cards, each with image, heading, text, button)
 * - Hidden layers, empty frames, single-child wrappers
 * - Auto-named layers throughout
 */
function buildMockPage() {
  // Hero section
  const heroHeading = mockTextNode({ name: 'Frame 10', fontSize: 48, fontWeight: 700, characters: 'Welcome' });
  const heroText = mockTextNode({ name: 'Frame 11', fontSize: 18, fontWeight: 400, characters: 'Subtitle text here' });
  const heroButton = mockFrameNode({
    name: 'Frame 12',
    width: 160, height: 48,
    layoutMode: 'HORIZONTAL',
    fills: [mockSolidPaint({ color: { r: 0.31, g: 0.27, b: 0.9 } })],
    children: [mockTextNode({ name: 'Frame 13', characters: 'Get Started' })],
  });
  const hero = mockFrameNode({
    name: 'Frame 1',
    width: 1200, height: 600,
    fills: [mockImagePaint()],
    paddingTop: 80, paddingRight: 48, paddingBottom: 80, paddingLeft: 48,
    itemSpacing: 24,
    layoutMode: 'VERTICAL',
    children: [heroHeading, heroText, heroButton],
  });

  // Card builder
  function buildCard(index: number) {
    const img = mockRectangleNode({
      name: `Rectangle ${index}`,
      fills: [mockImagePaint()],
      width: 350, height: 200,
    });
    const title = mockTextNode({ name: `Frame ${20 + index}`, fontSize: 24, fontWeight: 700, characters: `Card ${index}` });
    const body = mockTextNode({ name: `Frame ${30 + index}`, fontSize: 16, fontWeight: 400, characters: 'Description text' });
    const cta = mockFrameNode({
      name: `Frame ${40 + index}`,
      width: 120, height: 44,
      layoutMode: 'HORIZONTAL',
      fills: [mockSolidPaint()],
      children: [mockTextNode({ name: `Frame ${50 + index}`, characters: 'Learn More' })],
    });
    return mockFrameNode({
      name: `Frame ${60 + index}`,
      width: 350, height: 450,
      layoutMode: 'VERTICAL',
      paddingTop: 0, paddingRight: 0, paddingBottom: 24, paddingLeft: 0,
      itemSpacing: 16,
      cornerRadius: 8,
      children: [img, title, body, cta],
    });
  }

  const card1 = buildCard(1);
  const card2 = buildCard(2);
  const card3 = buildCard(3);

  const cardGrid = mockFrameNode({
    name: 'Frame 2',
    width: 1200, height: 500,
    layoutMode: 'HORIZONTAL',
    itemSpacing: 24,
    children: [card1, card2, card3],
  });

  // Hidden layer
  const hiddenLayer = mockFrameNode({
    name: 'Frame 3',
    visible: false,
    children: [mockTextNode({ name: 'Frame 70', characters: 'Hidden' })],
  });

  // Empty frame
  const emptyFrame = mockFrameNode({
    name: 'Frame 4',
    children: [],
    fills: [],
    strokes: [],
    effects: [],
    layoutMode: 'NONE',
  });

  // Single-child wrapper
  const wrappedText = mockTextNode({ name: 'Frame 80', fontSize: 14, fontWeight: 400, characters: 'Wrapped' });
  const wrapper = mockFrameNode({
    name: 'Frame 5',
    children: [wrappedText],
    fills: [],
    strokes: [],
    effects: [],
    cornerRadius: 0,
    layoutMode: 'NONE',
    paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
  });

  // Divider
  const divider = mockLineNode({ name: 'Line 1' });

  // Icon
  const icon = mockVectorNode({ name: 'Vector 1', width: 24, height: 24 });

  return { hero, cardGrid, hiddenLayer, emptyFrame, wrapper, divider, icon };
}

describe('Full Pipeline Integration', () => {
  const page = buildMockPage();
  const allNodes = [
    page.hero, page.cardGrid, page.hiddenLayer,
    page.emptyFrame, page.wrapper, page.divider, page.icon,
  ];

  describe('analysis', () => {
    it('correctly classifies hero section', () => {
      const result = analyzeNode(page.hero);
      expect(result.role).toBe('hero');
      expect(result.source).toBe('structure');
      expect(result.confidence).toBe(80);
    });

    it('correctly classifies cards within card grid', () => {
      const result = analyzeNode(page.cardGrid);
      // Card grid is a section (wide) or row (horizontal auto-layout)
      // Each child should be detected as card
      for (const child of result.children) {
        expect(child.role).toBe('card');
        expect(child.confidence).toBe(80);
      }
    });

    it('correctly classifies hidden layer', () => {
      const result = analyzeNode(page.hiddenLayer);
      expect(result.canRemove).toBe(true);
      expect(result.removeReason).toBe('hidden');
    });

    it('correctly classifies empty frame', () => {
      const result = analyzeNode(page.emptyFrame);
      expect(result.canRemove).toBe(true);
      expect(result.removeReason).toBe('empty-container');
    });

    it('correctly classifies wrapper', () => {
      const result = analyzeNode(page.wrapper);
      expect(result.canFlatten).toBe(true);
      expect(result.role).toBe('wrapper');
    });

    it('correctly classifies divider', () => {
      const result = analyzeNode(page.divider);
      expect(result.role).toBe('divider');
      expect(result.confidence).toBe(90);
    });

    it('correctly classifies icon', () => {
      const result = analyzeNode(page.icon);
      expect(result.role).toBe('icon');
      expect(result.confidence).toBe(90);
    });
  });

  describe('cleaning pipeline', () => {
    it('identifies removable and flattenable layers', () => {
      const results = analyzeSelection(allNodes);
      const scan = scanForCleaning(results);

      // Hidden layer + empty frame should be removable
      expect(scan.removable.length).toBeGreaterThanOrEqual(2);
      // Wrapper should be flattenable
      expect(scan.flattenable.length).toBeGreaterThanOrEqual(1);
      // Remaining should be safe
      expect(scan.safe.length).toBeGreaterThan(0);
    });
  });

  describe('renaming pipeline', () => {
    it('generates rename suggestions for auto-named layers', () => {
      const results = analyzeSelection(allNodes);
      const renames = scanForRenaming(results);

      // Should have renames for hero children, card grid children, divider, icon, etc.
      expect(renames.length).toBeGreaterThan(5);

      // Check specific renames
      const dividerRename = renames.find(r => r.currentName === 'Line 1');
      expect(dividerRename).toBeDefined();
      expect(dividerRename!.suggestedName).toBe('divider');

      const iconRename = renames.find(r => r.currentName === 'Vector 1');
      expect(iconRename).toBeDefined();
      expect(iconRename!.suggestedName).toBe('icon');
    });

    it('applies renames correctly', () => {
      const divider = mockLineNode({ name: 'Line 1' });
      const icon = mockVectorNode({ name: 'Vector 1', width: 24, height: 24 });
      const results = analyzeSelection([divider, icon]);
      const renames = scanForRenaming(results);
      applyRenames(renames);

      expect(divider.name).toBe('divider');
      expect(icon.name).toBe('icon');
    });
  });

  describe('validation pipeline', () => {
    it('produces a categorized confidence report', () => {
      const results = analyzeSelection(allNodes);
      const report = generateReport(results);

      // Should have entries in multiple tiers
      const total = report.high.length + report.needsReview.length +
        report.low.length + report.skipped.length;
      expect(total).toBeGreaterThan(10);

      // Hidden/empty should be in skipped
      expect(report.skipped.length).toBeGreaterThanOrEqual(2);

      // High confidence items should include text, icon, divider, image nodes
      expect(report.high.length).toBeGreaterThan(0);
    });

    it('suggests actions for low-confidence layers', () => {
      const node = mockFrameNode({
        name: 'Frame 99',
        width: 400, height: 300,
        fills: [mockSolidPaint()],
        children: [mockTextNode(), mockRectangleNode()],
      });
      const result = analyzeNode(node);
      if (result.confidence < 50) {
        const suggestion = suggestAction(result);
        expect(suggestion).not.toBeNull();
      }
    });
  });

  describe('BEM pipeline', () => {
    it('generates BEM names for card children', () => {
      const card = page.cardGrid.children[0];
      const result = analyzeNode(card);
      expect(result.role).toBe('card');

      const mappings = generateBEMNames(result);
      expect(mappings.length).toBeGreaterThanOrEqual(3);

      const names = mappings.map(m => m.bemName);
      expect(names).toContain('card__image');
      expect(names).toContain('card__title');
      expect(names).toContain('card__body');
    });

    it('applies BEM names to card children', () => {
      // Build fresh card to avoid mutation issues
      const img = mockRectangleNode({ name: 'Rectangle 1', fills: [mockImagePaint()], width: 350, height: 200 });
      const title = mockTextNode({ name: 'Frame 21', fontSize: 24, fontWeight: 700 });
      const body = mockTextNode({ name: 'Frame 31', fontSize: 16, fontWeight: 400 });
      const card = mockFrameNode({
        name: 'Frame 61',
        width: 350, height: 450,
        layoutMode: 'VERTICAL',
        cornerRadius: 8,
        children: [img, title, body],
      });
      const result = analyzeNode(card);
      applyBEMNames(result, false);

      expect(img.name).toBe('card__image');
      expect(title.name).toBe('card__title');
      expect(body.name).toBe('card__body');
    });

    it('generates BEM names for hero children', () => {
      const result = analyzeNode(page.hero);
      expect(result.role).toBe('hero');

      const mappings = generateBEMNames(result);
      const names = mappings.map(m => m.bemName);
      expect(names).toContain('hero__title');
      expect(names).toContain('hero__description');
      expect(names).toContain('hero__cta');
    });
  });

  describe('token pipeline', () => {
    it('extracts tokens from hero section', () => {
      const result = analyzeNode(page.hero);
      const tokens = extractTokens(result);

      // Should have spacing tokens (padding 80/48, gap 24)
      expect(tokens.spacing).not.toBeNull();
      expect(tokens.spacing!.top).toBe(80);
      expect(tokens.spacing!.gap).toBe(24);
    });

    it('formats tokens in all output formats', () => {
      const result = analyzeNode(page.hero);
      const tokens = extractTokens(result);

      const css = formatTokens(tokens, 'css');
      expect(css.length).toBeGreaterThan(0);
      expect(css).toContain('--padding-top: 80px');

      const scss = formatTokens(tokens, 'scss');
      expect(scss).toContain('$padding-top: 80px');

      const utility = formatTokens(tokens, 'utility');
      expect(utility.length).toBeGreaterThan(0);

      const gutenberg = formatTokens(tokens, 'gutenberg');
      const parsed = JSON.parse(gutenberg);
      expect(parsed.style.spacing).toBeDefined();
    });

    it('snaps typography classes correctly across the page', () => {
      // Hero heading: 48px, 700 → fk-text-title
      expect(snapTypography(48, 700)).toBe('fk-text-title');
      // Hero subtitle: 18px, 400 → fk-text-body-lg
      expect(snapTypography(18, 400)).toBe('fk-text-body-lg');
      // Card body: 16px, 400 → fk-text-body-md
      expect(snapTypography(16, 400)).toBe('fk-text-body-md');
    });

    it('snaps spacing values to scale tokens', () => {
      expect(snapSpacing(80)).toBe('2xl');
      expect(snapSpacing(48)).toBe('xl');
      expect(snapSpacing(24)).toBe('md');
      expect(snapSpacing(16)).toBe('xs');
    });
  });

  describe('labeling pipeline', () => {
    it('batch labels all nodes in the page', () => {
      // Use fresh nodes to avoid mutation
      const text = mockTextNode({ name: 'Frame 1', fontSize: 16, fontWeight: 400 });
      const icon = mockVectorNode({ name: 'Vector 1', width: 24, height: 24 });
      const img = mockRectangleNode({ name: 'Rectangle 1', fills: [mockImagePaint()] });

      const results = analyzeSelection([text, icon, img]);
      const count = batchLabel(results, 'prefix');

      expect(count).toBe(3);
      expect(hasLabel(text)).toBe(true);
      expect(hasLabel(icon)).toBe(true);
      expect(hasLabel(img)).toBe(true);
      expect(text.name).toBe('[fk:text] Frame 1');
      expect(icon.name).toBe('[fk:icon] Vector 1');
      expect(img.name).toBe('[fk:image] Rectangle 1');
    });
  });
});

describe('Edge Cases', () => {
  it('handles deeply nested trees (10+ levels)', () => {
    let node: any = mockTextNode({ name: 'Frame 1', fontSize: 16, fontWeight: 400 });
    for (let i = 0; i < 10; i++) {
      node = mockFrameNode({
        name: `Frame ${i + 100}`,
        width: 400,
        children: [node],
        fills: [],
        strokes: [],
        effects: [],
        cornerRadius: 0,
        layoutMode: 'NONE',
        paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
      });
    }
    const result = analyzeNode(node);
    expect(result.depth).toBe(0);

    // Walk to the deepest child
    let current = result;
    let depth = 0;
    while (current.children.length > 0) {
      current = current.children[0];
      depth++;
    }
    expect(depth).toBe(10);
    expect(current.role).toBe('text');
  });

  it('handles node with mixed fills (solid + image)', () => {
    const node = mockRectangleNode({
      fills: [mockSolidPaint(), mockImagePaint()],
    });
    const result = analyzeNode(node);
    // Image fill should be detected
    expect(result.role).toBe('image');
  });

  it('handles component instances (should not be treated as component definitions)', () => {
    // Instance nodes can be renamed; component definitions should not
    const instance = mockInstanceNode({
      name: 'Frame 1',
      width: 120, height: 44,
      layoutMode: 'HORIZONTAL',
      fills: [mockSolidPaint()],
      children: [mockTextNode({ characters: 'Click' })],
    });
    const result = analyzeNode(instance);
    const name = generateName(result);
    // Instances can be renamed
    expect(name).not.toBeNull();
  });

  it('handles pre-labeled nodes', () => {
    const node = mockTextNode({ name: '[fk:card] Product Card', fontSize: 16, fontWeight: 400 });
    expect(hasLabel(node)).toBe(true);
    const result = analyzeNode(node);
    // Should not suggest renaming a labeled node
    expect(result.suggestedName).toBeNull();
  });

  it('handles empty selection (analyzeSelection with empty array)', () => {
    const results = analyzeSelection([]);
    expect(results).toEqual([]);

    const cleanScan = scanForCleaning(results);
    expect(cleanScan.removable).toHaveLength(0);

    const renames = scanForRenaming(results);
    expect(renames).toHaveLength(0);

    const report = generateReport(results);
    expect(report.high).toHaveLength(0);
  });

  it('handles node with effects but no fills', () => {
    const node = mockFrameNode({
      children: [],
      fills: [],
      strokes: [],
      effects: [mockDropShadowEffect()],
    });
    const result = analyzeNode(node);
    // Has effects, should NOT be removable
    expect(result.canRemove).toBe(false);
    expect(result.hasEffects).toBe(true);
  });

  it('handles frame with only stroke (border)', () => {
    const node = mockFrameNode({
      children: [],
      fills: [],
      strokes: [mockSolidPaint()],
      effects: [],
    });
    const result = analyzeNode(node);
    expect(result.canRemove).toBe(false);
    expect(result.hasStroke).toBe(true);
  });
});
