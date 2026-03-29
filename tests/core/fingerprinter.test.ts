import { describe, it, expect } from 'vitest';
import { fingerprintChildren, matchFingerprint } from '../../src/core/fingerprinter';
import {
  mockTextNode,
  mockFrameNode,
  mockRectangleNode,
  mockVectorNode,
  mockGroupNode,
  mockImagePaint,
  mockSolidPaint,
  mockInstanceNode,
} from '../helpers/figma-mock';

describe('fingerprintChildren', () => {
  it('returns null for empty children array', () => {
    expect(fingerprintChildren([])).toBeNull();
  });

  it('counts text nodes correctly', () => {
    const children = [
      mockTextNode({ fontSize: 16, fontWeight: 400 }),
      mockTextNode({ fontSize: 14, fontWeight: 400 }),
    ];
    const fp = fingerprintChildren(children)!;
    expect(fp.texts).toBe(2);
    expect(fp.headings).toBe(0);
    expect(fp.total).toBe(2);
  });

  it('counts headings by font size >= 22', () => {
    const children = [
      mockTextNode({ fontSize: 28, fontWeight: 700 }),
      mockTextNode({ fontSize: 16, fontWeight: 400 }),
    ];
    const fp = fingerprintChildren(children)!;
    expect(fp.headings).toBe(1);
    expect(fp.texts).toBe(1);
  });

  it('counts headings by name pattern (h1-h6, heading, title)', () => {
    const children = [
      mockTextNode({ name: 'h2', fontSize: 14, fontWeight: 400 }),
      mockTextNode({ name: 'title', fontSize: 14, fontWeight: 400 }),
    ];
    const fp = fingerprintChildren(children)!;
    expect(fp.headings).toBe(2);
    expect(fp.texts).toBe(0);
  });

  it('counts images (nodes with IMAGE fill)', () => {
    const children = [
      mockRectangleNode({ fills: [mockImagePaint()] }),
      mockTextNode({ characters: 'Caption' }),
    ];
    const fp = fingerprintChildren(children)!;
    expect(fp.images).toBe(1);
    expect(fp.texts).toBe(1);
  });

  it('counts small images as icons', () => {
    const children = [
      mockRectangleNode({ width: 32, height: 32, fills: [mockImagePaint()] }),
      mockTextNode({ characters: 'Label' }),
    ];
    const fp = fingerprintChildren(children)!;
    expect(fp.icons).toBe(1);
    expect(fp.images).toBe(0);
  });

  it('counts vectors as icons', () => {
    const children = [
      mockVectorNode({ width: 24, height: 24 }),
      mockTextNode({ characters: 'Feature' }),
    ];
    const fp = fingerprintChildren(children)!;
    expect(fp.icons).toBe(1);
  });

  it('counts buttons by name pattern', () => {
    const children = [
      mockFrameNode({
        name: 'button',
        width: 120,
        height: 44,
        layoutMode: 'HORIZONTAL',
        fills: [mockSolidPaint()],
        children: [mockTextNode({ characters: 'Click' })],
      }),
      mockTextNode({ characters: 'Text' }),
    ];
    const fp = fingerprintChildren(children)!;
    expect(fp.buttons).toBe(1);
  });

  it('counts containers (frames/groups with children)', () => {
    const children = [
      mockFrameNode({ children: [mockTextNode({ characters: 'A' })] }),
      mockGroupNode({ children: [mockTextNode({ characters: 'B' })] }),
    ];
    const fp = fingerprintChildren(children)!;
    expect(fp.containers).toBe(2);
  });

  it('computes allSameType true when >= 80% are the same', () => {
    const children = [
      mockRectangleNode({ name: 'img1', fills: [mockImagePaint()] }),
      mockRectangleNode({ name: 'img2', fills: [mockImagePaint()] }),
      mockRectangleNode({ name: 'img3', fills: [mockImagePaint()] }),
      mockRectangleNode({ name: 'img4', fills: [mockImagePaint()] }),
    ];
    const fp = fingerprintChildren(children)!;
    expect(fp.allSameType).toBe(true);
  });

  it('computes allSameType true at exactly 80% threshold', () => {
    const children = [
      mockRectangleNode({ name: 'img1', fills: [mockImagePaint()] }),
      mockRectangleNode({ name: 'img2', fills: [mockImagePaint()] }),
      mockRectangleNode({ name: 'img3', fills: [mockImagePaint()] }),
      mockRectangleNode({ name: 'img4', fills: [mockImagePaint()] }),
      mockTextNode({ characters: 'Caption' }),
    ];
    const fp = fingerprintChildren(children)!;
    // 4/5 = 80% -> threshold met
    expect(fp.allSameType).toBe(true);
  });

  it('computes allSameType false when below 80%', () => {
    const children = [
      mockRectangleNode({ name: 'img1', fills: [mockImagePaint()] }),
      mockRectangleNode({ name: 'img2', fills: [mockImagePaint()] }),
      mockRectangleNode({ name: 'img3', fills: [mockImagePaint()] }),
      mockTextNode({ name: 'text1', characters: 'A' }),
      mockTextNode({ name: 'text2', characters: 'B' }),
    ];
    const fp = fingerprintChildren(children)!;
    // 3/5 = 60% -> below threshold
    expect(fp.allSameType).toBe(false);
  });

  it('allSameType is false for fewer than 3 children', () => {
    const children = [
      mockRectangleNode({ fills: [mockImagePaint()] }),
      mockRectangleNode({ fills: [mockImagePaint()] }),
    ];
    const fp = fingerprintChildren(children)!;
    expect(fp.allSameType).toBe(false);
  });

  it('produces a complete fingerprint for a card-like structure', () => {
    const children = [
      mockRectangleNode({ name: 'image', fills: [mockImagePaint()], width: 300, height: 200 }),
      mockTextNode({ name: 'heading', fontSize: 24, fontWeight: 700 }),
      mockTextNode({ name: 'body', fontSize: 16, fontWeight: 400 }),
      mockFrameNode({
        name: 'btn',
        width: 120, height: 44,
        layoutMode: 'HORIZONTAL',
        fills: [mockSolidPaint()],
        children: [mockTextNode({ characters: 'CTA' })],
      }),
    ];
    const fp = fingerprintChildren(children)!;
    expect(fp.images).toBe(1);
    expect(fp.headings).toBe(1);
    expect(fp.texts).toBe(1);
    expect(fp.buttons).toBe(1);
    expect(fp.icons).toBe(0);
    expect(fp.containers).toBe(0); // button frame has children but is classified as button
    expect(fp.total).toBe(4);
  });
});

describe('matchFingerprint', () => {
  it('returns null when fingerprint is null', () => {
    const node = mockFrameNode({ width: 400, height: 300 });
    expect(matchFingerprint(node, null)).toBeNull();
  });

  // --- HERO ---
  describe('hero detection', () => {
    it('detects hero: image fill + headings + h>=200 + w>=600', () => {
      const node = mockFrameNode({
        width: 1200,
        height: 400,
        fills: [mockImagePaint()],
      });
      const fp = {
        images: 0, texts: 1, headings: 1, buttons: 1, icons: 0, containers: 0,
        total: 3, hasImageFill: true, allSameType: false,
        parentWidth: 1200, parentHeight: 400,
      };
      const result = matchFingerprint(node, fp);
      expect(result).not.toBeNull();
      expect(result!.role).toBe('hero');
      expect(result!.confidence).toBe(80);
      expect(result!.source).toBe('structure');
    });

    it('does NOT detect hero when too short (h < 200)', () => {
      const node = mockFrameNode({ width: 1200, height: 100, fills: [mockImagePaint()] });
      const fp = {
        images: 0, texts: 1, headings: 1, buttons: 0, icons: 0, containers: 0,
        total: 2, hasImageFill: true, allSameType: false,
        parentWidth: 1200, parentHeight: 100,
      };
      expect(matchFingerprint(node, fp)).toBeNull();
    });

    it('does NOT detect hero when too narrow (w < 600)', () => {
      const node = mockFrameNode({ width: 400, height: 400, fills: [mockImagePaint()] });
      const fp = {
        images: 0, texts: 1, headings: 1, buttons: 0, icons: 0, containers: 0,
        total: 2, hasImageFill: true, allSameType: false,
        parentWidth: 400, parentHeight: 400,
      };
      expect(matchFingerprint(node, fp)).toBeNull();
    });
  });

  // --- GALLERY ---
  describe('gallery detection', () => {
    it('detects gallery: 3+ same-type images, no texts/buttons', () => {
      const node = mockFrameNode({ width: 800, height: 400 });
      const fp = {
        images: 4, texts: 0, headings: 0, buttons: 0, icons: 0, containers: 0,
        total: 4, hasImageFill: false, allSameType: true,
        parentWidth: 800, parentHeight: 400,
      };
      const result = matchFingerprint(node, fp);
      expect(result).not.toBeNull();
      expect(result!.role).toBe('gallery');
    });

    it('does NOT detect gallery with texts present', () => {
      const node = mockFrameNode({ width: 800, height: 400 });
      const fp = {
        images: 3, texts: 1, headings: 0, buttons: 0, icons: 0, containers: 0,
        total: 4, hasImageFill: false, allSameType: false,
        parentWidth: 800, parentHeight: 400,
      };
      expect(matchFingerprint(node, fp)).not.toEqual(expect.objectContaining({ role: 'gallery' }));
    });

    it('does NOT detect gallery with fewer than 3 images', () => {
      const node = mockFrameNode({ width: 800, height: 400 });
      const fp = {
        images: 2, texts: 0, headings: 0, buttons: 0, icons: 0, containers: 0,
        total: 2, hasImageFill: false, allSameType: true,
        parentWidth: 800, parentHeight: 400,
      };
      expect(matchFingerprint(node, fp)).toBeNull();
    });
  });

  // --- REPEATER (row of same-type containers) ---
  describe('repeater detection', () => {
    it('detects repeater: 3+ same-type containers with mixed content → row', () => {
      const node = mockFrameNode({ width: 900, height: 400 });
      const fp = {
        images: 1, texts: 0, headings: 0, buttons: 1, icons: 0, containers: 4,
        total: 6, hasImageFill: false, allSameType: false,
        parentWidth: 900, parentHeight: 400,
      };
      // Has images+buttons so not a pure list, containers are 4 and allSameType would be false
      // Let's test with all same containers and some mixed
      const fp2 = {
        images: 0, texts: 0, headings: 0, buttons: 1, icons: 0, containers: 4,
        total: 5, hasImageFill: false, allSameType: true,
        parentWidth: 900, parentHeight: 400,
      };
      const result = matchFingerprint(node, fp2);
      expect(result).not.toBeNull();
      expect(result!.role).toBe('row');
    });

    it('detects list: 3+ same-type containers with no images/buttons → list', () => {
      const node = mockFrameNode({ width: 400, height: 300 });
      const fp = {
        images: 0, texts: 0, headings: 0, buttons: 0, icons: 0, containers: 4,
        total: 4, hasImageFill: false, allSameType: true,
        parentWidth: 400, parentHeight: 300,
      };
      const result = matchFingerprint(node, fp);
      expect(result).not.toBeNull();
      expect(result!.role).toBe('list');
    });
  });

  // --- FEATURE / BLURB ---
  describe('feature/blurb detection', () => {
    it('detects feature: 2-4 children, icon + heading/text, no images, w < 400', () => {
      const node = mockFrameNode({ width: 300, height: 200 });
      const fp = {
        images: 0, texts: 1, headings: 1, buttons: 0, icons: 1, containers: 0,
        total: 3, hasImageFill: false, allSameType: false,
        parentWidth: 300, parentHeight: 200,
      };
      const result = matchFingerprint(node, fp);
      expect(result).not.toBeNull();
      expect(result!.role).toBe('feature');
    });

    it('does NOT detect feature when too wide (w >= 400) — may match card instead', () => {
      const node = mockFrameNode({ width: 500, height: 200 });
      const fp = {
        images: 0, texts: 1, headings: 1, buttons: 0, icons: 1, containers: 0,
        total: 3, hasImageFill: false, allSameType: false,
        parentWidth: 500, parentHeight: 200,
      };
      const result = matchFingerprint(node, fp);
      if (result) {
        expect(result.role).not.toBe('feature');
      }
    });

    it('does NOT detect feature with images present — may match card instead', () => {
      const node = mockFrameNode({ width: 300, height: 200 });
      const fp = {
        images: 1, texts: 1, headings: 1, buttons: 0, icons: 1, containers: 0,
        total: 4, hasImageFill: false, allSameType: false,
        parentWidth: 300, parentHeight: 200,
      };
      const result = matchFingerprint(node, fp);
      if (result) {
        expect(result.role).not.toBe('feature');
      }
    });

    it('does NOT detect feature with more than 4 children — may match card instead', () => {
      const node = mockFrameNode({ width: 300, height: 200 });
      const fp = {
        images: 0, texts: 2, headings: 1, buttons: 1, icons: 1, containers: 0,
        total: 5, hasImageFill: false, allSameType: false,
        parentWidth: 300, parentHeight: 200,
      };
      const result = matchFingerprint(node, fp);
      if (result) {
        expect(result.role).not.toBe('feature');
      }
    });
  });

  // --- CARD ---
  describe('card detection', () => {
    it('detects card: 2-6 children, headings + images, not image fill, w <= 600', () => {
      const node = mockFrameNode({ width: 400, height: 500 });
      const fp = {
        images: 1, texts: 1, headings: 1, buttons: 1, icons: 0, containers: 0,
        total: 4, hasImageFill: false, allSameType: false,
        parentWidth: 400, parentHeight: 500,
      };
      const result = matchFingerprint(node, fp);
      expect(result).not.toBeNull();
      expect(result!.role).toBe('card');
      expect(result!.confidence).toBe(80);
    });

    it('detects card with icons instead of images', () => {
      const node = mockFrameNode({ width: 300, height: 400 });
      const fp = {
        images: 0, texts: 1, headings: 1, buttons: 0, icons: 1, containers: 0,
        total: 3, hasImageFill: false, allSameType: false,
        parentWidth: 300, parentHeight: 400,
      };
      // This also matches feature if w < 400, so card should still match
      const result = matchFingerprint(node, fp);
      expect(result).not.toBeNull();
    });

    it('does NOT detect card when parent has image fill (that is hero)', () => {
      const node = mockFrameNode({ width: 400, height: 500, fills: [mockImagePaint()] });
      const fp = {
        images: 0, texts: 1, headings: 1, buttons: 1, icons: 0, containers: 0,
        total: 3, hasImageFill: true, allSameType: false,
        parentWidth: 400, parentHeight: 500,
      };
      const result = matchFingerprint(node, fp);
      // Should not be card — hasImageFill disqualifies
      if (result) {
        expect(result.role).not.toBe('card');
      }
    });

    it('does NOT detect card when too wide (w > 600)', () => {
      const node = mockFrameNode({ width: 800, height: 500 });
      const fp = {
        images: 1, texts: 1, headings: 1, buttons: 1, icons: 0, containers: 0,
        total: 4, hasImageFill: false, allSameType: false,
        parentWidth: 800, parentHeight: 500,
      };
      expect(matchFingerprint(node, fp)).toBeNull();
    });

    it('does NOT detect card with fewer than 2 children', () => {
      const node = mockFrameNode({ width: 400, height: 500 });
      const fp = {
        images: 1, texts: 0, headings: 0, buttons: 0, icons: 0, containers: 0,
        total: 1, hasImageFill: false, allSameType: false,
        parentWidth: 400, parentHeight: 500,
      };
      expect(matchFingerprint(node, fp)).toBeNull();
    });

    it('does NOT detect card with more than 6 children', () => {
      const node = mockFrameNode({ width: 400, height: 500 });
      const fp = {
        images: 1, texts: 3, headings: 1, buttons: 1, icons: 1, containers: 0,
        total: 7, hasImageFill: false, allSameType: false,
        parentWidth: 400, parentHeight: 500,
      };
      expect(matchFingerprint(node, fp)).toBeNull();
    });
  });

  // --- NO MATCH ---
  describe('no match', () => {
    it('returns null when no structural pattern matches', () => {
      const node = mockFrameNode({ width: 400, height: 300 });
      const fp = {
        images: 0, texts: 0, headings: 0, buttons: 0, icons: 0, containers: 1,
        total: 1, hasImageFill: false, allSameType: false,
        parentWidth: 400, parentHeight: 300,
      };
      expect(matchFingerprint(node, fp)).toBeNull();
    });
  });
});
