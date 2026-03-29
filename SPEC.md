# FigmaKit Prep — Technical Specification

> A companion Figma plugin for FigmaKit that optimizes design files for accurate WordPress import. Cleans invisible and redundant layers, renames nodes to match semantic patterns, validates component structure with confidence scoring, formats names to BEM convention, and previews design token extraction — all without breaking layout or styles.

## Context

FigmaKit (the WordPress plugin) converts Figma designs to Gutenberg blocks and Divi modules. Its accuracy depends heavily on how layers are named and structured in Figma. Designers rarely name layers semantically — most files have `Frame 47`, `Rectangle 14`, `Group 7` etc. FigmaKit handles this through a 7-priority resolution chain (user rules, node type + layout, nodeRole, structural fingerprinting, name patterns, defaults) with confidence scoring, but cleaner source files produce dramatically better results.

**figmakit-prep** runs inside Figma to prepare files before export, using the same detection logic as FigmaKit's WordPress-side resolver. It bridges the gap between how designers work (visual, unnamed layers) and what FigmaKit needs (semantic, well-structured layers).

### Relationship to FigmaKit

- **FigmaKit WordPress plugin** (`figmakit/`) — imports Figma data, maps to blocks, generates SCSS/CSS
- **FigmaKit Figma extractor** (`figmakit/figma-plugin/`) — extracts layer data from Figma, sends to WordPress
- **figmakit-prep** (this plugin) — prepares Figma files before extraction, runs independently in Figma

The prep plugin mirrors the detection logic from:
- `classifyNode()` in `figma-plugin/code.js` (nodeRole classification)
- `fk_resolve_from_node_type()` in `fk-module-resolver.php` (type + layout detection)
- `fk_resolve_from_structure()` in `fk-module-resolver.php` (structural fingerprinting)
- `fk_resolve_from_name_patterns()` in `fk-module-resolver.php` (name patterns)
- `fk_should_skip_layer_data()` in `helpers.php` (layer skip/unwrap rules)
- `fk_fingerprint_children()` in `helpers.php` (child composition analysis)

---

## Architecture

### Project Structure

```
figmakit-prep/
├── manifest.json              # Figma plugin manifest (API v1)
├── package.json               # Build dependencies (TypeScript, esbuild)
├── tsconfig.json              # TypeScript config
├── README.md                  # User documentation
├── SPEC.md                    # This file
├── src/
│   ├── main.ts                # Plugin entry — runs in Figma sandbox
│   ├── ui.html                # Plugin UI — tabbed interface
│   ├── ui.ts                  # UI logic — tab switching, event handling
│   ├── core/
│   │   ├── analyzer.ts        # Shared layer analysis engine
│   │   ├── classifier.ts      # Node role classification (mirrors classifyNode)
│   │   ├── fingerprinter.ts   # Structural fingerprinting (mirrors fk_fingerprint_children)
│   │   └── safety-check.ts    # Determines if removal/rename is safe
│   ├── features/
│   │   ├── cleaner.ts         # Layer Cleaner — remove/flatten useless layers
│   │   ├── renamer.ts         # Smart Layer Renamer — semantic name assignment
│   │   ├── validator.ts       # Pre-flight Validator — confidence report
│   │   ├── labeler.ts         # Component Property Labeler — [fk:type] tags
│   │   ├── bem-formatter.ts   # BEM Name Formatter — card__header convention
│   │   └── token-preview.ts   # Design Token Preview — CSS/SCSS preview
│   └── shared/
│       ├── patterns.ts        # FigmaKit name patterns (synced with PHP resolver)
│       ├── constants.ts       # Spacing scale, font thresholds, size limits
│       └── types.ts           # TypeScript interfaces
└── dist/                      # Build output (not committed)
    ├── main.js
    └── ui.html
```

### Build System

- **Language:** TypeScript (strict mode)
- **Bundler:** esbuild (fast, Figma-compatible output)
- **Output:** Single `main.js` (sandbox) + single `ui.html` (with inlined CSS/JS)
- **No external dependencies** — Figma plugin sandbox doesn't allow imports

### Figma Plugin API Version

- **API version:** 1 (in manifest.json)
- **Editor type:** figma (not figjam)
- **Permissions:** `currentpage` (read/write current page nodes)
- **UI:** `width: 480, height: 600` (tabbed interface)

---

## Core Engine: `analyzer.ts`

The shared analysis engine that all 6 features depend on. Runs a single traversal of the selected nodes and produces an `AnalysisResult` for each node.

### AnalysisResult Interface

```typescript
interface AnalysisResult {
  node: SceneNode;                    // Figma node reference
  id: string;                        // Node ID
  name: string;                      // Current layer name
  type: string;                      // Figma node type
  depth: number;                     // Nesting depth from root

  // Classification
  role: NodeRole;                    // Classified role (text, image, button, card, hero, etc.)
  confidence: number;                // 0-100 confidence score
  source: 'type' | 'role' | 'structure' | 'name' | 'default';

  // Suggested actions
  suggestedName: string | null;      // What renamer would name it
  suggestedBEM: string | null;       // BEM-formatted name
  fkLabel: string | null;            // [fk:type] label

  // Safety assessment
  canRemove: boolean;                // Safe to delete?
  canFlatten: boolean;               // Safe to flatten (unwrap)?
  removeReason: string | null;       // Why it can be removed
  preserveReason: string | null;     // Why it must be preserved

  // Properties snapshot
  hasVisualContribution: boolean;    // Does it contribute pixels?
  isVisible: boolean;
  opacity: number;
  hasFill: boolean;
  hasStroke: boolean;
  hasEffects: boolean;
  hasAutoLayout: boolean;
  layoutMode: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  childCount: number;
  isMask: boolean;
  clipsContent: boolean;
  cornerRadius: number;

  // Design tokens (for preview)
  tokens: {
    colors: Array<{name: string; value: string}>;
    typography: {fontFamily: string; fontSize: number; fontWeight: number} | null;
    spacing: {top: number; right: number; bottom: number; left: number} | null;
    borderRadius: number | null;
  };

  // Children analysis (for structural fingerprinting)
  fingerprint: {
    images: number;
    texts: number;
    headings: number;
    buttons: number;
    icons: number;
    containers: number;
    total: number;
  } | null;

  children: AnalysisResult[];        // Recursive children analysis
}
```

### NodeRole Type

```typescript
type NodeRole =
  | 'text' | 'heading' | 'image' | 'icon' | 'button'
  | 'divider' | 'spacer' | 'wrapper'
  | 'section' | 'row' | 'column' | 'container'
  | 'flex-row' | 'flex-col'
  | 'card' | 'hero' | 'feature' | 'cta' | 'testimonial'
  | 'accordion' | 'tabs' | 'modal' | 'gallery'
  | 'background-shape' | 'mask' | 'invisible'
  | 'unknown';
```

---

## Feature 1: Layer Cleaner (`cleaner.ts`)

### Purpose
Remove layers that have zero visual contribution and flatten redundant wrappers, without breaking layout or styles.

### Safety Rules

**Safe to REMOVE (canRemove = true):**

| Condition | Check | Reason |
|---|---|---|
| Hidden layer | `node.visible === false` | Already invisible to user |
| Zero opacity | `node.opacity === 0` | Already invisible |
| Empty frame | `childCount === 0 && !hasFill && !hasStroke && !hasEffects` | Renders nothing |
| Redundant mask | `isMask && parent.clipsContent && parent.cornerRadius > 0` | Parent already clips |

**Safe to FLATTEN (canFlatten = true):**

| Condition | Check | Reason |
|---|---|---|
| Passthrough wrapper | `childCount === 1 && !hasFill && !hasStroke && !hasEffects && !cornerRadius && !hasAutoLayout && !padding` | Child inherits same visual position |

**NOT safe (canRemove = false, canFlatten = false):**

| Condition | Check | Why preserve |
|---|---|---|
| Has fill | `hasFill === true` | Provides background color/gradient |
| Has stroke | `hasStroke === true` | Provides border |
| Has effects | `node.effects.length > 0 && any visible` | Shadow, blur, etc. |
| Has corner radius | `cornerRadius > 0` | Rounding would be lost |
| Has auto-layout | `hasAutoLayout === true` | Layout depends on it |
| Has padding | `paddingTop > 0 \|\| paddingRight > 0 \|\| ...` | Spacing depends on it |
| Semi-transparent | `opacity > 0 && opacity < 1` | Contributes to visual |
| Has blend mode | `blendMode !== 'PASS_THROUGH' && blendMode !== 'NORMAL'` | Compositing |
| Has constraints | `constraints differ from child` | Responsive positioning |

### Flatten Process

When flattening a wrapper:
1. Get the single child node
2. Copy wrapper's `x`, `y` position to child (adjust for any offset)
3. Move child to wrapper's parent at wrapper's index
4. Delete the now-empty wrapper

### UI Flow

1. User selects frame(s) or selects nothing (= entire page)
2. Click "Scan" → analyzer runs, counts removable/flattenable layers
3. Show summary: "Found: 8 removable, 5 flattenable, 47 safe"
4. Preview list with checkboxes (all checked by default)
5. Click "Clean" → apply checked operations
6. Show result: "Removed 8, flattened 5. Undo available."

---

## Feature 2: Smart Layer Renamer (`renamer.ts`)

### Purpose
Rename auto-generated layer names (`Frame 123`, `Group 7`, `Rectangle 14`) to semantic names that FigmaKit's resolver can detect at high confidence.

### Rename Rules (priority order)

These mirror FigmaKit's `classifyNode()` + `fk_resolve_from_node_type()` + `fk_resolve_from_structure()`:

| Current Pattern | Detection Logic | Renamed To |
|---|---|---|
| TEXT with fontSize >= 48 | Font size threshold | `h1` |
| TEXT with fontSize >= 36 | Font size threshold | `h2` |
| TEXT with fontSize >= 28 | Font size threshold | `h3` |
| TEXT with fontSize >= 22 | Font size threshold | `h4` |
| TEXT with fontSize >= 18 | Font size threshold | `h5` |
| TEXT (other) | Default text | `text` |
| Small vector/boolean (< 64px) | Size threshold | `icon` |
| LINE node | Type | `divider` |
| Thin rectangle (h ≤ 4px) | Aspect ratio | `divider` |
| Node with image fill | Fill type | `image` |
| Small auto-layout frame with fill + text | Button heuristic | `button` |
| Empty frame, no fills | No content | `spacer` |
| Single-child, no fill/stroke | Wrapper pattern | `wrapper` |
| Horizontal auto-layout + children | Layout mode | `row` |
| Vertical auto-layout + children | Layout mode | `vstack` |
| Large (>= 900px) vertical container | Size + layout | `section` |
| Image + heading + text + button children | Fingerprint | `card` |
| Image fill + heading + text, height >= 200 | Fingerprint | `hero` |
| Icon + heading + text, narrow | Fingerprint | `feature` |
| 3+ uniform image children | Fingerprint | `gallery` |
| 3+ uniform container children | Fingerprint | `columns` |
| Heading + text + button, wide | Fingerprint | `cta` |

### Rules

- **Never rename** layers that already have semantic names (detected by checking against the patterns list)
- **Never rename** component definitions (only rename instances and frames)
- **Preserve** user-given names that don't match `Frame \d+`, `Group \d+`, `Rectangle \d+`, `Ellipse \d+`, etc.
- **Auto-generated name detection:** `/^(Frame|Group|Rectangle|Ellipse|Line|Vector|Star|Polygon|Boolean|Section|Slice|Component|Instance)\s*\d*$/i`

### UI Flow

1. User selects frame(s)
2. Click "Scan" → analyzer runs
3. Show preview table: `Current Name → Suggested Name (Confidence)`
4. Checkboxes to include/exclude individual renames
5. Click "Apply" → rename selected layers
6. Show result count

---

## Feature 3: FigmaKit Validator (`validator.ts`)

### Purpose
Analyze a page/selection and produce a confidence report showing how well FigmaKit will map each layer, flagging low-confidence matches that need attention.

### Confidence Scoring

Mirrors `fk_make_resolution()` confidence scores:

| Detection Method | Score | Color |
|---|---|---|
| Explicit name match (button, card, hero, etc.) | 90-100 | Green |
| Node type + layout (TEXT → text, horizontal auto-layout → row) | 85-90 | Green |
| NodeRole classification (flex-row, flex-col, wrapper) | 80-85 | Green |
| Structural fingerprinting (card by children composition) | 75-80 | Yellow-green |
| Name pattern match (partial name like "btn" → button) | 55-65 | Yellow |
| Default fallback (FRAME → section, GROUP → row) | 25-35 | Red |

### Report Output

```
Page: "Home Page"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ High Confidence (90%+): 24 layers
🟡 Needs Review (50-89%):  8 layers
🔴 Low Confidence (<50%):  3 layers
⏭️ Will Be Skipped:        5 layers (invisible, masks, empty)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 Low Confidence:
  • "Frame 47" → section (30%) — Add semantic name or use Smart Rename
  • "Group 12" → row (30%) — Contains 3 children, could be "columns"
  • "Rectangle 8" → spacer (25%) — Empty shape, consider removing

🟡 Needs Review:
  • "hero-area" → section (60%) — Rename to "hero" for better detection
  • "card-box" → card (65%) — Has image + text + button children ✓
  ...

⏭️ Will Be Skipped:
  • "Shadow overlay" — hidden (visible: false)
  • "Mask" — mask layer (parent already clips)
  ...
```

### Suggested Actions

For each low-confidence layer, suggest one of:
- **Rename** → "Rename to 'card' for 90% confidence" (link to Smart Rename)
- **Clean** → "This layer is empty, remove it" (link to Cleaner)
- **Add mapping** → "Add a Component Name Mapping in WordPress for 100% confidence"

### UI Flow

1. User selects frame(s) or page
2. Click "Validate" → analyzer runs
3. Show confidence breakdown (pie chart or bar)
4. Expandable sections for each confidence tier
5. Click any layer → select it in Figma canvas
6. "Fix All" button → runs Smart Rename on flagged layers

---

## Feature 4: Component Property Labeler (`labeler.ts`)

### Purpose
Add explicit `[fk:type]` prefixes to layer names so FigmaKit's extractor can detect intent with 100% confidence, bypassing all heuristic detection.

### Label Format

```
[fk:card] Product Card
[fk:hero] Homepage Banner
[fk:button] CTA Primary
[fk:heading] Section Title
[fk:image] Hero Background
[fk:accordion] FAQ Section
[fk:tabs] Product Features
[fk:modal] Login Dialog
[fk:isi] Safety Information
```

### How FigmaKit Reads Labels

The FigmaKit extractor (`code.js`) should be updated to check for `[fk:type]` prefix and use it as the highest-priority classification (before even `classifyNode()`).

### Plugin Data Alternative

Instead of (or in addition to) name prefixes, store type as plugin data:
```typescript
node.setPluginData('fk-type', 'card');
node.setPluginData('fk-variant', 'hstack');
```

FigmaKit's extractor reads this:
```typescript
const fkType = node.getPluginData('fk-type');
if (fkType) properties.fkType = fkType;
```

### UI Flow

1. User selects a node
2. Analyzer shows detected role and confidence
3. User can override with a dropdown of all FigmaKit block types
4. Click "Apply Label" → adds `[fk:type]` prefix or sets plugin data
5. Batch mode: label all children of a selected frame based on analyzer suggestions

### Supported Labels

```
text, heading, image, icon, button, divider, spacer,
section, row, column, container, group,
card, hero, feature, cta, testimonial,
accordion, tabs, modal, isi, header, gallery
```

---

## Feature 5: BEM Name Formatter (`bem-formatter.ts`)

### Purpose
Convert layer names to BEM (Block Element Modifier) convention so FigmaKit generates proper CSS class names.

### BEM Conventions

```
Block:     card, hero, feature, button
Element:   card__image, card__title, card__body, card__cta
Modifier:  card--hstack, button--primary, hero--centered
```

### Auto-BEM Rules

When a parent is detected as a composite component (card, hero, feature), rename children based on their type:

| Parent Role | Child Role | BEM Name |
|---|---|---|
| card | image | `card__image` |
| card | heading | `card__title` |
| card | text | `card__body` |
| card | button | `card__cta` |
| card | divider | `card__divider` |
| card | icon | `card__icon` |
| hero | image | `hero__image` |
| hero | heading | `hero__title` |
| hero | text | `hero__description` |
| hero | button | `hero__cta` |
| feature | icon | `feature__icon` |
| feature | heading | `feature__title` |
| feature | text | `feature__description` |
| cta | heading | `cta__title` |
| cta | text | `cta__description` |
| cta | button | `cta__button` |
| testimonial | image | `testimonial__avatar` |
| testimonial | text | `testimonial__quote` |
| testimonial | heading | `testimonial__author` |

### Variant Detection

If the parent component has Figma variants, add modifiers:
- Variant property `Layout: Horizontal` → parent gets `card--hstack`
- Variant property `Style: Primary` → parent gets `button--primary`
- Variant property `Size: Large` → parent gets `card--large`

### UI Flow

1. User selects a component or frame
2. Analyzer detects parent role and child roles
3. Preview: show current names → BEM names
4. Click "Format" → apply BEM names
5. Option: "Include variant modifiers" checkbox

---

## Feature 6: Design Token Preview (`token-preview.ts`)

### Purpose
Show what design tokens FigmaKit would extract from the selected component before syncing to WordPress — colors, typography, spacing, border radius, effects.

### Token Extraction

Mirrors FigmaKit's `extractDesignTokens()` from `code.js`:

**Colors:**
```
fill_0: rgba(26, 26, 46, 1.00)     → $color-primary: #1a1a2e
fill_1: linear-gradient(...)        → background: linear-gradient(...)
stroke_0: rgba(0, 0, 0, 0.10)      → border-color: rgba(0,0,0,0.10)
```

**Typography:**
```
Font: Inter, 16px, 400, 1.5         → font-size: 16px; line-height: 1.5
Style: "Heading/H1"                 → .fk-text-title
```

**Spacing:**
```
Padding: 24px 32px                  → .fk-py-md .fk-px-lg
Gap: 16px                           → .fk-gap-xs
```

**Borders:**
```
Radius: 8px                         → border-radius: 8px
Stroke: 1px solid rgba(...)         → border: 1px solid rgba(...)
```

**Effects:**
```
Drop shadow: 0 4px 8px rgba(...)    → box-shadow: 0 4px 8px rgba(...)
```

### Output Formats

Show preview in multiple formats:

1. **CSS Variables:**
```css
--color-primary: #1a1a2e;
--spacing-md: 24px;
--font-size-title: 48px;
```

2. **SCSS Variables:**
```scss
$color-primary: #1a1a2e;
$spacing-md: 24px;
```

3. **Utility Classes:**
```
.fk-p-md .fk-gap-xs .fk-text-title .fk-dir-row .fk-jc-between
```

4. **Gutenberg Block Attributes:**
```json
{
  "style": {
    "color": { "background": "#1a1a2e" },
    "spacing": { "padding": { "top": "24px", "bottom": "24px" } },
    "border": { "radius": "8px" }
  }
}
```

### UI Flow

1. User selects a component/frame
2. Token preview updates in real-time
3. Tabs for CSS / SCSS / Utility Classes / Block Attrs
4. "Copy" button for each format
5. Expandable sections for colors, typography, spacing, borders, effects

---

## UI Design

### Tabbed Interface (480 x 600px)

```
┌─────────────────────────────────────────────┐
│  FigmaKit Prep                          [×] │
├─────────────────────────────────────────────┤
│ [Clean] [Rename] [Validate] [BEM] [Preview] │
├─────────────────────────────────────────────┤
│                                             │
│  Tab content area                           │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ Results / Preview list              │    │
│  │                                     │    │
│  │ ☑ Frame 47 → section (30%)         │    │
│  │ ☑ Rectangle 14 → [remove]         │    │
│  │ ☐ Group 7 → container (skip)      │    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [Scan Selection]    [Apply Changes]        │
│                                             │
│  Status: Ready                              │
└─────────────────────────────────────────────┘
```

### Tab Labels

| Tab | Icon | Label |
|---|---|---|
| Cleaner | 🧹 | Clean |
| Renamer | ✏️ | Rename |
| Validator | ✅ | Validate |
| Labeler + BEM | 🏷️ | Label |
| Token Preview | 🎨 | Tokens |

Note: Labeler and BEM Formatter share one tab since they're both about naming.

---

## Shared Constants (`constants.ts`)

```typescript
// Font size → heading level thresholds (mirrors helpers.php)
export const HEADING_THRESHOLDS = [
  { level: 1, minSize: 48 },
  { level: 2, minSize: 36 },
  { level: 3, minSize: 28 },
  { level: 4, minSize: 22 },
  { level: 5, minSize: 18 },
  { level: 6, minSize: 0 },
];

// Spacing scale (mirrors fk_get_spacing_scale())
export const SPACING_SCALE = {
  '4xs': 4, '3xs': 8, '2xs': 12, 'xs': 16, 'sm': 20,
  'md': 24, 'lg': 32, 'xl': 48, '2xl': 80, '3xl': 96,
};

// Icon size threshold
export const ICON_MAX_SIZE = 64;

// Button size thresholds
export const BUTTON_MAX_HEIGHT = 80;
export const BUTTON_MAX_WIDTH = 400;

// Section width threshold
export const SECTION_MIN_WIDTH = 900;

// Hero height threshold
export const HERO_MIN_HEIGHT = 200;

// Card max width (for structural fingerprinting)
export const CARD_MAX_WIDTH = 600;

// Feature max width
export const FEATURE_MAX_WIDTH = 400;

// Monospace fonts (mirrors Gutenberg converter)
export const MONOSPACE_FONTS = [
  'fira code', 'sf mono', 'courier', 'courier new', 'consolas',
  'menlo', 'monaco', 'source code', 'jetbrains mono', 'roboto mono',
  'ubuntu mono',
];

// Auto-generated name pattern
export const AUTO_NAME_PATTERN = /^(Frame|Group|Rectangle|Ellipse|Line|Vector|Star|Polygon|Boolean|Section|Slice|Component|Instance)\s*\d*$/i;

// FigmaKit semantic names (used by renamer to skip already-named layers)
export const SEMANTIC_NAMES = [
  'text', 'heading', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'image', 'icon', 'button', 'btn', 'cta', 'divider', 'separator',
  'spacer', 'wrapper', 'section', 'row', 'column', 'col',
  'container', 'group', 'hstack', 'vstack',
  'card', 'hero', 'feature', 'gallery', 'testimonial', 'quote',
  'accordion', 'tabs', 'modal', 'dialog', 'isi', 'header', 'navbar',
  'card__image', 'card__title', 'card__body', 'card__cta',
];
```

---

## Manifest

```json
{
  "name": "FigmaKit Prep",
  "id": "figmakit-prep",
  "api": "1.0.0",
  "main": "dist/main.js",
  "ui": "dist/ui.html",
  "editorType": ["figma"],
  "documentAccess": "dynamic-page",
  "networkAccess": {
    "allowedDomains": ["none"]
  }
}
```

---

## Development

### Build Commands

```bash
npm install          # Install dependencies
npm run dev          # Watch mode (rebuilds on change)
npm run build        # Production build
npm run typecheck    # TypeScript type checking
```

### Testing

- Manual testing in Figma Desktop app (Plugin > Development > Import from manifest)
- Test with real FigmaKit design files containing:
  - Clean components (should score 90%+)
  - Messy auto-named frames (should suggest renames)
  - Hidden/invisible layers (should flag for removal)
  - Nested single-child wrappers (should flag for flattening)
  - Mixed text styles (should show in token preview)

### Publishing

1. Build: `npm run build`
2. Publish to Figma Community via Figma Desktop > Plugins > Publish
3. Link from FigmaKit WordPress plugin settings page
