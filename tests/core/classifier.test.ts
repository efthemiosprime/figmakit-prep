import { describe, it, expect } from 'vitest';
import { classifyNode } from '../../src/core/classifier';
import {
  mockTextNode,
  mockFrameNode,
  mockRectangleNode,
  mockLineNode,
  mockVectorNode,
  mockBooleanOperationNode,
  mockGroupNode,
  mockEllipseNode,
  mockStarNode,
  mockPolygonNode,
  mockImagePaint,
  mockSolidPaint,
  mockDropShadowEffect,
} from '../helpers/figma-mock';

describe('classifyNode', () => {
  // --- TEXT NODES ---
  describe('text nodes', () => {
    it('classifies large text (fs >= 48) as heading', () => {
      const node = mockTextNode({ fontSize: 48, fontWeight: 700 });
      const result = classifyNode(node);
      expect(result.role).toBe('heading');
      expect(result.confidence).toBe(90);
      expect(result.source).toBe('type');
    });

    it('classifies medium-large text (fs >= 36) as heading', () => {
      const node = mockTextNode({ fontSize: 36, fontWeight: 500 });
      const result = classifyNode(node);
      expect(result.role).toBe('heading');
    });

    it('classifies text with fs >= 24 as heading', () => {
      const node = mockTextNode({ fontSize: 24, fontWeight: 400 });
      const result = classifyNode(node);
      expect(result.role).toBe('heading');
    });

    it('classifies text with fw >= 600 as heading (regardless of size)', () => {
      const node = mockTextNode({ fontSize: 14, fontWeight: 700 });
      const result = classifyNode(node);
      expect(result.role).toBe('heading');
    });

    it('classifies text with fw = 600 as heading', () => {
      const node = mockTextNode({ fontSize: 14, fontWeight: 600 });
      const result = classifyNode(node);
      expect(result.role).toBe('heading');
    });

    it('classifies normal body text as text', () => {
      const node = mockTextNode({ fontSize: 16, fontWeight: 400 });
      const result = classifyNode(node);
      expect(result.role).toBe('text');
      expect(result.confidence).toBe(90);
      expect(result.source).toBe('type');
    });

    it('classifies small text as text', () => {
      const node = mockTextNode({ fontSize: 12, fontWeight: 400 });
      const result = classifyNode(node);
      expect(result.role).toBe('text');
    });

    it('classifies text with fw = 500 and fs < 24 as text (not heading)', () => {
      const node = mockTextNode({ fontSize: 16, fontWeight: 500 });
      const result = classifyNode(node);
      expect(result.role).toBe('text');
    });
  });

  // --- IMAGE DETECTION ---
  describe('image detection', () => {
    it('classifies frame with IMAGE fill as image', () => {
      const node = mockFrameNode({ fills: [mockImagePaint()] });
      const result = classifyNode(node);
      expect(result.role).toBe('image');
      expect(result.confidence).toBe(90);
      expect(result.source).toBe('type');
    });

    it('classifies rectangle with IMAGE fill as image', () => {
      const node = mockRectangleNode({ fills: [mockImagePaint()] });
      const result = classifyNode(node);
      expect(result.role).toBe('image');
    });

    it('does not classify frame with only solid fill as image', () => {
      const node = mockFrameNode({ fills: [mockSolidPaint()] });
      const result = classifyNode(node);
      expect(result.role).not.toBe('image');
    });

    it('detects image fill even with mixed fills', () => {
      const node = mockRectangleNode({
        fills: [mockSolidPaint(), mockImagePaint()],
      });
      const result = classifyNode(node);
      expect(result.role).toBe('image');
    });
  });

  // --- ICON DETECTION ---
  describe('icon detection', () => {
    it('classifies small vector (32x32) as icon', () => {
      const node = mockVectorNode({ width: 32, height: 32 });
      const result = classifyNode(node);
      expect(result.role).toBe('icon');
      expect(result.confidence).toBe(90);
      expect(result.source).toBe('type');
    });

    it('classifies small boolean operation as icon', () => {
      const node = mockBooleanOperationNode({ width: 48, height: 48 });
      const result = classifyNode(node);
      expect(result.role).toBe('icon');
    });

    it('classifies 64x64 vector as icon (at boundary)', () => {
      const node = mockVectorNode({ width: 64, height: 64 });
      const result = classifyNode(node);
      expect(result.role).toBe('icon');
    });

    it('does NOT classify large vector (> 64px) as icon', () => {
      const node = mockVectorNode({ width: 100, height: 100 });
      const result = classifyNode(node);
      expect(result.role).not.toBe('icon');
    });

    it('classifies small star as icon', () => {
      const node = mockStarNode({ width: 24, height: 24 });
      const result = classifyNode(node);
      expect(result.role).toBe('icon');
    });

    it('classifies small polygon as icon', () => {
      const node = mockPolygonNode({ width: 16, height: 16 });
      const result = classifyNode(node);
      expect(result.role).toBe('icon');
    });

    it('classifies small ellipse as icon', () => {
      const node = mockEllipseNode({ width: 24, height: 24 });
      const result = classifyNode(node);
      expect(result.role).toBe('icon');
    });
  });

  // --- DIVIDER DETECTION ---
  describe('divider detection', () => {
    it('classifies LINE node as divider', () => {
      const node = mockLineNode();
      const result = classifyNode(node);
      expect(result.role).toBe('divider');
      expect(result.confidence).toBe(90);
      expect(result.source).toBe('type');
    });

    it('classifies thin horizontal rectangle (h <= 4) as divider', () => {
      const node = mockRectangleNode({ width: 200, height: 2 });
      const result = classifyNode(node);
      expect(result.role).toBe('divider');
    });

    it('classifies thin vertical rectangle (w <= 4) as divider', () => {
      const node = mockRectangleNode({ width: 2, height: 200 });
      const result = classifyNode(node);
      expect(result.role).toBe('divider');
    });

    it('classifies rectangle at 4px boundary as divider', () => {
      const node = mockRectangleNode({ width: 200, height: 4 });
      const result = classifyNode(node);
      expect(result.role).toBe('divider');
    });

    it('does NOT classify thick rectangle as divider', () => {
      const node = mockRectangleNode({ width: 200, height: 10 });
      const result = classifyNode(node);
      expect(result.role).not.toBe('divider');
    });

    it('does NOT classify small square as divider (aspect ratio < 5:1)', () => {
      const node = mockRectangleNode({ width: 4, height: 4 });
      const result = classifyNode(node);
      expect(result.role).not.toBe('divider');
    });
  });

  // --- BUTTON DETECTION ---
  describe('button detection', () => {
    it('classifies small auto-layout frame with fill and text child as button', () => {
      const text = mockTextNode({ name: 'Label', characters: 'Click me' });
      const node = mockFrameNode({
        name: 'Frame 1',
        width: 120,
        height: 44,
        layoutMode: 'HORIZONTAL',
        fills: [mockSolidPaint()],
        children: [text],
      });
      const result = classifyNode(node);
      expect(result.role).toBe('button');
      expect(result.confidence).toBe(85);
      expect(result.source).toBe('type');
    });

    it('classifies button with 2 children (icon + text) as button', () => {
      const icon = mockVectorNode({ width: 16, height: 16 });
      const text = mockTextNode({ characters: 'Submit' });
      const node = mockFrameNode({
        width: 140,
        height: 40,
        layoutMode: 'HORIZONTAL',
        fills: [mockSolidPaint()],
        children: [icon, text],
      });
      const result = classifyNode(node);
      expect(result.role).toBe('button');
    });

    it('does NOT classify frame without fill as button', () => {
      const text = mockTextNode({ characters: 'Click' });
      const node = mockFrameNode({
        width: 120,
        height: 44,
        layoutMode: 'HORIZONTAL',
        fills: [],
        children: [text],
      });
      const result = classifyNode(node);
      expect(result.role).not.toBe('button');
    });

    it('does NOT classify frame without auto-layout as button', () => {
      const text = mockTextNode({ characters: 'Click' });
      const node = mockFrameNode({
        width: 120,
        height: 44,
        layoutMode: 'NONE',
        fills: [mockSolidPaint()],
        children: [text],
      });
      const result = classifyNode(node);
      expect(result.role).not.toBe('button');
    });

    it('does NOT classify too-tall frame as button (h > 80)', () => {
      const text = mockTextNode({ characters: 'Click' });
      const node = mockFrameNode({
        width: 120,
        height: 100,
        layoutMode: 'HORIZONTAL',
        fills: [mockSolidPaint()],
        children: [text],
      });
      const result = classifyNode(node);
      expect(result.role).not.toBe('button');
    });

    it('does NOT classify too-wide frame as button (w > 400)', () => {
      const text = mockTextNode({ characters: 'Click' });
      const node = mockFrameNode({
        width: 500,
        height: 44,
        layoutMode: 'HORIZONTAL',
        fills: [mockSolidPaint()],
        children: [text],
      });
      const result = classifyNode(node);
      expect(result.role).not.toBe('button');
    });

    it('does NOT classify frame with > 3 children as button', () => {
      const children = Array.from({ length: 4 }, (_, i) =>
        mockTextNode({ name: `Text ${i}`, characters: `Item ${i}` })
      );
      const node = mockFrameNode({
        width: 200,
        height: 44,
        layoutMode: 'HORIZONTAL',
        fills: [mockSolidPaint()],
        children,
      });
      const result = classifyNode(node);
      expect(result.role).not.toBe('button');
    });
  });

  // --- SPACER DETECTION ---
  describe('spacer detection', () => {
    it('classifies empty frame with no fills as spacer', () => {
      const node = mockFrameNode({
        children: [],
        fills: [],
        strokes: [],
        effects: [],
        layoutMode: 'NONE',
      });
      const result = classifyNode(node);
      expect(result.role).toBe('spacer');
      expect(result.confidence).toBe(85);
    });

    it('does NOT classify empty frame with fill as spacer', () => {
      const node = mockFrameNode({
        children: [],
        fills: [mockSolidPaint()],
      });
      const result = classifyNode(node);
      expect(result.role).not.toBe('spacer');
    });
  });

  // --- WRAPPER DETECTION ---
  describe('wrapper detection', () => {
    it('classifies single-child frame with no visual props as wrapper', () => {
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
      const result = classifyNode(node);
      expect(result.role).toBe('wrapper');
      expect(result.confidence).toBe(85);
    });

    it('does NOT classify single-child frame with fill as wrapper', () => {
      const child = mockTextNode({ characters: 'Hello' });
      const node = mockFrameNode({
        children: [child],
        fills: [mockSolidPaint()],
      });
      const result = classifyNode(node);
      expect(result.role).not.toBe('wrapper');
    });

    it('does NOT classify single-child frame with corner radius as wrapper', () => {
      const child = mockTextNode({ characters: 'Hello' });
      const node = mockFrameNode({
        children: [child],
        fills: [],
        strokes: [],
        effects: [],
        cornerRadius: 8,
      });
      const result = classifyNode(node);
      expect(result.role).not.toBe('wrapper');
    });

    it('does NOT classify single-child frame with auto-layout as wrapper', () => {
      const child = mockTextNode({ characters: 'Hello' });
      const node = mockFrameNode({
        children: [child],
        fills: [],
        strokes: [],
        effects: [],
        cornerRadius: 0,
        layoutMode: 'HORIZONTAL',
      });
      const result = classifyNode(node);
      expect(result.role).not.toBe('wrapper');
    });

    it('does NOT classify single-child frame with padding as wrapper', () => {
      const child = mockTextNode({ characters: 'Hello' });
      const node = mockFrameNode({
        children: [child],
        fills: [],
        strokes: [],
        effects: [],
        cornerRadius: 0,
        layoutMode: 'NONE',
        paddingTop: 16,
      });
      const result = classifyNode(node);
      expect(result.role).not.toBe('wrapper');
    });
  });

  // --- SECTION DETECTION ---
  describe('section detection', () => {
    it('classifies wide vertical frame (>= 900px) as section', () => {
      const child = mockFrameNode({ name: 'Inner', width: 800 });
      const node = mockFrameNode({
        width: 1200,
        height: 600,
        layoutMode: 'VERTICAL',
        children: [child],
      });
      const result = classifyNode(node);
      expect(result.role).toBe('section');
      expect(result.confidence).toBe(85);
    });

    it('classifies wide frame without auto-layout as section', () => {
      const children = [
        mockFrameNode({ name: 'Inner 1' }),
        mockFrameNode({ name: 'Inner 2' }),
      ];
      const node = mockFrameNode({
        width: 1440,
        height: 800,
        layoutMode: 'NONE',
        children,
      });
      const result = classifyNode(node);
      expect(result.role).toBe('section');
    });

    it('does NOT classify narrow frame as section', () => {
      const child = mockTextNode({ characters: 'Hello' });
      const node = mockFrameNode({
        width: 400,
        height: 600,
        layoutMode: 'VERTICAL',
        children: [child],
      });
      const result = classifyNode(node);
      expect(result.role).not.toBe('section');
    });
  });

  // --- FLEX LAYOUT DETECTION ---
  describe('flex layout detection', () => {
    it('classifies horizontal auto-layout frame as flex-row', () => {
      const children = [
        mockTextNode({ characters: 'A' }),
        mockTextNode({ characters: 'B' }),
      ];
      const node = mockFrameNode({
        width: 400,
        layoutMode: 'HORIZONTAL',
        children,
      });
      const result = classifyNode(node);
      expect(result.role).toBe('flex-row');
      expect(result.confidence).toBe(85);
      expect(result.source).toBe('type');
    });

    it('classifies vertical auto-layout frame as flex-col', () => {
      const children = [
        mockTextNode({ characters: 'A' }),
        mockTextNode({ characters: 'B' }),
      ];
      const node = mockFrameNode({
        width: 400,
        layoutMode: 'VERTICAL',
        children,
      });
      const result = classifyNode(node);
      expect(result.role).toBe('flex-col');
      expect(result.confidence).toBe(85);
    });
  });

  // --- DEFAULT / FALLBACK ---
  describe('default classification', () => {
    it('classifies frame with no distinguishing features as container', () => {
      const children = [
        mockTextNode({ characters: 'A' }),
        mockRectangleNode(),
      ];
      const node = mockFrameNode({
        width: 400,
        height: 300,
        layoutMode: 'NONE',
        fills: [mockSolidPaint()],
        children,
      });
      const result = classifyNode(node);
      expect(result.role).toBe('container');
      expect(result.confidence).toBe(30);
      expect(result.source).toBe('default');
    });

    it('classifies group node as container', () => {
      const children = [
        mockTextNode({ characters: 'A' }),
        mockRectangleNode(),
      ];
      const node = mockGroupNode({ children });
      const result = classifyNode(node);
      expect(result.role).toBe('container');
      expect(result.confidence).toBe(30);
      expect(result.source).toBe('default');
    });

    it('classifies large ellipse (not icon-sized) with fill via default', () => {
      const node = mockEllipseNode({ width: 200, height: 200 });
      const result = classifyNode(node);
      // Large shape nodes without image fill go to default
      expect(result.confidence).toBe(30);
    });
  });

  // --- EDGE CASES ---
  describe('edge cases', () => {
    it('image fill takes priority over icon size for small frames', () => {
      const node = mockRectangleNode({
        width: 32,
        height: 32,
        fills: [mockImagePaint()],
      });
      const result = classifyNode(node);
      // Image fill detected first in priority chain
      expect(result.role).toBe('image');
    });

    it('button detection takes priority over flex-row for small auto-layout with fill', () => {
      const text = mockTextNode({ characters: 'Go' });
      const node = mockFrameNode({
        width: 80,
        height: 36,
        layoutMode: 'HORIZONTAL',
        fills: [mockSolidPaint()],
        children: [text],
      });
      const result = classifyNode(node);
      expect(result.role).toBe('button');
    });

    it('section takes priority over flex-col for wide vertical frames', () => {
      const children = [
        mockTextNode({ characters: 'A' }),
        mockTextNode({ characters: 'B' }),
      ];
      const node = mockFrameNode({
        width: 1200,
        height: 600,
        layoutMode: 'VERTICAL',
        children,
      });
      const result = classifyNode(node);
      expect(result.role).toBe('section');
    });

    it('handles invisible fills (visible: false) — not counted as fills', () => {
      const node = mockFrameNode({
        children: [],
        fills: [mockSolidPaint({ visible: false })],
        strokes: [],
        effects: [],
      });
      const result = classifyNode(node);
      expect(result.role).toBe('spacer');
    });
  });
});
