import { describe, it, expect } from 'vitest';
import { analyzeNode, analyzeSelection } from '../../src/core/analyzer';
import {
  mockTextNode,
  mockFrameNode,
  mockRectangleNode,
  mockVectorNode,
  mockGroupNode,
  mockLineNode,
  mockImagePaint,
  mockSolidPaint,
  mockDropShadowEffect,
} from '../helpers/figma-mock';

describe('analyzeNode', () => {
  // --- Basic classification pass-through ---
  describe('classification', () => {
    it('classifies TEXT node as text with correct fields', () => {
      const node = mockTextNode({ name: 'Frame 1', fontSize: 16, fontWeight: 400 });
      const result = analyzeNode(node);
      expect(result.role).toBe('text');
      expect(result.confidence).toBe(90);
      expect(result.source).toBe('type');
      expect(result.id).toBe(node.id);
      expect(result.name).toBe('Frame 1');
      expect(result.type).toBe('TEXT');
    });

    it('classifies heading TEXT node', () => {
      const node = mockTextNode({ name: 'Text 1', fontSize: 48, fontWeight: 700 });
      const result = analyzeNode(node);
      expect(result.role).toBe('heading');
      expect(result.confidence).toBe(90);
    });

    it('classifies image fill node', () => {
      const node = mockRectangleNode({ name: 'Rectangle 1', fills: [mockImagePaint()] });
      const result = analyzeNode(node);
      expect(result.role).toBe('image');
    });

    it('classifies icon node', () => {
      const node = mockVectorNode({ name: 'Vector 1', width: 24, height: 24 });
      const result = analyzeNode(node);
      expect(result.role).toBe('icon');
    });

    it('classifies divider (LINE)', () => {
      const node = mockLineNode({ name: 'Line 1' });
      const result = analyzeNode(node);
      expect(result.role).toBe('divider');
    });
  });

  // --- Name pattern boosting ---
  describe('name pattern detection', () => {
    it('uses name pattern when confidence is higher than default', () => {
      const node = mockFrameNode({
        name: 'accordion',
        width: 400,
        height: 300,
        fills: [mockSolidPaint()],
        children: [mockTextNode(), mockTextNode({ name: 'Text 2' })],
      });
      const result = analyzeNode(node);
      expect(result.role).toBe('accordion');
      expect(result.source).toBe('name');
      expect(result.confidence).toBe(60);
    });

    it('type-based classification wins over name pattern (higher confidence)', () => {
      // A TEXT node named "button" should still be classified as text (confidence 90 > 60)
      const node = mockTextNode({ name: 'button', fontSize: 16, fontWeight: 400 });
      const result = analyzeNode(node);
      expect(result.role).toBe('text');
      expect(result.source).toBe('type');
    });

    it('name pattern wins over default classification', () => {
      // Frame named "tabs" with default classification (30) loses to name pattern (60)
      const node = mockFrameNode({
        name: 'tabs',
        width: 400,
        height: 300,
        fills: [mockSolidPaint()],
        children: [mockTextNode(), mockTextNode({ name: 'Text 2' })],
      });
      const result = analyzeNode(node);
      expect(result.role).toBe('tabs');
      expect(result.source).toBe('name');
    });
  });

  // --- Structural fingerprinting ---
  describe('structural fingerprinting', () => {
    it('detects card via structural fingerprint', () => {
      const children = [
        mockRectangleNode({ name: 'Rectangle 1', fills: [mockImagePaint()], width: 300, height: 200 }),
        mockTextNode({ name: 'Text 1', fontSize: 24, fontWeight: 700 }),
        mockTextNode({ name: 'Text 2', fontSize: 16, fontWeight: 400 }),
        mockFrameNode({
          name: 'Frame 1',
          width: 120, height: 44,
          layoutMode: 'HORIZONTAL',
          fills: [mockSolidPaint()],
          children: [mockTextNode({ characters: 'CTA' })],
        }),
      ];
      const node = mockFrameNode({
        name: 'Frame 47',
        width: 350,
        height: 450,
        children,
      });
      const result = analyzeNode(node);
      expect(result.role).toBe('card');
      expect(result.source).toBe('structure');
      expect(result.confidence).toBe(80);
    });

    it('detects hero via structural fingerprint', () => {
      const children = [
        mockTextNode({ name: 'Text 1', fontSize: 48, fontWeight: 700 }),
        mockTextNode({ name: 'Text 2', fontSize: 16, fontWeight: 400 }),
        mockFrameNode({
          name: 'Frame 1',
          width: 120, height: 44,
          layoutMode: 'HORIZONTAL',
          fills: [mockSolidPaint()],
          children: [mockTextNode({ characters: 'CTA' })],
        }),
      ];
      const node = mockFrameNode({
        name: 'Frame 12',
        width: 1200,
        height: 600,
        fills: [mockImagePaint()],
        children,
      });
      const result = analyzeNode(node);
      expect(result.role).toBe('hero');
      expect(result.source).toBe('structure');
      expect(result.confidence).toBe(80);
    });

    it('structure (80) wins over name pattern (60)', () => {
      // Frame named "container" with card-like children
      const children = [
        mockRectangleNode({ name: 'Rectangle 1', fills: [mockImagePaint()], width: 300, height: 200 }),
        mockTextNode({ name: 'Text 1', fontSize: 24, fontWeight: 700 }),
        mockTextNode({ name: 'Text 2', fontSize: 16, fontWeight: 400 }),
      ];
      const node = mockFrameNode({
        name: 'container',
        width: 350,
        height: 400,
        children,
      });
      const result = analyzeNode(node);
      expect(result.role).toBe('card');
      expect(result.source).toBe('structure');
    });
  });

  // --- Suggested name ---
  describe('suggestedName', () => {
    it('suggests name for auto-named node', () => {
      const node = mockTextNode({ name: 'Frame 47', fontSize: 16, fontWeight: 400 });
      const result = analyzeNode(node);
      expect(result.suggestedName).toBe('text');
    });

    it('suggests heading name for auto-named heading nodes', () => {
      const node = mockTextNode({ name: 'Frame 1', fontSize: 48, fontWeight: 700 });
      const result = analyzeNode(node);
      expect(result.suggestedName).toBe('heading');
    });

    it('returns null suggestedName for already semantic names', () => {
      const node = mockTextNode({ name: 'button', fontSize: 16, fontWeight: 400 });
      const result = analyzeNode(node);
      expect(result.suggestedName).toBeNull();
    });

    it('returns null suggestedName for user-given non-auto names', () => {
      const node = mockTextNode({ name: 'my-widget', fontSize: 16, fontWeight: 400 });
      const result = analyzeNode(node);
      expect(result.suggestedName).toBeNull();
    });
  });

  // --- Safety assessment ---
  describe('safety assessment', () => {
    it('flags hidden node as removable', () => {
      const node = mockFrameNode({ visible: false, children: [mockTextNode()] });
      const result = analyzeNode(node);
      expect(result.canRemove).toBe(true);
      expect(result.removeReason).toBe('hidden');
    });

    it('flags empty frame as removable', () => {
      const node = mockFrameNode({
        children: [],
        fills: [],
        strokes: [],
        effects: [],
      });
      const result = analyzeNode(node);
      expect(result.canRemove).toBe(true);
    });

    it('flags single-child wrapper as flattenable', () => {
      const child = mockTextNode({ characters: 'Hello' });
      const node = mockFrameNode({
        children: [child],
        fills: [],
        strokes: [],
        effects: [],
        cornerRadius: 0,
        layoutMode: 'NONE',
        paddingTop: 0,
        paddingRight: 0,
        paddingBottom: 0,
        paddingLeft: 0,
      });
      const result = analyzeNode(node);
      expect(result.canFlatten).toBe(true);
    });

    it('does not flag visible frame with fill as removable', () => {
      const node = mockFrameNode({
        children: [mockTextNode()],
        fills: [mockSolidPaint()],
      });
      const result = analyzeNode(node);
      expect(result.canRemove).toBe(false);
    });
  });

  // --- Properties snapshot ---
  describe('properties snapshot', () => {
    it('captures visibility and opacity', () => {
      const node = mockFrameNode({ visible: true, opacity: 0.8, children: [] });
      const result = analyzeNode(node);
      expect(result.isVisible).toBe(true);
      expect(result.opacity).toBe(0.8);
    });

    it('captures fill/stroke/effects presence', () => {
      const node = mockFrameNode({
        fills: [mockSolidPaint()],
        strokes: [mockSolidPaint()],
        effects: [mockDropShadowEffect()],
        children: [],
      });
      const result = analyzeNode(node);
      expect(result.hasFill).toBe(true);
      expect(result.hasStroke).toBe(true);
      expect(result.hasEffects).toBe(true);
    });

    it('captures layout mode', () => {
      const node = mockFrameNode({
        layoutMode: 'HORIZONTAL',
        children: [mockTextNode()],
      });
      const result = analyzeNode(node);
      expect(result.hasAutoLayout).toBe(true);
      expect(result.layoutMode).toBe('HORIZONTAL');
    });

    it('captures child count', () => {
      const node = mockFrameNode({
        children: [mockTextNode(), mockTextNode({ name: 'Text 2' })],
      });
      const result = analyzeNode(node);
      expect(result.childCount).toBe(2);
    });

    it('captures corner radius', () => {
      const node = mockFrameNode({ cornerRadius: 12, children: [] });
      const result = analyzeNode(node);
      expect(result.cornerRadius).toBe(12);
    });
  });

  // --- Token extraction ---
  describe('token extraction', () => {
    it('extracts colors from fills', () => {
      const node = mockRectangleNode({
        fills: [mockSolidPaint({ color: { r: 1, g: 0, b: 0 } })],
      });
      const result = analyzeNode(node);
      expect(result.tokens.colors.length).toBeGreaterThan(0);
    });

    it('extracts typography from text nodes', () => {
      const node = mockTextNode({ fontSize: 24, fontWeight: 700 });
      const result = analyzeNode(node);
      expect(result.tokens.typography).not.toBeNull();
      expect(result.tokens.typography!.fontSize).toBe(24);
      expect(result.tokens.typography!.fontWeight).toBe(700);
    });

    it('extracts spacing from frames with padding', () => {
      const node = mockFrameNode({
        paddingTop: 16,
        paddingRight: 24,
        paddingBottom: 16,
        paddingLeft: 24,
        itemSpacing: 12,
        children: [mockTextNode()],
      });
      const result = analyzeNode(node);
      expect(result.tokens.spacing).not.toBeNull();
      expect(result.tokens.spacing!.top).toBe(16);
      expect(result.tokens.spacing!.right).toBe(24);
      expect(result.tokens.spacing!.gap).toBe(12);
    });

    it('extracts border radius', () => {
      const node = mockFrameNode({ cornerRadius: 8, children: [] });
      const result = analyzeNode(node);
      expect(result.tokens.borderRadius).toBe(8);
    });

    it('extracts effects', () => {
      const node = mockFrameNode({
        effects: [mockDropShadowEffect()],
        children: [],
      });
      const result = analyzeNode(node);
      expect(result.tokens.effects.length).toBeGreaterThan(0);
    });
  });

  // --- Recursive children ---
  describe('recursive analysis', () => {
    it('analyzes children recursively', () => {
      const grandchild = mockTextNode({ name: 'Text 1', fontSize: 16, fontWeight: 400 });
      const child = mockFrameNode({
        name: 'Frame 2',
        children: [grandchild],
        fills: [],
        strokes: [],
        effects: [],
        cornerRadius: 0,
        layoutMode: 'NONE',
      });
      const root = mockFrameNode({
        name: 'Frame 1',
        width: 1200,
        children: [child],
      });
      const result = analyzeNode(root);
      expect(result.children).toHaveLength(1);
      expect(result.children[0].children).toHaveLength(1);
      expect(result.children[0].children[0].role).toBe('text');
    });

    it('tracks depth correctly', () => {
      const grandchild = mockTextNode({ name: 'Text 1' });
      const child = mockFrameNode({
        name: 'Frame 2',
        children: [grandchild],
        fills: [],
        strokes: [],
        effects: [],
        cornerRadius: 0,
        layoutMode: 'NONE',
      });
      const root = mockFrameNode({ name: 'Frame 1', width: 1200, children: [child] });
      const result = analyzeNode(root, 0);
      expect(result.depth).toBe(0);
      expect(result.children[0].depth).toBe(1);
      expect(result.children[0].children[0].depth).toBe(2);
    });
  });

  // --- Fingerprint on result ---
  describe('fingerprint', () => {
    it('populates fingerprint for container nodes with children', () => {
      const children = [
        mockTextNode({ name: 'Text 1', fontSize: 24, fontWeight: 700 }),
        mockTextNode({ name: 'Text 2', fontSize: 16, fontWeight: 400 }),
        mockRectangleNode({ name: 'Rectangle 1', fills: [mockImagePaint()] }),
      ];
      const node = mockFrameNode({
        name: 'Frame 1',
        width: 400,
        height: 300,
        children,
      });
      const result = analyzeNode(node);
      expect(result.fingerprint).not.toBeNull();
      expect(result.fingerprint!.total).toBe(3);
    });

    it('fingerprint is null for leaf nodes', () => {
      const node = mockTextNode({ name: 'Text 1' });
      const result = analyzeNode(node);
      expect(result.fingerprint).toBeNull();
    });
  });
});

describe('analyzeSelection', () => {
  it('returns empty array for empty selection', () => {
    const results = analyzeSelection([]);
    expect(results).toEqual([]);
  });

  it('analyzes multiple nodes', () => {
    const nodes = [
      mockTextNode({ name: 'Text 1', fontSize: 16, fontWeight: 400 }),
      mockRectangleNode({ name: 'Rectangle 1', fills: [mockImagePaint()] }),
      mockVectorNode({ name: 'Vector 1', width: 24, height: 24 }),
    ];
    const results = analyzeSelection(nodes);
    expect(results).toHaveLength(3);
    expect(results[0].role).toBe('text');
    expect(results[1].role).toBe('image');
    expect(results[2].role).toBe('icon');
  });

  it('all results start at depth 0', () => {
    const nodes = [
      mockTextNode({ name: 'Text 1' }),
      mockFrameNode({ name: 'Frame 1', width: 1200, children: [mockTextNode()] }),
    ];
    const results = analyzeSelection(nodes);
    expect(results[0].depth).toBe(0);
    expect(results[1].depth).toBe(0);
    expect(results[1].children[0].depth).toBe(1);
  });
});
