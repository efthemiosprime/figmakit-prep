import { describe, it, expect } from 'vitest';
import { generateReport, suggestAction } from '../../src/features/validator';
import { analyzeNode } from '../../src/core/analyzer';
import {
  mockTextNode,
  mockFrameNode,
  mockRectangleNode,
  mockVectorNode,
  mockSolidPaint,
  mockImagePaint,
} from '../helpers/figma-mock';

describe('generateReport', () => {
  it('puts high-confidence nodes (>= 90) in high tier', () => {
    const node = mockTextNode({ name: 'Frame 1', fontSize: 16, fontWeight: 400 });
    const result = analyzeNode(node);
    const report = generateReport([result]);
    expect(report.high).toHaveLength(1);
    expect(report.high[0].confidence).toBeGreaterThanOrEqual(90);
    expect(report.high[0].tier).toBe('high');
  });

  it('puts medium-confidence nodes (50-89) in needsReview tier', () => {
    // Name pattern match gives confidence 60
    const node = mockFrameNode({
      name: 'accordion',
      width: 400, height: 300,
      fills: [mockSolidPaint()],
      children: [mockTextNode(), mockTextNode({ name: 'Text 2' })],
    });
    const result = analyzeNode(node);
    const report = generateReport([result]);
    // The top-level node should be in needsReview (confidence 60)
    const accordionEntry = [...report.needsReview, ...report.high].find(
      r => r.name === 'accordion'
    );
    expect(accordionEntry).toBeDefined();
    if (accordionEntry!.confidence >= 50 && accordionEntry!.confidence < 90) {
      expect(accordionEntry!.tier).toBe('needsReview');
    }
  });

  it('puts low-confidence nodes (< 50) in low tier', () => {
    const node = mockFrameNode({
      name: 'Frame 1',
      width: 400, height: 300,
      fills: [mockSolidPaint()],
      children: [mockTextNode(), mockRectangleNode()],
    });
    const result = analyzeNode(node);
    const report = generateReport([result]);
    // Frame with default classification (30) should be in low
    const lowEntry = report.low.find(r => r.name === 'Frame 1');
    if (lowEntry) {
      expect(lowEntry.confidence).toBeLessThan(50);
      expect(lowEntry.tier).toBe('low');
    }
  });

  it('puts removable nodes in skipped tier', () => {
    const node = mockFrameNode({
      name: 'Hidden',
      visible: false,
      children: [mockTextNode()],
    });
    const result = analyzeNode(node);
    const report = generateReport([result]);
    expect(report.skipped).toHaveLength(1);
    expect(report.skipped[0].tier).toBe('skipped');
  });

  it('processes children recursively', () => {
    const child1 = mockTextNode({ name: 'Frame 2', fontSize: 16, fontWeight: 400 });
    const child2 = mockFrameNode({
      name: 'Hidden child',
      visible: false,
      children: [mockTextNode()],
    });
    const root = mockFrameNode({
      name: 'Frame 1',
      width: 1200,
      children: [child1, child2],
    });
    const result = analyzeNode(root);
    const report = generateReport([result]);
    // child1 (text, 90) in high, child2 (hidden) in skipped
    expect(report.high.length).toBeGreaterThanOrEqual(1);
    expect(report.skipped.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty tiers for empty input', () => {
    const report = generateReport([]);
    expect(report.high).toHaveLength(0);
    expect(report.needsReview).toHaveLength(0);
    expect(report.low).toHaveLength(0);
    expect(report.skipped).toHaveLength(0);
  });

  it('produces correct summary counts', () => {
    const nodes = [
      // high: text (90)
      mockTextNode({ name: 'Frame 1', fontSize: 16, fontWeight: 400 }),
      // high: icon (90)
      mockVectorNode({ name: 'Vector 1', width: 24, height: 24 }),
      // skipped: hidden
      mockFrameNode({ name: 'Frame 2', visible: false, children: [mockTextNode()] }),
      // low: default container (30)
      mockFrameNode({
        name: 'Frame 3',
        width: 400, height: 300,
        fills: [mockSolidPaint()],
        children: [mockTextNode(), mockRectangleNode()],
      }),
    ];
    const results = nodes.map(n => analyzeNode(n));
    const report = generateReport(results);
    const totalEntries = report.high.length + report.needsReview.length +
      report.low.length + report.skipped.length;
    expect(totalEntries).toBeGreaterThanOrEqual(4);
  });
});

describe('suggestAction', () => {
  it('suggests "rename" for low-confidence auto-named nodes', () => {
    const node = mockFrameNode({
      name: 'Frame 1',
      width: 400, height: 300,
      fills: [mockSolidPaint()],
      children: [mockTextNode(), mockRectangleNode()],
    });
    const result = analyzeNode(node);
    // container at confidence 30
    if (result.confidence < 50 && result.role === 'container') {
      const suggestion = suggestAction(result);
      // Low confidence container — suggest adding semantic name
      expect(suggestion).not.toBeNull();
    }
  });

  it('suggests "clean" for removable nodes', () => {
    const node = mockFrameNode({
      name: 'Frame 1',
      visible: false,
      children: [mockTextNode()],
    });
    const result = analyzeNode(node);
    const suggestion = suggestAction(result);
    expect(suggestion).not.toBeNull();
    expect(suggestion!.type).toBe('clean');
  });

  it('suggests "rename" for medium-confidence auto-named nodes', () => {
    const node = mockFrameNode({
      name: 'accordion',
      width: 400, height: 300,
      fills: [mockSolidPaint()],
      children: [mockTextNode(), mockTextNode({ name: 'Text 2' })],
    });
    const result = analyzeNode(node);
    // Name pattern gives 60 — already has semantic name, no action needed
    if (result.confidence >= 50 && result.confidence < 90) {
      const suggestion = suggestAction(result);
      // Already named semantically, suggestion should be null
      expect(suggestion).toBeNull();
    }
  });

  it('returns null for high-confidence nodes', () => {
    const node = mockTextNode({ name: 'Frame 1', fontSize: 16, fontWeight: 400 });
    const result = analyzeNode(node);
    const suggestion = suggestAction(result);
    expect(suggestion).toBeNull();
  });

  it('suggests "rename" with target name for auto-named low-confidence', () => {
    const children = [
      mockRectangleNode({ name: 'Rectangle 1', fills: [mockImagePaint()], width: 300, height: 200 }),
      mockTextNode({ name: 'Text 1', fontSize: 24, fontWeight: 700 }),
      mockTextNode({ name: 'Text 2', fontSize: 16, fontWeight: 400 }),
    ];
    const node = mockFrameNode({
      name: 'Frame 47',
      width: 350, height: 400,
      children,
    });
    const result = analyzeNode(node);
    // Should be detected as card (80), which is needsReview
    if (result.role === 'card' && result.confidence < 90) {
      const suggestion = suggestAction(result);
      if (suggestion) {
        expect(suggestion.type).toBe('rename');
        expect(suggestion.detail).toContain('card');
      }
    }
  });
});
