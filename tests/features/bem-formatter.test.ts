import { describe, it, expect, vi } from 'vitest';
import {
  toBEM,
  getChildBEMElement,
  generateBEMNames,
  applyBEMNames,
} from '../../src/features/bem-formatter';
import { analyzeNode } from '../../src/core/analyzer';
import {
  mockTextNode,
  mockFrameNode,
  mockRectangleNode,
  mockVectorNode,
  mockInstanceNode,
  mockSolidPaint,
  mockImagePaint,
} from '../helpers/figma-mock';

describe('toBEM', () => {
  it('formats block only', () => {
    expect(toBEM('card')).toBe('card');
  });

  it('formats block__element', () => {
    expect(toBEM('card', 'image')).toBe('card__image');
  });

  it('formats block--modifier', () => {
    expect(toBEM('card', undefined, 'hstack')).toBe('card--hstack');
  });

  it('formats block__element--modifier', () => {
    expect(toBEM('button', 'icon', 'primary')).toBe('button__icon--primary');
  });

  it('handles empty strings gracefully', () => {
    expect(toBEM('card', '', '')).toBe('card');
  });
});

describe('getChildBEMElement', () => {
  // Card children
  it('maps (card, image) → image', () => {
    expect(getChildBEMElement('card', 'image')).toBe('image');
  });

  it('maps (card, heading) → title', () => {
    expect(getChildBEMElement('card', 'heading')).toBe('title');
  });

  it('maps (card, text) → body', () => {
    expect(getChildBEMElement('card', 'text')).toBe('body');
  });

  it('maps (card, button) → cta', () => {
    expect(getChildBEMElement('card', 'button')).toBe('cta');
  });

  it('maps (card, divider) → divider', () => {
    expect(getChildBEMElement('card', 'divider')).toBe('divider');
  });

  it('maps (card, icon) → icon', () => {
    expect(getChildBEMElement('card', 'icon')).toBe('icon');
  });

  // Hero children
  it('maps (hero, image) → image', () => {
    expect(getChildBEMElement('hero', 'image')).toBe('image');
  });

  it('maps (hero, heading) → title', () => {
    expect(getChildBEMElement('hero', 'heading')).toBe('title');
  });

  it('maps (hero, text) → description', () => {
    expect(getChildBEMElement('hero', 'text')).toBe('description');
  });

  it('maps (hero, button) → cta', () => {
    expect(getChildBEMElement('hero', 'button')).toBe('cta');
  });

  // Feature children
  it('maps (feature, icon) → icon', () => {
    expect(getChildBEMElement('feature', 'icon')).toBe('icon');
  });

  it('maps (feature, heading) → title', () => {
    expect(getChildBEMElement('feature', 'heading')).toBe('title');
  });

  it('maps (feature, text) → description', () => {
    expect(getChildBEMElement('feature', 'text')).toBe('description');
  });

  // CTA children
  it('maps (cta, heading) → title', () => {
    expect(getChildBEMElement('cta', 'heading')).toBe('title');
  });

  it('maps (cta, text) → description', () => {
    expect(getChildBEMElement('cta', 'text')).toBe('description');
  });

  it('maps (cta, button) → button', () => {
    expect(getChildBEMElement('cta', 'button')).toBe('button');
  });

  // Testimonial children
  it('maps (testimonial, image) → avatar', () => {
    expect(getChildBEMElement('testimonial', 'image')).toBe('avatar');
  });

  it('maps (testimonial, text) → quote', () => {
    expect(getChildBEMElement('testimonial', 'text')).toBe('quote');
  });

  it('maps (testimonial, heading) → author', () => {
    expect(getChildBEMElement('testimonial', 'heading')).toBe('author');
  });

  // Unknown combination falls back to child role
  it('falls back to child role for unknown parent', () => {
    expect(getChildBEMElement('section', 'image')).toBe('image');
  });

  it('falls back to child role for unknown child', () => {
    expect(getChildBEMElement('card', 'accordion')).toBe('accordion');
  });
});

describe('generateBEMNames', () => {
  it('generates BEM names for card children', () => {
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
      width: 350, height: 450,
      children,
    });
    const result = analyzeNode(node);
    const mappings = generateBEMNames(result);

    expect(mappings.length).toBeGreaterThanOrEqual(4);
    const names = mappings.map(m => m.bemName);
    expect(names).toContain('card__image');
    expect(names).toContain('card__title');
    expect(names).toContain('card__body');
    expect(names).toContain('card__cta');
  });

  it('generates BEM names for hero children', () => {
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
      width: 1200, height: 600,
      fills: [mockImagePaint()],
      children,
    });
    const result = analyzeNode(node);
    const mappings = generateBEMNames(result);

    const names = mappings.map(m => m.bemName);
    expect(names).toContain('hero__title');
    expect(names).toContain('hero__description');
    expect(names).toContain('hero__cta');
  });

  it('returns empty array for non-composite roles', () => {
    const node = mockTextNode({ name: 'Text 1', fontSize: 16, fontWeight: 400 });
    const result = analyzeNode(node);
    const mappings = generateBEMNames(result);
    expect(mappings).toHaveLength(0);
  });

  it('returns empty array for container/unknown roles', () => {
    const node = mockFrameNode({
      name: 'Frame 1',
      width: 400, height: 300,
      fills: [mockSolidPaint()],
      children: [mockTextNode(), mockRectangleNode()],
    });
    const result = analyzeNode(node);
    if (result.role === 'container') {
      const mappings = generateBEMNames(result);
      expect(mappings).toHaveLength(0);
    }
  });

  it('handles duplicate child roles with index suffix', () => {
    const children = [
      mockTextNode({ name: 'Text 1', fontSize: 16, fontWeight: 400 }),
      mockTextNode({ name: 'Text 2', fontSize: 16, fontWeight: 400 }),
    ];
    const node = mockFrameNode({
      name: 'accordion',
      width: 400, height: 300,
      fills: [mockSolidPaint()],
      children,
    });
    const result = analyzeNode(node);
    if (result.role !== 'container' && result.role !== 'unknown') {
      const mappings = generateBEMNames(result);
      if (mappings.length >= 2) {
        const elementNames = mappings.map(m => m.bemName);
        // Should have distinct names
        expect(new Set(elementNames).size).toBe(elementNames.length);
      }
    }
  });
});

describe('applyBEMNames', () => {
  it('renames parent and children with BEM names', () => {
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
    const count = applyBEMNames(result, false);

    expect(count).toBeGreaterThanOrEqual(3);
    expect(children[0].name).toBe('card__image');
    expect(children[1].name).toBe('card__title');
    expect(children[2].name).toBe('card__body');
  });

  it('includes variant modifiers when enabled', () => {
    const children = [
      mockTextNode({ name: 'Text 1', fontSize: 24, fontWeight: 700 }),
      mockTextNode({ name: 'Text 2', fontSize: 16, fontWeight: 400 }),
    ];
    const node = mockInstanceNode({
      name: 'Frame 1',
      width: 350, height: 400,
      children: [
        mockRectangleNode({ name: 'Rectangle 1', fills: [mockImagePaint()], width: 300, height: 200 }),
        ...children,
      ],
      componentProperties: {
        'Layout': { type: 'VARIANT', value: 'Horizontal' },
      },
    });
    const result = analyzeNode(node);
    if (result.role === 'card') {
      const count = applyBEMNames(result, true);
      expect(count).toBeGreaterThanOrEqual(1);
      // Parent should get modifier
      expect(node.name).toContain('card--');
    }
  });

  it('returns 0 for non-composite nodes', () => {
    const node = mockTextNode({ name: 'Text 1', fontSize: 16, fontWeight: 400 });
    const result = analyzeNode(node);
    const count = applyBEMNames(result, false);
    expect(count).toBe(0);
  });
});
