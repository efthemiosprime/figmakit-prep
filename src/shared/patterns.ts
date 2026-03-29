import type { NodeRole } from './types';

export interface NamePattern {
  pattern: RegExp;
  role: NodeRole;
}

// Name patterns ordered by priority (mirrors fk_resolve_from_name_patterns() in fk-module-resolver.php)
// More specific patterns come first to avoid false matches
export const NAME_PATTERNS: NamePattern[] = [
  // Card sub-elements (must come before card pattern)
  { pattern: /^card[-_](header|image|img)$/i, role: 'image' },
  { pattern: /^card[-_](content|body|text|description)$/i, role: 'text' },
  { pattern: /^card[-_](footer|actions|cta|button|btn)$/i, role: 'button' },
  { pattern: /^card[-_](title)$/i, role: 'heading' },

  // Card (negative lookahead for sub-elements and BEM)
  {
    pattern: /^card(?![-_](?:header|content|body|footer|actions|cta|image|img|title|text|description|button|btn))(?!__)([-_]\w+)?$/i,
    role: 'card',
  },

  // Image patterns
  { pattern: /\b(image|img|photo|thumbnail|thumb|avatar|logo|icon|svg|picture|banner|cover|background)\b/i, role: 'image' },

  // Heading level patterns (h1-h6)
  { pattern: /\bh[1-6]\b/i, role: 'heading' },
  // Generic heading patterns
  { pattern: /^(heading|title)/i, role: 'heading' },

  // CTA (before button, since "cta" would also match button)
  { pattern: /^(cta|call[-_\s]?to[-_\s]?action)([-_\s/].*)?$/i, role: 'cta' },

  // Button group (before single button)
  { pattern: /^buttons([-_\s/].*)?$|^button[-_]group([-_\s/].*)?$/i, role: 'buttons' },

  // Button / action / link
  { pattern: /\b(button|btn|action)\b/i, role: 'button' },
  { pattern: /^link([-_\s/].*)?$/i, role: 'button' },

  // Text / body patterns
  { pattern: /\b(content|description|body|paragraph|caption|subtitle)\b/i, role: 'text' },

  // Multi-column layout (before column)
  { pattern: /^columns([-_\s/].*)?$/i, role: 'row' },

  // Column
  { pattern: /^(column|col)([-_\s/].*)?$/i, role: 'column' },

  // Row / horizontal stack
  { pattern: /^(row|hstack)([-_\s/].*)?$/i, role: 'row' },

  // Vertical stack
  { pattern: /^vstack([-_\s/].*)?$/i, role: 'group' },

  // Group
  { pattern: /^group([-_\s/].*)?$/i, role: 'group' },

  // Container-like patterns
  { pattern: /^(container|wrapper|frame|box|panel|block|layout|section)([-_\s/].*)?$/i, role: 'container' },

  // List / list items
  { pattern: /^(list|nav[-_\s]?list|menu)([-_\s/].*)?$/i, role: 'list' },
  { pattern: /^(item|list[-_\s]?item|menu[-_\s]?item|nav[-_\s]?item)([-_\s/].*)?$/i, role: 'list-item' },

  // Divider
  { pattern: /^(divider|separator|hr|line)([-_\s/].*)?$/i, role: 'divider' },

  // Accordion / FAQ
  { pattern: /^(accordion|faq|collapsible|expandable|details)([-_\s/].*)?$/i, role: 'accordion' },

  // Tabs
  { pattern: /^tabs([-_\s/].*)?$/i, role: 'tabs' },

  // Testimonial / quote
  { pattern: /^(testimonial|quote|review|blockquote)([-_\s/].*)?$/i, role: 'testimonial' },

  // Modal / dialog
  { pattern: /^(modal|dialog|popup|lightbox)([-_\s/].*)?$/i, role: 'modal' },

  // ISI / safety info
  { pattern: /^(isi|isi[-_\s]?tray|safety[-_\s]?info)([-_\s/].*)?$/i, role: 'isi' },

  // Site header / navbar
  { pattern: /^(site[-_\s]?header|nav[-_\s]?bar|navbar|navigation)([-_\s/].*)?$/i, role: 'header' },
];

/**
 * Match a layer name against FigmaKit's name patterns.
 * Returns the matched NodeRole or null if no pattern matches.
 */
export function matchNamePattern(name: string): NodeRole | null {
  for (const { pattern, role } of NAME_PATTERNS) {
    if (pattern.test(name)) {
      return role;
    }
  }
  return null;
}
