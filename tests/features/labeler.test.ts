import { describe, it, expect, vi } from 'vitest';
import {
  formatLabel,
  applyLabel,
  removeLabel,
  hasLabel,
  batchLabel,
} from '../../src/features/labeler';
import { analyzeNode } from '../../src/core/analyzer';
import {
  mockTextNode,
  mockFrameNode,
  mockVectorNode,
  mockRectangleNode,
  mockSolidPaint,
  mockImagePaint,
} from '../helpers/figma-mock';

describe('formatLabel', () => {
  it('formats card role as [fk:card]', () => {
    expect(formatLabel('card')).toBe('[fk:card]');
  });

  it('formats hero role as [fk:hero]', () => {
    expect(formatLabel('hero')).toBe('[fk:hero]');
  });

  it('formats button role as [fk:button]', () => {
    expect(formatLabel('button')).toBe('[fk:button]');
  });

  it('formats heading role as [fk:heading]', () => {
    expect(formatLabel('heading')).toBe('[fk:heading]');
  });

  it('formats text role as [fk:text]', () => {
    expect(formatLabel('text')).toBe('[fk:text]');
  });

  it('formats accordion role', () => {
    expect(formatLabel('accordion')).toBe('[fk:accordion]');
  });

  it('formats tabs role', () => {
    expect(formatLabel('tabs')).toBe('[fk:tabs]');
  });

  it('formats modal role', () => {
    expect(formatLabel('modal')).toBe('[fk:modal]');
  });

  it('returns null for unknown role', () => {
    expect(formatLabel('unknown')).toBeNull();
  });

  it('returns null for container role', () => {
    expect(formatLabel('container')).toBeNull();
  });
});

describe('applyLabel', () => {
  it('adds prefix to node name in prefix mode', () => {
    const node = mockTextNode({ name: 'Product Card' });
    applyLabel(node, 'card', 'prefix');
    expect(node.name).toBe('[fk:card] Product Card');
  });

  it('sets plugin data in pluginData mode', () => {
    const node = mockTextNode({ name: 'Product Card' });
    node.setPluginData = vi.fn();
    applyLabel(node, 'card', 'pluginData');
    expect(node.setPluginData).toHaveBeenCalledWith('fk-type', 'card');
    expect(node.name).toBe('Product Card'); // name unchanged
  });

  it('does both in both mode', () => {
    const node = mockTextNode({ name: 'Banner' });
    node.setPluginData = vi.fn();
    applyLabel(node, 'hero', 'both');
    expect(node.name).toBe('[fk:hero] Banner');
    expect(node.setPluginData).toHaveBeenCalledWith('fk-type', 'hero');
  });

  it('does not double-prefix if already labeled', () => {
    const node = mockTextNode({ name: '[fk:card] Product Card' });
    applyLabel(node, 'card', 'prefix');
    expect(node.name).toBe('[fk:card] Product Card');
  });

  it('replaces existing label with new one', () => {
    const node = mockTextNode({ name: '[fk:text] Product Card' });
    applyLabel(node, 'card', 'prefix');
    expect(node.name).toBe('[fk:card] Product Card');
  });
});

describe('removeLabel', () => {
  it('removes [fk:type] prefix from name', () => {
    const node = mockTextNode({ name: '[fk:card] Product Card' });
    node.setPluginData = vi.fn();
    removeLabel(node);
    expect(node.name).toBe('Product Card');
  });

  it('removes plugin data', () => {
    const node = mockTextNode({ name: 'Product Card' });
    node.setPluginData = vi.fn();
    removeLabel(node);
    expect(node.setPluginData).toHaveBeenCalledWith('fk-type', '');
  });

  it('handles node without prefix gracefully', () => {
    const node = mockTextNode({ name: 'Normal Name' });
    node.setPluginData = vi.fn();
    removeLabel(node);
    expect(node.name).toBe('Normal Name');
  });
});

describe('hasLabel', () => {
  it('returns true for [fk:card] prefix', () => {
    const node = mockTextNode({ name: '[fk:card] Product Card' });
    expect(hasLabel(node)).toBe(true);
  });

  it('returns true for [fk:hero] prefix', () => {
    const node = mockTextNode({ name: '[fk:hero] Banner' });
    expect(hasLabel(node)).toBe(true);
  });

  it('returns false for no prefix', () => {
    const node = mockTextNode({ name: 'Product Card' });
    expect(hasLabel(node)).toBe(false);
  });

  it('returns false for partial match', () => {
    const node = mockTextNode({ name: '[fk: Card' });
    expect(hasLabel(node)).toBe(false);
  });
});

describe('batchLabel', () => {
  it('labels all analyzed nodes based on their role', () => {
    const nodes = [
      mockTextNode({ name: 'Frame 1', fontSize: 16, fontWeight: 400 }),
      mockVectorNode({ name: 'Vector 1', width: 24, height: 24 }),
      mockRectangleNode({ name: 'Rectangle 1', fills: [mockImagePaint()] }),
    ];
    const results = nodes.map(n => analyzeNode(n));
    const count = batchLabel(results, 'prefix');
    expect(count).toBeGreaterThanOrEqual(3);
    expect(nodes[0].name).toBe('[fk:text] Frame 1');
    expect(nodes[1].name).toBe('[fk:icon] Vector 1');
    expect(nodes[2].name).toBe('[fk:image] Rectangle 1');
  });

  it('skips unknown/container roles', () => {
    const node = mockFrameNode({
      name: 'Frame 1',
      width: 400, height: 300,
      fills: [mockSolidPaint()],
      children: [mockTextNode(), mockRectangleNode()],
    });
    const result = analyzeNode(node);
    // Only count top-level node (container/unknown should be skipped)
    const countBefore = node.name;
    batchLabel([result], 'prefix');
    if (result.role === 'container' || result.role === 'unknown') {
      expect(node.name).toBe(countBefore); // unchanged
    }
  });

  it('labels children recursively', () => {
    const child = mockTextNode({ name: 'Frame 2', fontSize: 16, fontWeight: 400 });
    const root = mockFrameNode({
      name: 'Frame 1',
      width: 1200,
      children: [child],
    });
    const result = analyzeNode(root);
    batchLabel([result], 'prefix');
    expect(child.name).toContain('[fk:text]');
  });

  it('returns 0 for empty results', () => {
    expect(batchLabel([], 'prefix')).toBe(0);
  });
});
