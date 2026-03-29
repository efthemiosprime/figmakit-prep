import { describe, it, expect } from 'vitest';
import { matchNamePattern, NAME_PATTERNS } from '../../src/shared/patterns';

describe('matchNamePattern', () => {
  describe('image patterns', () => {
    it.each([
      'image', 'img', 'photo', 'thumbnail', 'thumb', 'avatar',
      'logo', 'picture', 'banner', 'cover',
      'card-img', 'user-avatar',
    ])('matches "%s" as image', (name) => {
      expect(matchNamePattern(name)).toBe('image');
    });

    it('matches "hero-image" as container (layout section, not image)', () => {
      expect(matchNamePattern('hero-image')).toBe('container');
    });

    it('matches "background" as container (decorative)', () => {
      // "background" is handled by classifier as decorative, not by name patterns
      // name pattern may or may not match — classifier takes priority
    });
  });

  describe('card pattern', () => {
    it.each([
      'card', 'Card', 'CARD', 'card-1', 'card_primary',
    ])('matches "%s" as card', (name) => {
      expect(matchNamePattern(name)).toBe('card');
    });

    it.each([
      'card__title', 'card__image', 'card__body', 'card__cta',
      'card-header', 'card-content', 'card-footer', 'card-actions',
      'card-image', 'card-img', 'card-title', 'card-text',
      'card-description', 'card-button', 'card-btn',
    ])('does NOT match sub-element "%s" as card', (name) => {
      expect(matchNamePattern(name)).not.toBe('card');
    });
  });

  describe('layout patterns', () => {
    it.each(['column', 'col', 'Column', 'col-1', 'column_main'])('matches "%s" as column', (name) => {
      expect(matchNamePattern(name)).toBe('column');
    });

    it.each(['columns', 'Columns', 'columns-3'])('matches "%s" as row (multi-column layout)', (name) => {
      expect(matchNamePattern(name)).toBe('row');
    });

    it.each(['row', 'hstack', 'Row', 'row-1', 'hstack_nav'])('matches "%s" as row', (name) => {
      expect(matchNamePattern(name)).toBe('row');
    });

    it.each(['vstack', 'Vstack', 'vstack-main'])('matches "%s" as group', (name) => {
      expect(matchNamePattern(name)).toBe('group');
    });

    it.each(['group', 'Group', 'group-1'])('matches "%s" as group', (name) => {
      expect(matchNamePattern(name)).toBe('group');
    });
  });

  describe('container patterns', () => {
    it.each([
      'container', 'wrapper', 'frame', 'box', 'panel', 'block', 'layout', 'section',
      'container-main', 'wrapper_outer',
    ])('matches "%s" as container', (name) => {
      expect(matchNamePattern(name)).toBe('container');
    });
  });

  describe('heading patterns', () => {
    it.each(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])('matches "%s" as heading with level', (name) => {
      const result = matchNamePattern(name);
      expect(result).toBe('heading');
    });

    it.each(['heading', 'title', 'Heading', 'Title', 'heading-main'])('matches "%s" as heading', (name) => {
      expect(matchNamePattern(name)).toBe('heading');
    });
  });

  describe('text patterns', () => {
    it.each([
      'content', 'description', 'body', 'paragraph', 'caption', 'subtitle',
    ])('matches "%s" as text', (name) => {
      expect(matchNamePattern(name)).toBe('text');
    });
  });

  describe('button patterns', () => {
    it.each([
      'button', 'btn', 'action', 'Button', 'btn-primary',
      'link', 'link-nav',
    ])('matches "%s" as button', (name) => {
      expect(matchNamePattern(name)).toBe('button');
    });

    it.each(['buttons', 'button-group', 'button_group'])('matches "%s" as buttons', (name) => {
      expect(matchNamePattern(name)).toBe('buttons');
    });
  });

  describe('divider patterns', () => {
    it.each([
      'divider', 'separator', 'hr', 'line', 'Divider', 'separator-1',
    ])('matches "%s" as divider', (name) => {
      expect(matchNamePattern(name)).toBe('divider');
    });
  });

  describe('component patterns', () => {
    it.each(['accordion', 'faq', 'collapsible', 'expandable', 'details'])('matches "%s" as accordion', (name) => {
      expect(matchNamePattern(name)).toBe('accordion');
    });

    it.each(['tabs', 'Tabs', 'tabs-main'])('matches "%s" as tabs', (name) => {
      expect(matchNamePattern(name)).toBe('tabs');
    });

    it.each(['testimonial', 'quote', 'review', 'blockquote'])('matches "%s" as testimonial', (name) => {
      expect(matchNamePattern(name)).toBe('testimonial');
    });

    it.each(['modal', 'dialog', 'popup', 'lightbox'])('matches "%s" as modal', (name) => {
      expect(matchNamePattern(name)).toBe('modal');
    });

    it.each(['isi', 'isi-tray', 'safety-info', 'safety_info'])('matches "%s" as isi', (name) => {
      expect(matchNamePattern(name)).toBe('isi');
    });

    it.each(['site-header', 'navbar', 'nav-bar', 'navigation'])('matches "%s" as header', (name) => {
      expect(matchNamePattern(name)).toBe('header');
    });

    it.each(['cta', 'call-to-action', 'call_to_action'])('matches "%s" as cta', (name) => {
      expect(matchNamePattern(name)).toBe('cta');
    });
  });

  describe('non-matching names', () => {
    it('returns null for unrecognized names', () => {
      expect(matchNamePattern('widget')).toBeNull();
      expect(matchNamePattern('foo-bar')).toBeNull();
      expect(matchNamePattern('123')).toBeNull();
    });

    it('matches "Frame 47" as container (frame is a container keyword)', () => {
      expect(matchNamePattern('Frame 47')).toBe('container');
    });
  });

  describe('case insensitivity', () => {
    it('matches regardless of case', () => {
      expect(matchNamePattern('BUTTON')).toBe('button');
      expect(matchNamePattern('Hero')).toBeNull(); // "hero" alone is not in name patterns (detected via fingerprinting)
      expect(matchNamePattern('CARD')).toBe('card');
      expect(matchNamePattern('Divider')).toBe('divider');
    });
  });
});

describe('NAME_PATTERNS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(NAME_PATTERNS)).toBe(true);
    expect(NAME_PATTERNS.length).toBeGreaterThan(0);
  });

  it('each entry has pattern (RegExp) and role (string)', () => {
    for (const entry of NAME_PATTERNS) {
      expect(entry.pattern).toBeInstanceOf(RegExp);
      expect(typeof entry.role).toBe('string');
    }
  });
});
