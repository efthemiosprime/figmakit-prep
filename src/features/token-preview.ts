import type { AnalysisResult, DesignTokens } from '../shared/types';
import { SPACING_SCALE, TYPOGRAPHY_CLASSES } from '../shared/constants';

/**
 * Snap a font size + weight + text case to a FigmaKit typography class.
 * Mirrors fk_snap_to_theme_text_class() from helpers.php.
 */
export function snapTypography(fontSize: number, fontWeight: number, textCase?: string): string {
  // Eyebrow: small, bold, uppercase (check first — most specific)
  if (fontSize <= 13 && fontWeight >= 500 && textCase === 'UPPER') {
    return 'fk-text-eyebrow';
  }

  // Title: large and bold
  if (fontSize >= 40 && fontWeight >= 600) {
    return 'fk-text-title';
  }

  // Subtitle: medium-large and medium-bold
  if (fontSize >= 28 && fontWeight >= 500) {
    return 'fk-text-subtitle';
  }

  // Footnote: very small
  if (fontSize > 0 && fontSize <= 11) {
    return 'fk-text-footnote';
  }

  // Caption: small
  if (fontSize > 0 && fontSize <= 13) {
    return 'fk-text-caption';
  }

  // Body small
  if (fontSize >= 14 && fontSize <= 15) {
    return 'fk-text-body-sm';
  }

  // Body medium
  if (fontSize >= 16 && fontSize <= 17) {
    return 'fk-text-body-md';
  }

  // Body large
  if (fontSize >= 18 && fontSize <= 22) {
    return 'fk-text-body-lg';
  }

  return '';
}

/**
 * Snap a pixel value to the nearest spacing scale token.
 */
export function snapSpacing(value: number): string {
  if (value <= 0) return '';

  const entries = Object.entries(SPACING_SCALE);
  let closest = '';
  let closestDiff = Infinity;

  for (const [name, px] of entries) {
    const diff = Math.abs(value - px);
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = name;
    }
  }

  return closest;
}

/**
 * Extract design tokens from an analysis result.
 * Re-exports the tokens already computed by the analyzer.
 */
export function extractTokens(result: AnalysisResult): DesignTokens {
  return result.tokens;
}

/**
 * Format design tokens into a specific output format.
 */
export function formatTokens(tokens: DesignTokens, format: 'css' | 'scss' | 'utility' | 'gutenberg'): string {
  switch (format) {
    case 'css':
      return formatCSS(tokens);
    case 'scss':
      return formatSCSS(tokens);
    case 'utility':
      return formatUtility(tokens);
    case 'gutenberg':
      return formatGutenberg(tokens);
  }
}

function formatCSS(tokens: DesignTokens): string {
  const lines: string[] = [];

  for (const color of tokens.colors) {
    lines.push(`--${color.name.replace(/_/g, '-')}: ${color.value};`);
  }

  if (tokens.typography) {
    lines.push(`--font-family: ${tokens.typography.fontFamily};`);
    lines.push(`--font-size: ${tokens.typography.fontSize}px;`);
    lines.push(`--font-weight: ${tokens.typography.fontWeight};`);
    if (tokens.typography.lineHeight) {
      lines.push(`--line-height: ${tokens.typography.lineHeight}px;`);
    }
  }

  if (tokens.spacing) {
    lines.push(`--padding-top: ${tokens.spacing.top}px;`);
    lines.push(`--padding-right: ${tokens.spacing.right}px;`);
    lines.push(`--padding-bottom: ${tokens.spacing.bottom}px;`);
    lines.push(`--padding-left: ${tokens.spacing.left}px;`);
    if (tokens.spacing.gap) {
      lines.push(`--gap: ${tokens.spacing.gap}px;`);
    }
  }

  if (tokens.borderRadius) {
    lines.push(`--border-radius: ${tokens.borderRadius}px;`);
  }

  for (const effect of tokens.effects) {
    lines.push(`--${effect.type}: ${effect.value};`);
  }

  return lines.join('\n');
}

function formatSCSS(tokens: DesignTokens): string {
  const lines: string[] = [];

  for (const color of tokens.colors) {
    lines.push(`$${color.name.replace(/_/g, '-')}: ${color.value};`);
  }

  if (tokens.typography) {
    lines.push(`$font-family: ${tokens.typography.fontFamily};`);
    lines.push(`$font-size: ${tokens.typography.fontSize}px;`);
    lines.push(`$font-weight: ${tokens.typography.fontWeight};`);
    if (tokens.typography.lineHeight) {
      lines.push(`$line-height: ${tokens.typography.lineHeight}px;`);
    }
  }

  if (tokens.spacing) {
    lines.push(`$padding-top: ${tokens.spacing.top}px;`);
    lines.push(`$padding-right: ${tokens.spacing.right}px;`);
    lines.push(`$padding-bottom: ${tokens.spacing.bottom}px;`);
    lines.push(`$padding-left: ${tokens.spacing.left}px;`);
    if (tokens.spacing.gap) {
      lines.push(`$gap: ${tokens.spacing.gap}px;`);
    }
  }

  if (tokens.borderRadius) {
    lines.push(`$border-radius: ${tokens.borderRadius}px;`);
  }

  for (const effect of tokens.effects) {
    lines.push(`$${effect.type}: ${effect.value};`);
  }

  return lines.join('\n');
}

function formatUtility(tokens: DesignTokens): string {
  const classes: string[] = [];

  if (tokens.spacing) {
    const { top, right, bottom, left, gap } = tokens.spacing;

    if (top === bottom && left === right && top === left && top > 0) {
      classes.push(`.fk-p-${snapSpacing(top)}`);
    } else {
      if (top === bottom && top > 0) {
        classes.push(`.fk-py-${snapSpacing(top)}`);
      } else {
        if (top > 0) classes.push(`.fk-pt-${snapSpacing(top)}`);
        if (bottom > 0) classes.push(`.fk-pb-${snapSpacing(bottom)}`);
      }
      if (left === right && left > 0) {
        classes.push(`.fk-px-${snapSpacing(left)}`);
      } else {
        if (left > 0) classes.push(`.fk-pl-${snapSpacing(left)}`);
        if (right > 0) classes.push(`.fk-pr-${snapSpacing(right)}`);
      }
    }

    if (gap && gap > 0) {
      classes.push(`.fk-gap-${snapSpacing(gap)}`);
    }
  }

  if (tokens.typography) {
    const textClass = snapTypography(
      tokens.typography.fontSize,
      tokens.typography.fontWeight,
      tokens.typography.textCase,
    );
    if (textClass) {
      classes.push(`.${textClass}`);
    }
  }

  return classes.join(' ');
}

function formatGutenberg(tokens: DesignTokens): string {
  const style: Record<string, any> = {};

  if (tokens.colors.length > 0) {
    style.color = {};
    const bgColor = tokens.colors.find(c => c.name.startsWith('fill'));
    if (bgColor) {
      style.color.background = bgColor.value;
    }
  }

  if (tokens.spacing) {
    style.spacing = { padding: {} };
    if (tokens.spacing.top > 0) style.spacing.padding.top = `${tokens.spacing.top}px`;
    if (tokens.spacing.right > 0) style.spacing.padding.right = `${tokens.spacing.right}px`;
    if (tokens.spacing.bottom > 0) style.spacing.padding.bottom = `${tokens.spacing.bottom}px`;
    if (tokens.spacing.left > 0) style.spacing.padding.left = `${tokens.spacing.left}px`;
    if (tokens.spacing.gap && tokens.spacing.gap > 0) {
      style.spacing.blockGap = `${tokens.spacing.gap}px`;
    }
  }

  if (tokens.borderRadius) {
    style.border = { radius: `${tokens.borderRadius}px` };
  }

  if (tokens.typography) {
    style.typography = {
      fontFamily: tokens.typography.fontFamily,
      fontSize: `${tokens.typography.fontSize}px`,
      fontWeight: `${tokens.typography.fontWeight}`,
    };
  }

  return JSON.stringify({ style }, null, 2);
}
