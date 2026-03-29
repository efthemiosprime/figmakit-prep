# FigmaKit Prep

Prepare your Figma files for FigmaKit — clean layers, rename nodes, validate structure, and preview exports before syncing to WordPress.

## What it does

FigmaKit Prep runs inside Figma to optimize design files before exporting to the [FigmaKit WordPress plugin](https://github.com/your-org/figmakit). It mirrors FigmaKit's detection logic so you can see exactly how your layers will be interpreted.

### Features

- **Clean** — Remove hidden, zero-opacity, and empty layers. Flatten redundant single-child wrappers.
- **Rename** — Auto-assign semantic names (`card`, `hero`, `h1`, `button`, `row`, etc.) to generic Figma layer names (`Frame 47`, `Group 12`).
- **Validate** — Confidence report showing how well FigmaKit will map each layer, with fix suggestions.
- **Label** — Add `[fk:type]` prefixes or plugin data for 100% confidence override.
- **BEM** — Format child layers as BEM (`card__image`, `card__title`, `hero__cta`).
- **Tokens** — Preview extracted design tokens in CSS, SCSS, utility classes, or Gutenberg block attributes.

## Install

### Development (Figma Desktop)

```bash
git clone https://github.com/your-org/figmakit-prep.git
cd figmakit-prep
npm install
npm run build
```

In Figma Desktop: **Plugins > Development > Import plugin from manifest** and select the `manifest.json` file.

### Usage

1. Open a Figma file
2. Run FigmaKit Prep from the plugins menu
3. Select frames (or leave empty to scan entire page)
4. Use the tabs to clean, rename, validate, label, or preview tokens

## Development

```bash
npm run dev        # Watch mode (rebuild on change)
npm run build      # Production build
npm test           # Run tests
npm run typecheck  # TypeScript type checking
```

### Project Structure

```
src/
├── main.ts                # Plugin entry (Figma sandbox)
├── ui.html                # Plugin UI (tabbed interface)
├── ui.ts                  # UI logic
├── core/
│   ├── analyzer.ts        # Shared analysis engine
│   ├── classifier.ts      # Node role classification
│   ├── fingerprinter.ts   # Structural fingerprinting
│   └── safety-check.ts    # Safe removal/flattening logic
├── features/
│   ├── cleaner.ts         # Layer Cleaner
│   ├── renamer.ts         # Smart Layer Renamer
│   ├── validator.ts       # Pre-flight Validator
│   ├── labeler.ts         # Component Property Labeler
│   ├── bem-formatter.ts   # BEM Name Formatter
│   └── token-preview.ts   # Design Token Preview
└── shared/
    ├── types.ts           # TypeScript interfaces
    ├── constants.ts       # Thresholds, scales, limits
    └── patterns.ts        # Name pattern matching
```

### Testing

Tests use [vitest](https://vitest.dev/) with mock Figma API factories in `tests/helpers/figma-mock.ts`.

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```
