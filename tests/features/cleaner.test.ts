import { describe, it, expect, vi } from 'vitest';
import { scanForCleaning, applyClean, flattenWrapper } from '../../src/features/cleaner';
import { analyzeNode } from '../../src/core/analyzer';
import {
  mockTextNode,
  mockFrameNode,
  mockRectangleNode,
  mockSolidPaint,
  mockDropShadowEffect,
} from '../helpers/figma-mock';

describe('scanForCleaning', () => {
  it('puts hidden nodes in removable', () => {
    const node = mockFrameNode({
      visible: false,
      children: [mockTextNode()],
    });
    const result = analyzeNode(node);
    const scan = scanForCleaning([result]);
    expect(scan.removable).toHaveLength(1);
    expect(scan.removable[0].id).toBe(node.id);
  });

  it('puts zero-opacity nodes in removable', () => {
    const node = mockFrameNode({
      opacity: 0,
      children: [mockTextNode()],
    });
    const result = analyzeNode(node);
    const scan = scanForCleaning([result]);
    expect(scan.removable).toHaveLength(1);
  });

  it('puts empty frames (no fill/stroke/effects) in removable', () => {
    const node = mockFrameNode({
      children: [],
      fills: [],
      strokes: [],
      effects: [],
    });
    const result = analyzeNode(node);
    const scan = scanForCleaning([result]);
    expect(scan.removable).toHaveLength(1);
  });

  it('puts single-child wrappers in flattenable', () => {
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
    const scan = scanForCleaning([result]);
    expect(scan.flattenable).toHaveLength(1);
    expect(scan.flattenable[0].id).toBe(node.id);
  });

  it('puts normal visible nodes in safe', () => {
    const node = mockFrameNode({
      children: [mockTextNode()],
      fills: [mockSolidPaint()],
    });
    const result = analyzeNode(node);
    const scan = scanForCleaning([result]);
    // Both the frame and its text child are safe (recursive)
    expect(scan.safe).toHaveLength(2);
    expect(scan.removable).toHaveLength(0);
    expect(scan.flattenable).toHaveLength(0);
  });

  it('scans nested children recursively', () => {
    const hiddenChild = mockFrameNode({
      name: 'Hidden',
      visible: false,
      children: [mockTextNode()],
    });
    const emptyChild = mockFrameNode({
      name: 'Empty',
      children: [],
      fills: [],
      strokes: [],
      effects: [],
    });
    const normalChild = mockTextNode({ name: 'Visible text' });

    const root = mockFrameNode({
      name: 'Root',
      width: 1200,
      children: [hiddenChild, emptyChild, normalChild],
      fills: [mockSolidPaint()],
    });
    const result = analyzeNode(root);
    const scan = scanForCleaning([result]);

    // Root is safe (has fill + children), hiddenChild removable, emptyChild removable, normalChild safe
    expect(scan.removable.length).toBeGreaterThanOrEqual(2);
  });

  it('returns correct counts for mixed results', () => {
    const hidden = mockFrameNode({ visible: false, children: [mockTextNode()] });
    const wrapper = mockFrameNode({
      children: [mockTextNode({ name: 'inner' })],
      fills: [], strokes: [], effects: [],
      cornerRadius: 0, layoutMode: 'NONE',
      paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
    });
    const normal = mockFrameNode({
      children: [mockTextNode()],
      fills: [mockSolidPaint()],
    });

    const results = [hidden, wrapper, normal].map(n => analyzeNode(n));
    const scan = scanForCleaning(results);

    expect(scan.removable.length).toBeGreaterThanOrEqual(1);
    expect(scan.flattenable.length).toBeGreaterThanOrEqual(1);
    expect(scan.safe.length).toBeGreaterThanOrEqual(1);
  });

  it('handles empty results array', () => {
    const scan = scanForCleaning([]);
    expect(scan.removable).toHaveLength(0);
    expect(scan.flattenable).toHaveLength(0);
    expect(scan.safe).toHaveLength(0);
  });
});

describe('flattenWrapper', () => {
  it('moves child to parent at wrapper index and removes wrapper', () => {
    const child = mockTextNode({ name: 'inner', x: 10, y: 20 });
    const wrapper = mockFrameNode({
      name: 'Wrapper',
      x: 50,
      y: 100,
      children: [child],
      fills: [], strokes: [], effects: [],
      cornerRadius: 0, layoutMode: 'NONE',
    });
    const sibling = mockTextNode({ name: 'sibling' });
    const parent = mockFrameNode({
      name: 'Parent',
      children: [sibling, wrapper],
    });

    // Add remove and insertChild mocks
    const removedNodes: any[] = [];
    wrapper.remove = vi.fn(() => { removedNodes.push(wrapper); });
    parent.insertChild = vi.fn((index: number, node: any) => {
      parent.children.splice(index, 0, node);
    });

    // Find wrapper index in parent
    const wrapperIndex = parent.children.indexOf(wrapper);

    flattenWrapper(wrapper);

    // Child position should be offset by wrapper's position
    expect(child.x).toBe(60); // 10 + 50
    expect(child.y).toBe(120); // 20 + 100
    // Parent should have insertChild called
    expect(parent.insertChild).toHaveBeenCalledWith(wrapperIndex, child);
    // Wrapper should be removed
    expect(wrapper.remove).toHaveBeenCalled();
  });

  it('does nothing if wrapper has no parent', () => {
    const child = mockTextNode({ name: 'inner' });
    const wrapper = mockFrameNode({
      name: 'Wrapper',
      children: [child],
      fills: [], strokes: [], effects: [],
    });
    wrapper.parent = null;
    wrapper.remove = vi.fn();

    // Should not throw
    flattenWrapper(wrapper);
    expect(wrapper.remove).not.toHaveBeenCalled();
  });

  it('does nothing if wrapper has no children', () => {
    const parent = mockFrameNode({ name: 'Parent', children: [] });
    const wrapper = mockFrameNode({
      name: 'Wrapper',
      children: [],
      fills: [], strokes: [], effects: [],
    });
    wrapper.parent = parent;
    wrapper.remove = vi.fn();

    flattenWrapper(wrapper);
    expect(wrapper.remove).not.toHaveBeenCalled();
  });
});

describe('applyClean', () => {
  it('removes nodes marked for removal', () => {
    const node1 = mockFrameNode({ visible: false, children: [mockTextNode()] });
    const node2 = mockFrameNode({ opacity: 0, children: [mockTextNode()] });
    node1.remove = vi.fn();
    node2.remove = vi.fn();

    const actions = [
      { nodeId: node1.id, node: node1, action: 'remove' as const, reason: 'hidden' },
      { nodeId: node2.id, node: node2, action: 'remove' as const, reason: 'zero-opacity' },
    ];

    const result = applyClean(actions);
    expect(node1.remove).toHaveBeenCalled();
    expect(node2.remove).toHaveBeenCalled();
    expect(result.removed).toBe(2);
    expect(result.flattened).toBe(0);
  });

  it('flattens nodes marked for flattening', () => {
    const child = mockTextNode({ name: 'inner', x: 0, y: 0 });
    const wrapper = mockFrameNode({
      name: 'Wrapper',
      x: 10,
      y: 20,
      children: [child],
      fills: [], strokes: [], effects: [],
    });
    const parent = mockFrameNode({
      name: 'Parent',
      children: [wrapper],
    });
    wrapper.remove = vi.fn();
    parent.insertChild = vi.fn((index: number, node: any) => {
      parent.children.splice(index, 0, node);
    });

    const actions = [
      { nodeId: wrapper.id, node: wrapper, action: 'flatten' as const, reason: 'passthrough-wrapper' },
    ];

    const result = applyClean(actions);
    expect(result.flattened).toBe(1);
    expect(result.removed).toBe(0);
  });

  it('returns zeros for empty actions', () => {
    const result = applyClean([]);
    expect(result.removed).toBe(0);
    expect(result.flattened).toBe(0);
  });

  it('handles mixed remove and flatten actions', () => {
    const hidden = mockFrameNode({ visible: false, children: [mockTextNode()] });
    hidden.remove = vi.fn();

    const child = mockTextNode({ name: 'inner', x: 0, y: 0 });
    const wrapper = mockFrameNode({
      name: 'Wrapper',
      x: 5,
      y: 5,
      children: [child],
      fills: [], strokes: [], effects: [],
    });
    const parent = mockFrameNode({
      name: 'Parent',
      children: [wrapper],
    });
    wrapper.remove = vi.fn();
    parent.insertChild = vi.fn((index: number, node: any) => {
      parent.children.splice(index, 0, node);
    });

    const actions = [
      { nodeId: hidden.id, node: hidden, action: 'remove' as const, reason: 'hidden' },
      { nodeId: wrapper.id, node: wrapper, action: 'flatten' as const, reason: 'passthrough-wrapper' },
    ];

    const result = applyClean(actions);
    expect(result.removed).toBe(1);
    expect(result.flattened).toBe(1);
  });
});
