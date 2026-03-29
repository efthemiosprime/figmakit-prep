import { describe, it, expect } from 'vitest';
import {
  SPACING_SCALE,
  HEADING_THRESHOLDS,
  ICON_MAX_SIZE,
  BUTTON_MAX_HEIGHT,
  BUTTON_MAX_WIDTH,
  SECTION_MIN_WIDTH,
  HERO_MIN_HEIGHT,
  HERO_MIN_WIDTH,
  CARD_MAX_WIDTH,
  FEATURE_MAX_WIDTH,
  AUTO_NAME_PATTERN,
  MONOSPACE_FONTS,
  SEMANTIC_NAMES,
  TYPOGRAPHY_CLASSES,
  BACKGROUND_SHAPE_THRESHOLD,
  FINGERPRINT_UNIFORMITY_THRESHOLD,
  DIVIDER_MAX_THICKNESS,
  DIVIDER_ASPECT_RATIO,
  HEADING_MIN_FONT_SIZE,
  HEADING_MIN_FONT_WEIGHT,
  BUTTON_MAX_CHILDREN,
} from '../../src/shared/constants';

describe('SPACING_SCALE', () => {
  it('contains all 10 entries with correct values', () => {
    expect(SPACING_SCALE).toEqual({
      '4xs': 4,
      '3xs': 8,
      '2xs': 12,
      'xs': 16,
      'sm': 20,
      'md': 24,
      'lg': 32,
      'xl': 48,
      '2xl': 80,
      '3xl': 96,
    });
  });

  it('has exactly 10 entries', () => {
    expect(Object.keys(SPACING_SCALE)).toHaveLength(10);
  });
});

describe('HEADING_THRESHOLDS', () => {
  it('has 6 levels', () => {
    expect(HEADING_THRESHOLDS).toHaveLength(6);
  });

  it('is sorted descending by minSize', () => {
    for (let i = 0; i < HEADING_THRESHOLDS.length - 1; i++) {
      expect(HEADING_THRESHOLDS[i].minSize).toBeGreaterThan(HEADING_THRESHOLDS[i + 1].minSize);
    }
  });

  it('has correct level-to-size mappings', () => {
    expect(HEADING_THRESHOLDS[0]).toEqual({ level: 1, minSize: 48 });
    expect(HEADING_THRESHOLDS[1]).toEqual({ level: 2, minSize: 36 });
    expect(HEADING_THRESHOLDS[2]).toEqual({ level: 3, minSize: 28 });
    expect(HEADING_THRESHOLDS[3]).toEqual({ level: 4, minSize: 22 });
    expect(HEADING_THRESHOLDS[4]).toEqual({ level: 5, minSize: 18 });
    expect(HEADING_THRESHOLDS[5]).toEqual({ level: 6, minSize: 0 });
  });
});

describe('size thresholds', () => {
  it('ICON_MAX_SIZE is 64', () => {
    expect(ICON_MAX_SIZE).toBe(64);
  });

  it('BUTTON_MAX_HEIGHT is 80', () => {
    expect(BUTTON_MAX_HEIGHT).toBe(80);
  });

  it('BUTTON_MAX_WIDTH is 400', () => {
    expect(BUTTON_MAX_WIDTH).toBe(400);
  });

  it('BUTTON_MAX_CHILDREN is 3', () => {
    expect(BUTTON_MAX_CHILDREN).toBe(3);
  });

  it('SECTION_MIN_WIDTH is 900', () => {
    expect(SECTION_MIN_WIDTH).toBe(900);
  });

  it('HERO_MIN_HEIGHT is 200', () => {
    expect(HERO_MIN_HEIGHT).toBe(200);
  });

  it('HERO_MIN_WIDTH is 600', () => {
    expect(HERO_MIN_WIDTH).toBe(600);
  });

  it('CARD_MAX_WIDTH is 600', () => {
    expect(CARD_MAX_WIDTH).toBe(600);
  });

  it('FEATURE_MAX_WIDTH is 400', () => {
    expect(FEATURE_MAX_WIDTH).toBe(400);
  });
});

describe('detection thresholds', () => {
  it('BACKGROUND_SHAPE_THRESHOLD is 0.9', () => {
    expect(BACKGROUND_SHAPE_THRESHOLD).toBe(0.9);
  });

  it('FINGERPRINT_UNIFORMITY_THRESHOLD is 0.8', () => {
    expect(FINGERPRINT_UNIFORMITY_THRESHOLD).toBe(0.8);
  });

  it('DIVIDER_MAX_THICKNESS is 4', () => {
    expect(DIVIDER_MAX_THICKNESS).toBe(4);
  });

  it('DIVIDER_ASPECT_RATIO is 5', () => {
    expect(DIVIDER_ASPECT_RATIO).toBe(5);
  });

  it('HEADING_MIN_FONT_SIZE is 24', () => {
    expect(HEADING_MIN_FONT_SIZE).toBe(24);
  });

  it('HEADING_MIN_FONT_WEIGHT is 600', () => {
    expect(HEADING_MIN_FONT_WEIGHT).toBe(600);
  });
});

describe('AUTO_NAME_PATTERN', () => {
  it('matches auto-generated Figma layer names', () => {
    const shouldMatch = [
      'Frame 47', 'Group 7', 'Rectangle 14', 'Ellipse 3',
      'Line 1', 'Vector 5', 'Star 2', 'Polygon 1',
      'Boolean', 'Section 4', 'Slice 1', 'Component 2', 'Instance 3',
      'frame 47', 'GROUP 7', 'Frame', 'Rectangle',
    ];
    for (const name of shouldMatch) {
      expect(AUTO_NAME_PATTERN.test(name), `Expected "${name}" to match`).toBe(true);
    }
  });

  it('does not match user-given or semantic names', () => {
    const shouldNotMatch = [
      'my-card', 'hero-section', 'Frame with stuff',
      'Button Primary', 'card__title', 'header-nav',
      'Group of cards', 'Rectangle Background',
    ];
    for (const name of shouldNotMatch) {
      expect(AUTO_NAME_PATTERN.test(name), `Expected "${name}" NOT to match`).toBe(false);
    }
  });
});

describe('MONOSPACE_FONTS', () => {
  it('includes expected monospace font families', () => {
    const expected = [
      'fira code', 'sf mono', 'courier', 'courier new', 'consolas',
      'menlo', 'monaco', 'source code', 'jetbrains mono', 'roboto mono',
      'ubuntu mono',
    ];
    for (const font of expected) {
      expect(MONOSPACE_FONTS).toContain(font);
    }
  });
});

describe('SEMANTIC_NAMES', () => {
  it('includes core semantic names', () => {
    const coreNames = [
      'text', 'heading', 'h1', 'h2', 'h3', 'image', 'icon',
      'button', 'divider', 'section', 'row', 'column', 'card', 'hero',
    ];
    for (const name of coreNames) {
      expect(SEMANTIC_NAMES).toContain(name);
    }
  });

  it('includes BEM-style names', () => {
    expect(SEMANTIC_NAMES).toContain('card__image');
    expect(SEMANTIC_NAMES).toContain('card__title');
    expect(SEMANTIC_NAMES).toContain('card__body');
    expect(SEMANTIC_NAMES).toContain('card__cta');
  });
});

describe('TYPOGRAPHY_CLASSES', () => {
  it('contains typography class definitions', () => {
    expect(TYPOGRAPHY_CLASSES.length).toBeGreaterThan(0);
  });

  it('includes fk-text-title for large bold text', () => {
    const title = TYPOGRAPHY_CLASSES.find(t => t.name === 'fk-text-title');
    expect(title).toBeDefined();
    expect(title!.minSize).toBe(40);
    expect(title!.minWeight).toBe(600);
  });

  it('includes fk-text-body-md for medium body text', () => {
    const bodyMd = TYPOGRAPHY_CLASSES.find(t => t.name === 'fk-text-body-md');
    expect(bodyMd).toBeDefined();
    expect(bodyMd!.minSize).toBeGreaterThan(15);
    expect(bodyMd!.maxSize).toBeLessThanOrEqual(17);
  });

  it('includes fk-text-eyebrow for small uppercase text', () => {
    const eyebrow = TYPOGRAPHY_CLASSES.find(t => t.name === 'fk-text-eyebrow');
    expect(eyebrow).toBeDefined();
    expect(eyebrow!.maxSize).toBeLessThanOrEqual(13);
    expect(eyebrow!.minWeight).toBe(500);
    expect(eyebrow!.textCase).toBe('UPPER');
  });

  it('includes fk-text-footnote for very small text', () => {
    const footnote = TYPOGRAPHY_CLASSES.find(t => t.name === 'fk-text-footnote');
    expect(footnote).toBeDefined();
    expect(footnote!.maxSize).toBeLessThanOrEqual(11);
  });
});
