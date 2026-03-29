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

  // Card patterns — "card" anywhere, with prefix or suffix or variant
  // "What-we-do card", "Leadership card/desktop", "card/Default"
  {
    pattern: /^card(?![-_](?:header|content|body|footer|actions|cta|image|img|title|text|description|button|btn))(?!__)([-_/]\w+)*$/i,
    role: 'card',
  },
  { pattern: /\bcard\b(\/\w+)*$/i, role: 'card' },

  // CTA Section / CTA patterns (before generic section/image patterns)
  { pattern: /^cta[-_\s]section/i, role: 'cta' },
  { pattern: /^(cta|call[-_\s]?to[-_\s]?action)([-_\s/].*)?$/i, role: 'cta' },

  // Section patterns with "Image/Footer/Content" suffix — these are layout sections, not images
  // "Hero Image" = section (has children), "Footer Image" = footer, "Content + image" = section
  { pattern: /^footer[-_\s]image/i, role: 'container' },
  { pattern: /^(hero|content|leadership|about)[-_\s+]image/i, role: 'container' },
  { pattern: /\bsection$/i, role: 'container' },

  // Icon patterns — names ending in "-icon", "_icon", "button_icon", etc.
  { pattern: /[-_]icon$/i, role: 'icon' },
  { pattern: /^icon[-_\s]?system/i, role: 'icon' },

  // Image patterns — only for leaf-level image names (not "X Image" sections)
  // Exact or standalone image keywords
  { pattern: /^(image|img|photo|thumbnail|thumb|avatar|picture|banner|cover)$/i, role: 'image' },
  { pattern: /^(image|img|photo|thumbnail|thumb|avatar|picture|banner|cover)[-_\s]/i, role: 'image' },
  { pattern: /[-_\s](image|img|photo|thumbnail|thumb|avatar|picture|banner|cover)$/i, role: 'image' },
  // Logo — always image
  { pattern: /\blogo\b/i, role: 'image' },
  // SVG — always image
  { pattern: /^svg$/i, role: 'image' },

  // Navlink → list-item
  { pattern: /^navlink([-_\s/].*)?$/i, role: 'list-item' },

  // Heading level patterns (h1-h6)
  { pattern: /\bh[1-6]\b/i, role: 'heading' },
  // Generic heading patterns
  { pattern: /^(heading|title)/i, role: 'heading' },

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
  { pattern: /^(container|wrapper|frame|box|panel|block|layout|section|div)([-_\s/].*)?$/i, role: 'container' },

  // Module patterns → CTA or card or container
  { pattern: /^module[-_\s]?(cta|signup|sign[-_]?up|crm)([-_\s/].*)?$/i, role: 'cta' },
  { pattern: /^module[-_\s]?(left|right)([-_\s/].*)?$/i, role: 'card' },
  { pattern: /^module([-_\s/].*)?$/i, role: 'group' },

  // Website/primary header
  { pattern: /^website[-_\s]?header([-_\s/].*)?$/i, role: 'header' },
  { pattern: /^primary[-_\s]?nav([-_\s/].*)?$/i, role: 'header' },

  // Footnote / copy chunk → text
  { pattern: /^(footnote|copy[-_\s]?chunk)([-_\s/].*)?$/i, role: 'text' },

  // Icon with dot notation: "icon.Something"
  { pattern: /^icon\..+$/i, role: 'icon' },

  // Stats/percent → container
  { pattern: /^(stat|stats)([-_\s/].*)?$/i, role: 'container' },
  { pattern: /^\d+[-_]?percent([-_\s/].*)?$/i, role: 'container' },

  // Form patterns (not natively mapped — mark as container)
  { pattern: /^(form|field|input|textarea|select|checkbox|radio)([-_\s/].*)?$/i, role: 'container' },

  // List / list items
  { pattern: /^(list|nav[-_\s]?list|menu|main|right)([-_\s/].*)?$/i, role: 'list' },
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
