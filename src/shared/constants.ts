import type { TypographyClassDef } from './types';

// Spacing scale (mirrors fk_get_spacing_scale() in helpers.php)
export const SPACING_SCALE: Record<string, number> = {
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
};

// Font size → heading level thresholds (mirrors helpers.php)
export const HEADING_THRESHOLDS = [
  { level: 1, minSize: 48 },
  { level: 2, minSize: 36 },
  { level: 3, minSize: 28 },
  { level: 4, minSize: 22 },
  { level: 5, minSize: 18 },
  { level: 6, minSize: 0 },
] as const;

// Size thresholds
export const ICON_MAX_SIZE = 64;
export const BUTTON_MAX_HEIGHT = 80;
export const BUTTON_MAX_WIDTH = 400;
export const BUTTON_MAX_CHILDREN = 3;
export const SECTION_MIN_WIDTH = 900;
export const HERO_MIN_HEIGHT = 200;
export const HERO_MIN_WIDTH = 600;
export const CARD_MAX_WIDTH = 600;
export const FEATURE_MAX_WIDTH = 400;

// Detection thresholds
export const BACKGROUND_SHAPE_THRESHOLD = 0.9;
export const FINGERPRINT_UNIFORMITY_THRESHOLD = 0.8;
export const DIVIDER_MAX_THICKNESS = 4;
export const DIVIDER_ASPECT_RATIO = 5;
export const HEADING_MIN_FONT_SIZE = 24;
export const HEADING_MIN_FONT_WEIGHT = 600;

// Auto-generated layer name pattern
export const AUTO_NAME_PATTERN =
  /^(Frame|Group|Rectangle|Ellipse|Line|Vector|Star|Polygon|Boolean|Section|Slice|Component|Instance)\s*\d*$/i;

// Monospace fonts (mirrors Gutenberg converter)
export const MONOSPACE_FONTS = [
  'fira code', 'sf mono', 'courier', 'courier new', 'consolas',
  'menlo', 'monaco', 'source code', 'jetbrains mono', 'roboto mono',
  'ubuntu mono',
];

// Semantic names that should not be renamed
export const SEMANTIC_NAMES = [
  'text', 'heading', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'image', 'icon', 'button', 'btn', 'cta', 'divider', 'separator',
  'spacer', 'wrapper', 'section', 'row', 'column', 'col',
  'container', 'group', 'hstack', 'vstack',
  'card', 'hero', 'feature', 'gallery', 'testimonial', 'quote',
  'accordion', 'tabs', 'modal', 'dialog', 'isi', 'header', 'navbar',
  'card__image', 'card__title', 'card__body', 'card__cta',
];

// Typography class definitions (mirrors fk_snap_to_theme_text_class() in helpers.php)
export const TYPOGRAPHY_CLASSES: TypographyClassDef[] = [
  { name: 'fk-text-eyebrow', minSize: 0, maxSize: 13, minWeight: 500, textCase: 'UPPER' },
  { name: 'fk-text-title', minSize: 40, maxSize: Infinity, minWeight: 600 },
  { name: 'fk-text-subtitle', minSize: 28, maxSize: 39, minWeight: 500 },
  { name: 'fk-text-footnote', minSize: 0, maxSize: 11, minWeight: 0 },
  { name: 'fk-text-caption', minSize: 0, maxSize: 13, minWeight: 0 },
  { name: 'fk-text-body-sm', minSize: 14, maxSize: 15, minWeight: 0 },
  { name: 'fk-text-body-md', minSize: 16, maxSize: 17, minWeight: 0 },
  { name: 'fk-text-body-lg', minSize: 18, maxSize: 22, minWeight: 0 },
];
