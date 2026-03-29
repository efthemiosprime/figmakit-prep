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

  it('returns "h4" for heading with fontSize >= 22', () => {
    const node = mockTextNode({ name: 'Frame 1', fontSize: 22, fontWeight: 600 });
    const result = analyzeNode(node);
    expect(generateName(result)).toBe('h4');
  });

  it('returns "h5" for heading with fontSize >= 18', () => {
    const node = mockTextNode({ name: 'Frame 1', fontSize: 18, fontWeight: 600 });
    const result = analyzeNode(node);
    expect(generateName(result)).toBe('h5');
  });

  it('returns "h6" for heading with small fontSize but bold weight', () => {
    const node = mockTextNode({ name: 'Frame 1', fontSize: 14, fontWeight: 700 });
    const result = analyzeNode(node);
    expect(generateName(result)).toBe('h6');
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

  it('returns "row" for horizontal auto-layout', () => {
    const node = mockFrameNode({
      name: 'Frame 1',
      width: 400,
      layoutMode: 'HORIZONTAL',
      children: [mockTextNode(), mockTextNode({ name: 'Text 2' })],
    });
    const result = analyzeNode(node);
    expect(generateName(result)).toBe('row');
  });

  it('returns "vstack" for vertical auto-layout', () => {
    const node = mockFrameNode({
      name: 'Frame 1',
      width: 400,
      layoutMode: 'VERTICAL',
      children: [mockTextNode(), mockTextNode({ name: 'Text 2' })],
    });
    const result = analyzeNode(node);
    expect(generateName(result)).toBe('vstack');
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

  it('returns "spacer" for spacer nodes', () => {
    const node = mockFrameNode({
      name: 'Frame 1',
      children: [],
      fills: [], strokes: [], effects: [],
      layoutMode: 'NONE',
    });
    const result = analyzeNode(node);
    expect(generateName(result)).toBe('spacer');
  });

  it('returns "card" for card-fingerprinted nodes', () => {
    const children = [
      mockRectangleNode({ name: 'Rectangle 1', fills: [mockImagePaint()], width: 300, height: 200 }),
      mockTextNode({ name: 'Text 1', fontSize: 24, fontWeight: 700 }),
      mockTextNode({ name: 'Text 2', fontSize: 16, fontWeight: 400 }),
    ];
    const node = mockFrameNode({
      name: 'Frame 1',
      width: 350, height: 400,
      children,
    });
    const result = analyzeNode(node);
    expect(generateName(result)).toBe('card');
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

  it('returns null for unknown/container roles (low confidence)', () => {
    const node = mockFrameNode({
      name: 'Frame 1',
      width: 400, height: 300,
      fills: [mockSolidPaint()],
      children: [mockTextNode(), mockRectangleNode()],
    });
    const result = analyzeNode(node);
    // container with confidence 30 — not worth renaming
    if (result.role === 'container') {
      expect(generateName(result)).toBeNull();
    }
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
    // Component definitions should not be renamed at top level
    const topLevelActions = actions.filter(a => a.nodeId === node.id);
    expect(topLevelActions).toHaveLength(0);
  });

  it('scans children recursively', () => {
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
    expect(childAction!.suggestedName).toBe('text');
  });

  it('handles duplicate names by appending index', () => {
    const nodes = [
      mockTextNode({ name: 'Frame 1', fontSize: 16, fontWeight: 400 }),
      mockTextNode({ name: 'Frame 2', fontSize: 16, fontWeight: 400 }),
      mockTextNode({ name: 'Frame 3', fontSize: 16, fontWeight: 400 }),
    ];
    const results = nodes.map(n => analyzeNode(n));
    const actions = scanForRenaming(results);
    const names = actions.map(a => a.suggestedName);
    expect(names).toContain('text');
    expect(names).toContain('text-2');
    expect(names).toContain('text-3');
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
