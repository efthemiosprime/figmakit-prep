import { describe, it, expect, vi } from 'vitest';
import { scanForRenaming, generateName, applyRenames } from '../../src/features/renamer';
import { analyzeNode } from '../../src/core/analyzer';
import {
  mockTextNode,
  mockFrameNode,
  mockRectangleNode,
  mockVectorNode,
  mockLineNode,
  mockComponentNode,
  mockSolidPaint,
  mockImagePaint,
} from '../helpers/figma-mock';

describe('generateName', () => {
  // --- Basic role-to-name ---
  it('returns "h1" for heading with fontSize >= 48', () => {
    const node = mockTextNode({ name: 'Frame 1', fontSize: 48, fontWeight: 700 });
    const result = analyzeNode(node);
    expect(generateName(result)).toBe('h1');
  });

  it('returns "h2" for heading with fontSize >= 36', () => {
    const node = mockTextNode({ name: 'Frame 1', fontSize: 36, fontWeight: 700 });
    const result = analyzeNode(node);
    expect(generateName(result)).toBe('h2');
  });

  it('returns "h3" for heading with fontSize >= 28', () => {
    const node = mockTextNode({ name: 'Frame 1', fontSize: 28, fontWeight: 600 });
    const result = analyzeNode(node);
    expect(generateName(result)).toBe('h3');
  });

  it('returns "text" for normal text', () => {
    const node = mockTextNode({ name: 'Frame 1', fontSize: 16, fontWeight: 400 });
    const result = analyzeNode(node);
    expect(generateName(result)).toBe('text');
  });

  it('returns "image" for image nodes', () => {
    const node = mockRectangleNode({ name: 'Rectangle 1', fills: [mockImagePaint()] });
    const result = analyzeNode(node);
    expect(generateName(result)).toBe('image');
  });

  it('returns "icon" for small vectors', () => {
    const node = mockVectorNode({ name: 'Vector 1', width: 24, height: 24 });
    const result = analyzeNode(node);
    expect(generateName(result)).toBe('icon');
  });

  it('returns "divider" for line nodes', () => {
    const node = mockLineNode({ name: 'Line 1' });
    const result = analyzeNode(node);
    expect(generateName(result)).toBe('divider');
  });

  it('returns "button" for button-like frames', () => {
    const node = mockFrameNode({
      name: 'Frame 1',
      width: 120, height: 44,
      layoutMode: 'HORIZONTAL',
      fills: [mockSolidPaint()],
      children: [mockTextNode({ characters: 'Click' })],
    });
    const result = analyzeNode(node);
    expect(generateName(result)).toBe('button');
  });

  it('returns "section" for wide containers', () => {
    const node = mockFrameNode({
      name: 'Frame 1',
      width: 1200, height: 600,
      layoutMode: 'VERTICAL',
      children: [mockTextNode()],
    });
    const result = analyzeNode(node);
    expect(generateName(result)).toBe('section');
  });

  it('returns null for already semantic names', () => {
    const node = mockTextNode({ name: 'button', fontSize: 16, fontWeight: 400 });
    const result = analyzeNode(node);
    expect(generateName(result)).toBeNull();
  });

  it('returns null for user-given names', () => {
    const node = mockTextNode({ name: 'my-custom-text', fontSize: 16, fontWeight: 400 });
    const result = analyzeNode(node);
    expect(generateName(result)).toBeNull();
  });

  // --- Parent-context-aware naming ---
  describe('parent context', () => {
    // Card children — matches FigmaKit WP fk_resolve_from_name_patterns()
    it('returns "card-header" for image inside a card (WP pattern: card-header → image)', () => {
      const node = mockRectangleNode({ name: 'Rectangle 1', fills: [mockImagePaint()] });
      const result = analyzeNode(node);
      expect(generateName(result, 'card')).toBe('card-header');
    });

    it('returns "card-title" for heading inside a card', () => {
      const node = mockTextNode({ name: 'Frame 1', fontSize: 24, fontWeight: 700 });
      const result = analyzeNode(node);
      expect(generateName(result, 'card')).toBe('card-title');
    });

    it('returns "card-body" for text inside a card (WP pattern: card-body → text)', () => {
      const node = mockTextNode({ name: 'Frame 1', fontSize: 16, fontWeight: 400 });
      const result = analyzeNode(node);
      expect(generateName(result, 'card')).toBe('card-body');
    });

    it('returns "card-cta" for button inside a card (WP pattern: card-cta → button)', () => {
      const node = mockFrameNode({
        name: 'Frame 1',
        width: 120, height: 44,
        layoutMode: 'HORIZONTAL',
        fills: [mockSolidPaint()],
        children: [mockTextNode({ characters: 'Click' })],
      });
      const result = analyzeNode(node);
      expect(generateName(result, 'card')).toBe('card-cta');
    });

    // Hero children
    it('returns "hero-title" for heading inside a hero', () => {
      const node = mockTextNode({ name: 'Frame 1', fontSize: 48, fontWeight: 700 });
      const result = analyzeNode(node);
      expect(generateName(result, 'hero')).toBe('hero-title');
    });

    it('returns "hero-description" for text inside a hero', () => {
      const node = mockTextNode({ name: 'Frame 1', fontSize: 16, fontWeight: 400 });
      const result = analyzeNode(node);
      expect(generateName(result, 'hero')).toBe('hero-description');
    });

    it('returns "hero-cta" for button inside a hero', () => {
      const node = mockFrameNode({
        name: 'Frame 1',
        width: 120, height: 44,
        layoutMode: 'HORIZONTAL',
        fills: [mockSolidPaint()],
        children: [mockTextNode({ characters: 'Click' })],
      });
      const result = analyzeNode(node);
      expect(generateName(result, 'hero')).toBe('hero-cta');
    });

    // Feature children
    it('returns "feature-icon" for icon inside a feature', () => {
      const node = mockVectorNode({ name: 'Vector 1', width: 24, height: 24 });
      const result = analyzeNode(node);
      expect(generateName(result, 'feature')).toBe('feature-icon');
    });

    it('returns "feature-title" for heading inside a feature', () => {
      const node = mockTextNode({ name: 'Frame 1', fontSize: 24, fontWeight: 700 });
      const result = analyzeNode(node);
      expect(generateName(result, 'feature')).toBe('feature-title');
    });

    // Testimonial children
    it('returns "testimonial-avatar" for image inside a testimonial', () => {
      const node = mockRectangleNode({ name: 'Rectangle 1', fills: [mockImagePaint()] });
      const result = analyzeNode(node);
      expect(generateName(result, 'testimonial')).toBe('testimonial-avatar');
    });

    it('returns "testimonial-quote" for text inside a testimonial', () => {
      const node = mockTextNode({ name: 'Frame 1', fontSize: 16, fontWeight: 400 });
      const result = analyzeNode(node);
      expect(generateName(result, 'testimonial')).toBe('testimonial-quote');
    });

    it('returns "testimonial-author" for heading inside a testimonial', () => {
      const node = mockTextNode({ name: 'Frame 1', fontSize: 24, fontWeight: 700 });
      const result = analyzeNode(node);
      expect(generateName(result, 'testimonial')).toBe('testimonial-author');
    });

    // CTA children
    it('returns "cta-button" for button inside cta', () => {
      const node = mockFrameNode({
        name: 'Frame 1',
        width: 120, height: 44,
        layoutMode: 'HORIZONTAL',
        fills: [mockSolidPaint()],
        children: [mockTextNode({ characters: 'Click' })],
      });
      const result = analyzeNode(node);
      expect(generateName(result, 'cta')).toBe('cta-button');
    });

    it('uses plain name when parent is not composite', () => {
      const node = mockTextNode({ name: 'Frame 1', fontSize: 16, fontWeight: 400 });
      const result = analyzeNode(node);
      expect(generateName(result, 'section')).toBe('text');
      expect(generateName(result, 'row')).toBe('text');
    });
  });
});

describe('scanForRenaming', () => {
  it('includes auto-named nodes with detected role', () => {
    const nodes = [
      mockTextNode({ name: 'Frame 1', fontSize: 16, fontWeight: 400 }),
      mockVectorNode({ name: 'Vector 1', width: 24, height: 24 }),
    ];
    const results = nodes.map(n => analyzeNode(n));
    const actions = scanForRenaming(results);
    expect(actions.length).toBeGreaterThanOrEqual(2);
    expect(actions[0].suggestedName).toBe('text');
    expect(actions[1].suggestedName).toBe('icon');
  });

  it('excludes user-named nodes', () => {
    const nodes = [
      mockTextNode({ name: 'my-label', fontSize: 16, fontWeight: 400 }),
    ];
    const results = nodes.map(n => analyzeNode(n));
    const actions = scanForRenaming(results);
    expect(actions).toHaveLength(0);
  });

  it('excludes already semantic-named nodes', () => {
    const nodes = [
      mockTextNode({ name: 'heading', fontSize: 48, fontWeight: 700 }),
    ];
    const results = nodes.map(n => analyzeNode(n));
    const actions = scanForRenaming(results);
    expect(actions).toHaveLength(0);
  });

  it('excludes COMPONENT type nodes', () => {
    const node = mockComponentNode({
      name: 'Frame 1',
      width: 120, height: 44,
      layoutMode: 'HORIZONTAL',
      fills: [mockSolidPaint()],
      children: [mockTextNode({ characters: 'Click' })],
    });
    const result = analyzeNode(node);
    const actions = scanForRenaming([result]);
    const topLevelActions = actions.filter(a => a.nodeId === node.id);
    expect(topLevelActions).toHaveLength(0);
  });

  it('renames card children with parent-prefixed names', () => {
    const children = [
      mockRectangleNode({ name: 'Rectangle 1', fills: [mockImagePaint()], width: 300, height: 200 }),
      mockTextNode({ name: 'Frame 21', fontSize: 24, fontWeight: 700 }),
      mockTextNode({ name: 'Frame 31', fontSize: 16, fontWeight: 400 }),
      mockFrameNode({
        name: 'Frame 41',
        width: 120, height: 44,
        layoutMode: 'HORIZONTAL',
        fills: [mockSolidPaint()],
        children: [mockTextNode({ name: 'Frame 51', characters: 'CTA' })],
      }),
    ];
    const card = mockFrameNode({
      name: 'Frame 61',
      width: 350, height: 450,
      layoutMode: 'VERTICAL',
      cornerRadius: 8,
      children,
    });
    const results = [analyzeNode(card)];
    const actions = scanForRenaming(results);

    const names = actions.map(a => a.suggestedName);
    expect(names).toContain('card');
    expect(names).toContain('card-header');  // image → card-header (matches WP pattern)
    expect(names).toContain('card-title');
    expect(names).toContain('card-body');   // text → card-body (matches WP pattern)
    expect(names).toContain('card-cta');    // button → card-cta (matches WP pattern)
  });

  it('renames hero children with parent-prefixed names', () => {
    const children = [
      mockTextNode({ name: 'Frame 10', fontSize: 48, fontWeight: 700 }),
      mockTextNode({ name: 'Frame 11', fontSize: 16, fontWeight: 400 }),
      mockFrameNode({
        name: 'Frame 12',
        width: 160, height: 48,
        layoutMode: 'HORIZONTAL',
        fills: [mockSolidPaint()],
        children: [mockTextNode({ name: 'Frame 13', characters: 'Go' })],
      }),
    ];
    const hero = mockFrameNode({
      name: 'Frame 1',
      width: 1200, height: 600,
      fills: [mockImagePaint()],
      children,
    });
    const results = [analyzeNode(hero)];
    const actions = scanForRenaming(results);

    const names = actions.map(a => a.suggestedName);
    expect(names).toContain('hero');
    expect(names).toContain('hero-title');
    expect(names).toContain('hero-description');
    expect(names).toContain('hero-cta');
  });

  it('gives same name to duplicate children (no index suffix)', () => {
    const children = [
      mockTextNode({ name: 'Frame 1', fontSize: 16, fontWeight: 400 }),
      mockTextNode({ name: 'Frame 2', fontSize: 16, fontWeight: 400 }),
    ];
    const card = mockFrameNode({
      name: 'Frame 61',
      width: 350, height: 450,
      layoutMode: 'VERTICAL',
      cornerRadius: 8,
      children: [
        mockRectangleNode({ name: 'Rectangle 1', fills: [mockImagePaint()], width: 300, height: 200 }),
        mockTextNode({ name: 'Frame 21', fontSize: 24, fontWeight: 700 }),
        ...children,
      ],
    });
    const results = [analyzeNode(card)];
    const actions = scanForRenaming(results);

    const bodyNames = actions.filter(a => a.suggestedName === 'card-body');
    expect(bodyNames.length).toBeGreaterThanOrEqual(2);
    // All get the same name — no -2, -3 suffix
    bodyNames.forEach(a => expect(a.suggestedName).toBe('card-body'));
  });

  it('does not prefix children of non-composite parents', () => {
    const child = mockTextNode({ name: 'Frame 2', fontSize: 16, fontWeight: 400 });
    const root = mockFrameNode({
      name: 'Frame 1',
      width: 1200,
      children: [child],
    });
    const results = [analyzeNode(root)];
    const actions = scanForRenaming(results);
    const childAction = actions.find(a => a.nodeId === child.id);
    expect(childAction).toBeDefined();
    expect(childAction!.suggestedName).toBe('text'); // plain, not prefixed
  });
});

describe('applyRenames', () => {
  it('sets node.name for each action', () => {
    const node1 = mockTextNode({ name: 'Frame 1', fontSize: 16, fontWeight: 400 });
    const node2 = mockVectorNode({ name: 'Vector 1', width: 24, height: 24 });

    const actions = [
      { nodeId: node1.id, node: node1, currentName: 'Frame 1', suggestedName: 'text', confidence: 90, source: 'type' as const },
      { nodeId: node2.id, node: node2, currentName: 'Vector 1', suggestedName: 'icon', confidence: 90, source: 'type' as const },
    ];

    const count = applyRenames(actions);
    expect(count).toBe(2);
    expect(node1.name).toBe('text');
    expect(node2.name).toBe('icon');
  });

  it('returns 0 for empty actions', () => {
    expect(applyRenames([])).toBe(0);
  });
});
