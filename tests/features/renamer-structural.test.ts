import { describe, it, expect } from 'vitest';
import { generateName, scanForRenaming } from '../../src/features/renamer';
import { analyzeNode } from '../../src/core/analyzer';
import {
  mockTextNode,
  mockFrameNode,
  mockSolidPaint,
} from '../helpers/figma-mock';

describe('structural name lowercasing', () => {
  it('lowercases "Section" to "section"', () => {
    const node = mockFrameNode({
      name: 'Section',
      width: 1200, height: 600,
      children: [mockTextNode()],
    });
    const result = analyzeNode(node);
    expect(generateName(result)).toBe('section');
  });

  it('lowercases "Row" to "row"', () => {
    const node = mockFrameNode({
      name: 'Row',
      width: 400,
      layoutMode: 'HORIZONTAL',
      children: [mockTextNode(), mockTextNode({ name: 'Text 2' })],
    });
    const result = analyzeNode(node);
    expect(generateName(result)).toBe('row');
  });

  it('lowercases "Group" to "group"', () => {
    const node = mockFrameNode({
      name: 'Group',
      width: 400,
      children: [mockTextNode()],
      fills: [],
      strokes: [],
      effects: [],
      cornerRadius: 0,
      layoutMode: 'NONE',
    });
    const result = analyzeNode(node);
    expect(generateName(result)).toBe('group');
  });

  it('lowercases "Container" to "container"', () => {
    const node = mockFrameNode({
      name: 'Container',
      width: 400,
      fills: [mockSolidPaint()],
      children: [mockTextNode()],
    });
    const result = analyzeNode(node);
    expect(generateName(result)).toBe('container');
  });

  it('lowercases "Card" to "card"', () => {
    const node = mockFrameNode({
      name: 'Card',
      width: 400,
      fills: [mockSolidPaint()],
      children: [mockTextNode()],
    });
    const result = analyzeNode(node);
    expect(generateName(result)).toBe('card');
  });

  it('lowercases "Button" to "button"', () => {
    const node = mockFrameNode({
      name: 'Button',
      width: 120, height: 44,
      layoutMode: 'HORIZONTAL',
      fills: [mockSolidPaint()],
      children: [mockTextNode({ characters: 'Click' })],
    });
    const result = analyzeNode(node);
    expect(generateName(result)).toBe('button');
  });

  it('lowercases "Accordion" to "accordion"', () => {
    const node = mockFrameNode({
      name: 'Accordion',
      width: 400,
      fills: [mockSolidPaint()],
      children: [mockTextNode()],
    });
    const result = analyzeNode(node);
    expect(generateName(result)).toBe('accordion');
  });

  it('does NOT rename already-lowercase "section"', () => {
    const node = mockFrameNode({
      name: 'section',
      width: 1200, height: 600,
      children: [mockTextNode()],
    });
    const result = analyzeNode(node);
    expect(generateName(result)).toBeNull();
  });

  it('does NOT rename already-lowercase "card"', () => {
    const node = mockFrameNode({
      name: 'card',
      width: 400,
      fills: [mockSolidPaint()],
      children: [mockTextNode()],
    });
    const result = analyzeNode(node);
    expect(generateName(result)).toBeNull();
  });

  it('includes structural renames in scanForRenaming', () => {
    const section = mockFrameNode({
      name: 'Section',
      width: 1200, height: 600,
      children: [mockTextNode({ name: 'Frame 1', fontSize: 16, fontWeight: 400 })],
    });
    const results = [analyzeNode(section)];
    const actions = scanForRenaming(results);

    const sectionAction = actions.find(function(a) { return a.currentName === 'Section'; });
    expect(sectionAction).toBeDefined();
    expect(sectionAction!.suggestedName).toBe('section');
  });
});
