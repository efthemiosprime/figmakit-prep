import { describe, it, expect } from 'vitest';
import { classifyNode } from '../../src/core/classifier';
import {
  mockFrameNode,
  mockTextNode,
  mockRectangleNode,
  mockSolidPaint,
  mockDropShadowEffect,
} from '../helpers/figma-mock';

describe('classifier edge cases', () => {
  describe('decorative layers', () => {
    it('classifies "Button:shadow" as background-shape (skip)', () => {
      const node = mockFrameNode({
        name: 'Button:shadow',
        width: 120, height: 44,
        fills: [mockSolidPaint()],
        children: [],
      });
      const result = classifyNode(node);
      expect(result.role).toBe('background-shape');
    });

    it('classifies "shadow" as background-shape', () => {
      const node = mockRectangleNode({ name: 'shadow' });
      const result = classifyNode(node);
      expect(result.role).toBe('background-shape');
    });

    it('classifies "Card:border" as background-shape', () => {
      const node = mockRectangleNode({ name: 'Card:border' });
      const result = classifyNode(node);
      expect(result.role).toBe('background-shape');
    });

    it('classifies "overlay" as background-shape', () => {
      const node = mockRectangleNode({ name: 'overlay' });
      const result = classifyNode(node);
      expect(result.role).toBe('background-shape');
    });
  });

  describe('tightened button detection', () => {
    it('does NOT classify frame with effects (shadow) as button', () => {
      const text = mockTextNode({ characters: 'Click' });
      const node = mockFrameNode({
        name: 'Background+Border+Shadow',
        width: 120, height: 44,
        layoutMode: 'HORIZONTAL',
        fills: [mockSolidPaint()],
        effects: [mockDropShadowEffect()],
        children: [text],
      });
      const result = classifyNode(node);
      expect(result.role).not.toBe('button');
    });

    it('does NOT classify frame with non-text/non-icon children as button', () => {
      const text = mockTextNode({ characters: 'Click' });
      const bigChild = mockFrameNode({ name: 'inner', width: 200, height: 100, children: [] });
      const node = mockFrameNode({
        name: 'Frame 1',
        width: 300, height: 60,
        layoutMode: 'HORIZONTAL',
        fills: [mockSolidPaint()],
        children: [text, bigChild],
      });
      const result = classifyNode(node);
      expect(result.role).not.toBe('button');
    });

    it('still classifies proper button (text only) as button', () => {
      const text = mockTextNode({ characters: 'Click me' });
      const node = mockFrameNode({
        name: 'Frame 1',
        width: 120, height: 44,
        layoutMode: 'HORIZONTAL',
        fills: [mockSolidPaint()],
        children: [text],
      });
      const result = classifyNode(node);
      expect(result.role).toBe('button');
    });
  });
});
