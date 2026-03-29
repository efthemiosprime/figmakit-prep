export type NodeRole =
  | 'text' | 'heading' | 'image' | 'icon' | 'button' | 'buttons'
  | 'divider' | 'spacer' | 'wrapper'
  | 'section' | 'row' | 'column' | 'container' | 'group'
  | 'flex-row' | 'flex-col'
  | 'card' | 'hero' | 'feature' | 'cta' | 'testimonial'
  | 'accordion' | 'tabs' | 'modal' | 'gallery'
  | 'background-shape' | 'mask' | 'invisible'
  | 'isi' | 'header'
  | 'list' | 'list-item'
  | 'unknown';

export const NODE_ROLES: NodeRole[] = [
  'text', 'heading', 'image', 'icon', 'button', 'buttons',
  'divider', 'spacer', 'wrapper',
  'section', 'row', 'column', 'container', 'group',
  'flex-row', 'flex-col',
  'card', 'hero', 'feature', 'cta', 'testimonial',
  'accordion', 'tabs', 'modal', 'gallery',
  'background-shape', 'mask', 'invisible',
  'isi', 'header',
  'list', 'list-item',
  'unknown',
];

export type ConfidenceSource =
  | 'override' | 'type' | 'role' | 'structure' | 'token' | 'name' | 'default';

export interface Fingerprint {
  images: number;
  texts: number;
  headings: number;
  buttons: number;
  icons: number;
  containers: number;
  total: number;
  hasImageFill: boolean;
  allSameType: boolean;
  parentWidth: number;
  parentHeight: number;
}

export interface DesignTokens {
  colors: Array<{ name: string; value: string }>;
  typography: {
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    lineHeight?: number;
    letterSpacing?: number;
    textCase?: string;
  } | null;
  spacing: {
    top: number;
    right: number;
    bottom: number;
    left: number;
    gap?: number;
  } | null;
  borderRadius: number | null;
  effects: Array<{ type: string; value: string }>;
}

export interface Classification {
  role: NodeRole;
  confidence: number;
  source: ConfidenceSource;
}

export interface SafetyAssessment {
  safe: boolean;
  reason: string;
}

export interface AnalysisResult {
  node: any;
  id: string;
  name: string;
  type: string;
  depth: number;

  // Classification
  role: NodeRole;
  confidence: number;
  source: ConfidenceSource;

  // Suggested actions
  suggestedName: string | null;
  suggestedBEM: string | null;
  fkLabel: string | null;

  // Safety assessment
  canRemove: boolean;
  canFlatten: boolean;
  removeReason: string | null;
  preserveReason: string | null;

  // Properties snapshot
  hasVisualContribution: boolean;
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

  // Design tokens
  tokens: DesignTokens;

  // Children analysis
  fingerprint: Fingerprint | null;
  children: AnalysisResult[];
}

export interface RenameAction {
  nodeId: string;
  node: any;
  currentName: string;
  suggestedName: string;
  confidence: number;
  source: ConfidenceSource;
}

export interface CleanActionItem {
  nodeId: string;
  node: any;
  action: 'remove' | 'flatten';
  reason: string;
}

export interface ValidationResult {
  nodeId: string;
  name: string;
  role: NodeRole;
  confidence: number;
  source: ConfidenceSource;
  tier: 'high' | 'needsReview' | 'low' | 'skipped';
  suggestion: string | null;
}

export interface BEMName {
  block: string;
  element?: string;
  modifier?: string;
}

export interface BEMMapping {
  nodeId: string;
  node: any;
  currentName: string;
  bemName: string;
}

export interface TypographyClassDef {
  name: string;
  minSize: number;
  maxSize: number;
  minWeight: number;
  textCase?: string;
}
